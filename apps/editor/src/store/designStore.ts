import { create } from "zustand";
import type { Design, Layer } from "@card-studio/scene-schema";

export interface DesignState {
  design: Design;
  selectedLayerId: string | null;
  selectLayer: (id: string | null) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: "up" | "down") => void;
  renameDesign: (name: string) => void;
}

export function createDesignStore(initialDesign: Design) {
  return create<DesignState>((set) => ({
    design: initialDesign,
    selectedLayerId: null,

    selectLayer: (id) => set({ selectedLayerId: id }),

    addLayer: (layer) =>
      set((state) => ({
        design: { ...state.design, layers: [...state.design.layers, layer] },
        selectedLayerId: layer.id,
      })),

    updateLayer: (id, patch) =>
      set((state) => ({
        design: {
          ...state.design,
          layers: state.design.layers.map((l) =>
            l.id === id ? ({ ...l, ...patch } as Layer) : l
          ),
        },
      })),

    removeLayer: (id) =>
      set((state) => ({
        design: {
          ...state.design,
          layers: state.design.layers.filter((l) => l.id !== id),
        },
        selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
      })),

    moveLayer: (id, direction) =>
      set((state) => {
        const layers = [...state.design.layers];
        const index = layers.findIndex((l) => l.id === id);
        if (index === -1) return state;
        const swapWith = direction === "up" ? index + 1 : index - 1;
        if (swapWith < 0 || swapWith >= layers.length) return state;
        [layers[index], layers[swapWith]] = [layers[swapWith]!, layers[index]!];
        return { design: { ...state.design, layers } };
      }),

    renameDesign: (name) => set((state) => ({ design: { ...state.design, name } })),
  }));
}

export type DesignStore = ReturnType<typeof createDesignStore>;
