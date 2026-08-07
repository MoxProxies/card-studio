import { create } from "zustand";
import type { Design, Layer } from "@card-studio/scene-schema";

const HISTORY_LIMIT = 50;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

function applyPatch(design: Design, id: string, patch: Partial<Layer>): Design {
  return {
    ...design,
    layers: design.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
  };
}

function applyPatches(design: Design, entries: Array<{ id: string; patch: Partial<Layer> }>): Design {
  const patchMap = new Map(entries.map((e) => [e.id, e.patch]));
  return {
    ...design,
    layers: design.layers.map((l) => (patchMap.has(l.id) ? ({ ...l, ...patchMap.get(l.id) } as Layer) : l)),
  };
}

function cloneLayerWithOffset(layer: Layer, offsetMm: number): Layer {
  return { ...layer, id: crypto.randomUUID(), name: `${layer.name} copy`, x: layer.x + offsetMm, y: layer.y + offsetMm };
}

export interface DesignState {
  design: Design;
  past: Design[];
  future: Design[];
  /** Snapshot captured at the start of an in-progress continuous edit (e.g. typing), pending commitLiveEdit(). */
  pendingSnapshot: Design | null;
  selectedLayerIds: string[];
  /** View-only UI preference, not part of the design or undo history. */
  showSafeArea: boolean;
  /** Canvas view transform (view-only, not part of the design or undo
   * history). zoom 1 = the editor's native EDITOR_DPI resolution; pan is in
   * screen pixels, applied to the pan/zoom Group, not the Stage itself. */
  zoom: number;
  panX: number;
  panY: number;

  toggleSafeArea: () => void;
  /** Sets zoom, optionally keeping a screen-space point (e.g. the cursor)
   * stationary by adjusting pan to compensate. */
  setZoom: (zoom: number, focal?: { x: number; y: number }) => void;
  setPan: (x: number, y: number) => void;
  panBy: (dxScreenPx: number, dyScreenPx: number) => void;

  selectOnly: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  addLayer: (layer: Layer) => void;
  /** Adds multiple layers as a single undo step (e.g. "add all text fields"). */
  addLayers: (layers: Layer[]) => void;
  /** Replaces the whole layer array in one undo step, selecting `selectIds`
   * — for operations needing specific z-order control addLayers's
   * always-append can't give (e.g. Scryfall import slotting art beneath an
   * existing frame while adding text fields on top, together). */
  replaceLayers: (layers: Layer[], selectIds: string[]) => void;
  removeLayers: (ids: string[]) => void;
  duplicateLayers: (ids: string[]) => void;
  moveLayer: (id: string, direction: "up" | "down") => void;
  nudgeLayers: (ids: string[], dxMm: number, dyMm: number) => void;
  renameDesign: (name: string) => void;

  /** One discrete, undoable change (drag end, transform end, a single control commit). */
  commitLayerChange: (id: string, patch: Partial<Layer>) => void;
  commitLayerChanges: (entries: Array<{ id: string; patch: Partial<Layer> }>) => void;

  /** For continuous edits (typing, slider drag): live-updates with no history entry,
   * bracketed by beginLiveEdit()/commitLiveEdit() to record exactly one undo step. */
  beginLiveEdit: () => void;
  updateLayerLive: (id: string, patch: Partial<Layer>) => void;
  commitLiveEdit: () => void;

  undo: () => void;
  redo: () => void;
}

export function createDesignStore(initialDesign: Design) {
  return create<DesignState>((set) => ({
    design: initialDesign,
    past: [],
    future: [],
    pendingSnapshot: null,
    selectedLayerIds: [],
    showSafeArea: true,
    zoom: 1,
    panX: 0,
    panY: 0,

    toggleSafeArea: () => set((state) => ({ showSafeArea: !state.showSafeArea })),

    setZoom: (zoom, focal) =>
      set((state) => {
        const clamped = clampZoom(zoom);
        if (!focal) return { zoom: clamped };
        // Keep the model-space point currently under `focal` stationary on
        // screen: solve for the new pan given the same local point at the
        // new scale.
        const localX = (focal.x - state.panX) / state.zoom;
        const localY = (focal.y - state.panY) / state.zoom;
        return {
          zoom: clamped,
          panX: focal.x - localX * clamped,
          panY: focal.y - localY * clamped,
        };
      }),
    setPan: (x, y) => set({ panX: x, panY: y }),
    panBy: (dxScreenPx, dyScreenPx) => set((state) => ({ panX: state.panX + dxScreenPx, panY: state.panY + dyScreenPx })),

    selectOnly: (id) => set({ selectedLayerIds: id ? [id] : [] }),
    toggleSelect: (id) =>
      set((state) => ({
        selectedLayerIds: state.selectedLayerIds.includes(id)
          ? state.selectedLayerIds.filter((sid) => sid !== id)
          : [...state.selectedLayerIds, id],
      })),
    setSelection: (ids) => set({ selectedLayerIds: ids }),
    clearSelection: () => set({ selectedLayerIds: [] }),

    addLayer: (layer) =>
      set((state) => ({
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
        future: [],
        design: { ...state.design, layers: [...state.design.layers, layer] },
        selectedLayerIds: [layer.id],
      })),

    addLayers: (layers) =>
      set((state) => ({
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
        future: [],
        design: { ...state.design, layers: [...state.design.layers, ...layers] },
        selectedLayerIds: layers.map((l) => l.id),
      })),

    replaceLayers: (layers, selectIds) =>
      set((state) => ({
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
        future: [],
        design: { ...state.design, layers },
        selectedLayerIds: selectIds,
      })),

    removeLayers: (ids) =>
      set((state) => ({
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
        future: [],
        design: { ...state.design, layers: state.design.layers.filter((l) => !ids.includes(l.id)) },
        selectedLayerIds: state.selectedLayerIds.filter((id) => !ids.includes(id)),
      })),

    duplicateLayers: (ids) =>
      set((state) => {
        const clones = state.design.layers.filter((l) => ids.includes(l.id)).map((l) => cloneLayerWithOffset(l, 4));
        return {
          past: [...state.past, state.design].slice(-HISTORY_LIMIT),
          future: [],
          design: { ...state.design, layers: [...state.design.layers, ...clones] },
          selectedLayerIds: clones.map((c) => c.id),
        };
      }),

    moveLayer: (id, direction) =>
      set((state) => {
        const layers = [...state.design.layers];
        const index = layers.findIndex((l) => l.id === id);
        if (index === -1) return state;
        const swapWith = direction === "up" ? index + 1 : index - 1;
        if (swapWith < 0 || swapWith >= layers.length) return state;
        [layers[index], layers[swapWith]] = [layers[swapWith]!, layers[index]!];
        return { past: [...state.past, state.design].slice(-HISTORY_LIMIT), future: [], design: { ...state.design, layers } };
      }),

    nudgeLayers: (ids, dxMm, dyMm) =>
      set((state) => {
        const entries = state.design.layers
          .filter((l) => ids.includes(l.id))
          .map((l) => ({ id: l.id, patch: { x: l.x + dxMm, y: l.y + dyMm } }));
        if (entries.length === 0) return state;
        return {
          past: [...state.past, state.design].slice(-HISTORY_LIMIT),
          future: [],
          design: applyPatches(state.design, entries),
        };
      }),

    renameDesign: (name) =>
      set((state) => ({
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
        future: [],
        design: { ...state.design, name },
      })),

    commitLayerChange: (id, patch) =>
      set((state) => ({
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
        future: [],
        design: applyPatch(state.design, id, patch),
      })),

    commitLayerChanges: (entries) =>
      set((state) => ({
        past: [...state.past, state.design].slice(-HISTORY_LIMIT),
        future: [],
        design: applyPatches(state.design, entries),
      })),

    beginLiveEdit: () => set((state) => (state.pendingSnapshot ? state : { pendingSnapshot: state.design })),
    updateLayerLive: (id, patch) => set((state) => ({ design: applyPatch(state.design, id, patch) })),
    commitLiveEdit: () =>
      set((state) => {
        if (!state.pendingSnapshot) return state;
        return { past: [...state.past, state.pendingSnapshot].slice(-HISTORY_LIMIT), future: [], pendingSnapshot: null };
      }),

    undo: () =>
      set((state) => {
        const previous = state.past[state.past.length - 1];
        if (!previous) return state;
        const liveIds = new Set(previous.layers.map((l) => l.id));
        return {
          design: previous,
          past: state.past.slice(0, -1),
          future: [state.design, ...state.future],
          selectedLayerIds: state.selectedLayerIds.filter((id) => liveIds.has(id)),
        };
      }),

    redo: () =>
      set((state) => {
        const next = state.future[0];
        if (!next) return state;
        const liveIds = new Set(next.layers.map((l) => l.id));
        return {
          design: next,
          past: [...state.past, state.design],
          future: state.future.slice(1),
          selectedLayerIds: state.selectedLayerIds.filter((id) => liveIds.has(id)),
        };
      }),
  }));
}

export type DesignStore = ReturnType<typeof createDesignStore>;
