import { useState } from "react";
import type Konva from "konva";
import type { RefObject } from "react";
import type { Layer } from "@card-studio/scene-schema";
import { Frame, Type, Shapes, ImageUp, Undo2, Redo2, Copy, Trash2, Download, Ruler, Search, Scissors, Save } from "lucide-react";
import { useDesignStore } from "../store/DesignProvider";
import { PRINT_DPI, createEmptyDesign, STANDARD_CARD_SIZE_MM } from "@card-studio/scene-schema";
import { exportStageToPngDataUrl } from "../export";
import { FrameLibraryModal } from "./FrameLibraryModal";
import { TextTemplateMenu } from "./TextTemplateMenu";
import { ScryfallSearchModal } from "./ScryfallSearchModal";
import { DesignLibraryModal } from "./DesignLibraryModal";
import { getTextTemplates, type TextFieldTemplate } from "../textTemplates";
import { getFrameAsset } from "../frameAssets";
import { RARITY_ASSETS, getRarityAssetUrl } from "../rarityAssets";
import { RARITY_DISPLAY_ORDER, RARITY_LAYER_ID, RARITY_SYMBOL_BOX, RARITY_DEFAULT_LOCKED, RARITY_DEFAULT_CONTENT_LOCKED } from "../rarityConfig";
import { DEFAULT_FONT_FAMILY } from "../config";
import { primaryCardFields, type ScryfallCard } from "../scryfall";
import { designStorage } from "../designStorage";
import { resolveArtWindowMm } from "../frameArtWindow";

function newId(): string {
  return crypto.randomUUID();
}

const fmt = (mm: number) => Number(mm.toFixed(2)).toString();

export function Toolbar({ stageRef }: { stageRef: RefObject<Konva.Stage> }) {
  const design = useDesignStore((s) => s.design);
  const addLayer = useDesignStore((s) => s.addLayer);
  const addLayers = useDesignStore((s) => s.addLayers);
  const addLayersWithGroups = useDesignStore((s) => s.addLayersWithGroups);
  const replaceLayers = useDesignStore((s) => s.replaceLayers);
  const commitLayerChange = useDesignStore((s) => s.commitLayerChange);
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds);
  const duplicateLayers = useDesignStore((s) => s.duplicateLayers);
  const removeLayers = useDesignStore((s) => s.removeLayers);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const showSafeArea = useDesignStore((s) => s.showSafeArea);
  const toggleSafeArea = useDesignStore((s) => s.toggleSafeArea);
  const showBleed = useDesignStore((s) => s.showBleed);
  const toggleBleed = useDesignStore((s) => s.toggleBleed);
  const renameDesign = useDesignStore((s) => s.renameDesign);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const entitlements = useDesignStore((s) => s.entitlements);
  const zoom = useDesignStore((s) => s.zoom);
  const panX = useDesignStore((s) => s.panX);
  const panY = useDesignStore((s) => s.panY);
  const [showFrameLibrary, setShowFrameLibrary] = useState(false);
  const [showScryfallSearch, setShowScryfallSearch] = useState(false);
  const [showDesignLibrary, setShowDesignLibrary] = useState(false);

  const centerBox = () => {
    const w = design.size.widthMm * 0.6;
    const h = design.size.heightMm * 0.2;
    return {
      x: (design.size.widthMm - w) / 2,
      y: (design.size.heightMm - h) / 2,
      width: w,
      height: h,
    };
  };

  const addFrame = (assetId: string) =>
    addLayer({
      id: newId(),
      name: "Frame",
      type: "frame",
      assetId,
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      contentLocked: false,
      // New frames size to the full-bleed canvas, not just the cut/trim
      // dimensions — frame art needs to extend past the trim line, or the
      // printed card shows a background-color gap around the edge once
      // cut. See generate-placeholder-frames.mjs for how the built-in
      // frame art itself was authored to match.
      x: 0,
      y: 0,
      width: design.size.widthMm,
      height: design.size.heightMm,
    });

  const addText = () =>
    addLayer({
      id: newId(),
      name: "Text",
      type: "text",
      content: "New text",
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSizePt: 14,
      fontWeight: "normal",
      italic: false,
      color: "#111111",
      align: "left",
      lineHeight: 1.2,
      overflow: "shrink",
      shadowOffsetXPt: 0,
      shadowOffsetYPt: 0,
      shadowBlurPt: 1,
      shadowOpacity: 0.75,
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      contentLocked: false,
      ...centerBox(),
    });

  // Text-field positions are relative to the cut/trim corner, not the
  // full-bleed canvas layers actually live in — offset by the same margin
  // the cut-line guide uses.
  const cutOffsetX = (design.size.widthMm - design.size.cutWidthMm) / 2;
  const cutOffsetY = (design.size.heightMm - design.size.cutHeightMm) / 2;

  // Which text-field config applies is driven by the design's current
  // frame: each frame-library/ category can have its own
  // text-template-library/<category>.json override (position/font/color
  // tuned to fit that frame), falling back to the base/default set when
  // no frame is present yet, or its category has no override of its own.
  const activeFrameLayer = design.layers.find((l): l is Extract<Layer, { type: "frame" }> => l.type === "frame");
  const activeFrameCategory = activeFrameLayer ? getFrameAsset(activeFrameLayer.assetId)?.category : undefined;
  const textTemplates = getTextTemplates(activeFrameCategory);

  const templateToLayer = (template: TextFieldTemplate): Layer => ({
    id: newId(),
    name: template.label,
    type: "text",
    content: template.defaultContent,
    fontFamily: template.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontSizePt: template.fontSizePt,
    minFontSizePt: template.minFontSizePt,
    maxFontSizePt: template.maxFontSizePt,
    fontWeight: template.fontWeight,
    italic: template.isItalic,
    color: template.color,
    align: template.align,
    lineHeight: 1.15,
    overflow: "shrink",
    // Whether this field has a shadow at all — and, if so, its exact
    // look — is decided by the template, same as its color/font/size: a
    // title over busy full-art might want one, rules text over its own
    // parchment-colored box usually doesn't. template.shadow's presence
    // (and its color specifically) is the on/off switch; the rest each
    // independently fall back to schema.ts's TextLayer defaults so a
    // template only has to name a color to get sensible sizing for free.
    shadowColor: template.shadow?.color,
    shadowOffsetXPt: template.shadow?.offsetXPt ?? 0,
    shadowOffsetYPt: template.shadow?.offsetYPt ?? 0,
    shadowBlurPt: template.shadow?.blurPt ?? 1,
    shadowOpacity: template.shadow?.opacity ?? 0.75,
    rotationDeg: 0,
    opacity: 1,
    visible: true,
    // Whether this field starts position-locked and/or content-locked is
    // also a per-template, per-frame decision, same as everything else
    // above — see TextFieldTemplate.locked/contentLocked's doc comments
    // and README's "Field locking" section. Neither is set on most
    // shipped fields; artist/signature default both to true.
    locked: template.locked ?? false,
    contentLocked: template.contentLocked ?? false,
    x: cutOffsetX + template.x,
    y: cutOffsetY + template.y,
    width: template.width,
    height: template.height,
  });

  const addTextField = (template: TextFieldTemplate) => addLayer(templateToLayer(template));

  // The rarity-symbol image is a singleton, found-or-created by its fixed
  // id (RARITY_LAYER_ID) rather than tracked as separate UI state — see
  // rarityConfig.ts.
  const rarityLayer = design.layers.find((l): l is Extract<Layer, { type: "image" }> => l.type === "image" && l.id === RARITY_LAYER_ID);
  const currentRarityId = rarityLayer?.assetId ?? "";
  // Whether picking a rarity is gated the same way editing a
  // contentLocked text field's content is — checked even before a rarity
  // layer exists yet, using what it *would* default to
  // (RARITY_DEFAULT_CONTENT_LOCKED), so there's no "the first pick is
  // free, only changing it afterward is locked" inconsistency.
  const rarityContentLocked = rarityLayer ? rarityLayer.contentLocked : RARITY_DEFAULT_CONTENT_LOCKED;
  const rarityLocked = rarityContentLocked && !entitlements.canEditLockedContent;
  const orderedRarities = [...RARITY_ASSETS].sort((a, b) => {
    const ai = RARITY_DISPLAY_ORDER.indexOf(a.id);
    const bi = RARITY_DISPLAY_ORDER.indexOf(b.id);
    if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const buildRarityLayer = (rarityId: string, url: string): Layer => ({
    id: RARITY_LAYER_ID,
    name: "Rarity Symbol",
    type: "image",
    assetId: rarityId,
    src: url,
    fit: "contain",
    rotationDeg: 0,
    opacity: 1,
    visible: true,
    locked: RARITY_DEFAULT_LOCKED,
    contentLocked: RARITY_DEFAULT_CONTENT_LOCKED,
    x: cutOffsetX + RARITY_SYMBOL_BOX.x,
    y: cutOffsetY + RARITY_SYMBOL_BOX.y,
    width: RARITY_SYMBOL_BOX.width,
    height: RARITY_SYMBOL_BOX.height,
  });

  /**
   * "Add all fields" — every field the current template set has, plus a
   * default rarity-symbol layer if one isn't already present (so there's
   * something for "Typeline and rarity" to actually group, since rarity
   * isn't one of textTemplates' own fields — see rarityConfig.ts). Groups
   * three pairs by default: title+mana cost, typeline+rarity, rules+
   * flavour — everything else (nickname, P/T, artist, signature) stays
   * ungrouped. One undo step via addLayersWithGroups, which also covers
   * the "rarity already existed" case (its groupId gets set in place,
   * without needing a second history entry) — see designStore.ts.
   */
  const addAllTextFields = () => {
    const newFieldLayers = textTemplates.map(templateToLayer);
    const layerIdByFieldId = new Map(textTemplates.map((t, i) => [t.id, newFieldLayers[i]!.id]));

    let extraRarityLayer: Layer | null = null;
    if (!rarityLayer) {
      const defaultRarityId = RARITY_DISPLAY_ORDER[0];
      const url = defaultRarityId ? getRarityAssetUrl(defaultRarityId) : undefined;
      if (defaultRarityId && url) extraRarityLayer = buildRarityLayer(defaultRarityId, url);
    }
    const newLayers = extraRarityLayer ? [...newFieldLayers, extraRarityLayer] : newFieldLayers;

    const groupDefs: Array<{ name: string; layerIds: string[] }> = [];
    const titleId = layerIdByFieldId.get("title");
    const manaCostId = layerIdByFieldId.get("manaCost");
    if (titleId && manaCostId) groupDefs.push({ name: "Title and mana cost", layerIds: [titleId, manaCostId] });
    const typelineId = layerIdByFieldId.get("typeline");
    if (typelineId) groupDefs.push({ name: "Typeline and rarity", layerIds: [typelineId, RARITY_LAYER_ID] });
    const rulesId = layerIdByFieldId.get("rules");
    const flavorId = layerIdByFieldId.get("flavor");
    if (rulesId && flavorId) groupDefs.push({ name: "Rules and flavour", layerIds: [rulesId, flavorId] });

    addLayersWithGroups(newLayers, groupDefs);
  };

  const setRarity = (rarityId: string) => {
    if (!rarityId) {
      if (rarityLayer) removeLayers([RARITY_LAYER_ID]);
      return;
    }
    const url = getRarityAssetUrl(rarityId);
    if (!url) return;
    if (rarityLayer) {
      commitLayerChange(RARITY_LAYER_ID, { assetId: rarityId, src: url });
      return;
    }
    addLayer(buildRarityLayer(rarityId, url));
  };

  const addImage = (file: File) => {
    const src = URL.createObjectURL(file);
    // Default to the full-bleed canvas, edge to edge, same as "Add Frame"
    // — not a box aspect-fit to the image's own shape. Aspect-fitting used
    // to be the default (see git history) to stop random art crops from
    // getting squished into a fixed box, but it has its own failure mode:
    // any imported image whose aspect ratio isn't *exactly* the canvas's
    // (which is normal — different print pipelines round pixel dimensions
    // differently) gets letterboxed with a visible gap on one axis instead
    // of actually reaching the edge, which defeats the point for an image
    // that's already meant to be the whole full-bleed card. `fit: "cover"`
    // preserves the image's own aspect ratio without distortion (no
    // squish) while guaranteeing the box itself is always filled — any
    // mismatch is cropped, invisibly, rather than left as a gap. A smaller
    // art crop not meant to fill the whole card can still be resized down
    // afterward, same as always.
    addLayer({
      id: newId(),
      name: file.name,
      type: "image",
      src,
      fit: "cover",
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      contentLocked: false,
      x: 0,
      y: 0,
      width: design.size.widthMm,
      height: design.size.heightMm,
    });
  };

  // Field id -> Scryfall value, mirroring the ids text-template-library/
  // fields use (title/manaCost/typeline/rules/flavor/powerToughness/
  // artist) so each maps onto the matching resolved template. Nickname,
  // signature, and edition have no Scryfall equivalent and are
  // deliberately left out — nothing to fill them with.
  const scryfallFieldValues = (fields: ReturnType<typeof primaryCardFields>): Record<string, string | undefined> => ({
    title: fields.name,
    manaCost: fields.manaCost || undefined,
    typeline: fields.typeLine || undefined,
    rules: fields.oracleText || undefined,
    flavor: fields.flavorText || undefined,
    powerToughness: fields.powerToughness || undefined,
    artist: fields.artist ? `Illus. ${fields.artist}` : undefined,
  });

  /**
   * Adds all the text fields (and the card's own art, and its rarity
   * symbol) a Scryfall card has data for, as one undo step. Only fields
   * with an actual value get added — no placeholder text for e.g. a card
   * with no flavor text.
   */
  const importFromScryfall = (card: ScryfallCard) => {
    const fields = primaryCardFields(card);
    const values = scryfallFieldValues(fields);

    const textLayers = textTemplates
      .filter((template) => values[template.id])
      .map((template) => ({ ...templateToLayer(template), content: values[template.id]! }));

    // Sized to the frame's actual illustration window, not the full-bleed
    // card — unlike addImage's default (a full pre-made card scan, already
    // shaped like the whole card), Scryfall's `art_crop` is just the
    // illustration on its own, a much more landscape aspect ratio than the
    // card itself. Stretching it full-bleed with `fit: "cover"` (the old
    // behavior) forced that landscape image through a tall, narrow box,
    // cropping away roughly half of it on the sides. `fit: "cover"` within
    // the actual (much closer-to-landscape) window still crops to fill —
    // that's unavoidable without knowing the source crop's exact aspect —
    // but nowhere near as much, and the result actually lands where a
    // card's illustration goes instead of behind the whole frame.
    const artLayer: Layer | undefined = fields.artCropUrl
      ? {
          id: newId(),
          name: `${fields.name} (art)`,
          type: "image",
          src: fields.artCropUrl,
          fit: "cover",
          rotationDeg: 0,
          opacity: 1,
          visible: true,
          locked: false,
          contentLocked: false,
          ...resolveArtWindowMm(activeFrameCategory, design.size),
        }
      : undefined;

    // Art belongs *beneath* the frame (so the frame's transparent art
    // window shows it) while text belongs on top of everything — addLayers
    // always appends at the top, which can't express both in one step, so
    // this builds the full array directly and commits it via replaceLayers.
    const layers = [...design.layers];
    if (artLayer) {
      const frameIndex = layers.findIndex((l) => l.type === "frame");
      if (frameIndex === -1) layers.unshift(artLayer);
      else layers.splice(frameIndex, 0, artLayer);
    }
    layers.push(...textLayers);

    if (fields.rarity && RARITY_ASSETS.some((r) => r.id === fields.rarity)) {
      const url = getRarityAssetUrl(fields.rarity)!;
      const existingRarityIndex = layers.findIndex((l) => l.id === RARITY_LAYER_ID);
      if (existingRarityIndex !== -1) {
        layers[existingRarityIndex] = { ...layers[existingRarityIndex]!, assetId: fields.rarity, src: url } as Layer;
      } else {
        layers.push(buildRarityLayer(fields.rarity, url));
      }
    }

    const selectIds = [...(artLayer ? [artLayer.id] : []), ...textLayers.map((l) => l.id)];
    replaceLayers(layers, selectIds);
  };

  const addShape = () =>
    addLayer({
      id: newId(),
      name: "Shape",
      type: "shape",
      shape: "rect",
      fill: "#93c5fd",
      strokeWidthMm: 0,
      cornerRadiusMm: 0,
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
      contentLocked: false,
      ...centerBox(),
    });

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;
    // Cut-line/safe-area/snap guides, the marquee, and the Transformer's
    // selection handles are editor-only overlays, not part of the card —
    // toDataURL() below is a literal snapshot of whatever the Konva stage
    // currently renders, so they have to be hidden (and a synchronous
    // .draw() forced, since toDataURL composites from each layer's own
    // already-rendered canvas rather than redrawing from scratch — an
    // async/batched redraw wouldn't be reflected yet) for the duration of
    // the capture, then restored.
    const hidden = stage.find(".cs-export-hide");
    hidden.forEach((node) => node.visible(false));
    stage.draw();
    const dataUrl = exportStageToPngDataUrl(stage, design.size, PRINT_DPI, { panX, panY, zoom });
    hidden.forEach((node) => node.visible(true));
    stage.draw();

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${design.name || "card"}.png`;
    link.click();
  };

  return (
    <div className="cs-root" style={{ display: "flex", alignItems: "center", gap: 6, padding: 8, borderBottom: "1px solid var(--cs-border)" }}>
      <button className="cs-btn" onClick={() => setShowFrameLibrary(true)}>
        <Frame size={16} /> Frame
      </button>
      <button className="cs-btn" onClick={addText}>
        <Type size={16} /> Text
      </button>
      <TextTemplateMenu templates={textTemplates} onAdd={addTextField} onAddAll={addAllTextFields} />
      <button className="cs-btn" onClick={addShape}>
        <Shapes size={16} /> Shape
      </button>
      <label className="cs-btn" style={{ cursor: "pointer" }}>
        <ImageUp size={16} /> Image
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void addImage(file);
            e.target.value = "";
          }}
        />
      </label>
      <select
        className="cs-input"
        style={{ width: 130 }}
        value={currentRarityId}
        onChange={(e) => setRarity(e.target.value)}
        disabled={rarityLocked}
        title={
          rarityLocked
            ? "Content-locked by default — requires a premium account to change"
            : "Rarity symbol — prefills its position from RARITY_SYMBOL_BOX in rarityConfig.ts"
        }
      >
        <option value="">Rarity…</option>
        {orderedRarities.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <button className="cs-btn" onClick={() => setShowScryfallSearch(true)} title="Look up a real card and fill in its text fields, art, and rarity">
        <Search size={16} /> Scryfall
      </button>

      <div className="cs-divider" />

      <button className="cs-icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
        <Undo2 size={16} />
      </button>
      <button className="cs-icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
        <Redo2 size={16} />
      </button>
      <button
        className="cs-icon-btn"
        onClick={() => duplicateLayers(selectedLayerIds)}
        disabled={selectedLayerIds.length === 0}
        title="Duplicate (Ctrl/Cmd+D)"
      >
        <Copy size={16} />
      </button>
      <button
        className="cs-icon-btn"
        onClick={() => removeLayers(selectedLayerIds)}
        disabled={selectedLayerIds.length === 0}
        title="Delete (Del)"
      >
        <Trash2 size={16} />
      </button>

      <div style={{ flex: 1 }} />

      <button
        className={`cs-icon-btn${showSafeArea ? " cs-active" : ""}`}
        onClick={toggleSafeArea}
        title="Toggle safe-area guide — nothing critical should sit outside it"
      >
        <Ruler size={16} />
      </button>
      <button
        className={`cs-icon-btn${!showBleed ? " cs-active" : ""}`}
        onClick={toggleBleed}
        title={showBleed ? "Preview trimmed card — hides the bleed margin and rounds the corners" : "Show full bleed"}
      >
        <Scissors size={16} />
      </button>

      <span
        style={{ alignSelf: "center", color: "var(--cs-text-muted)", fontSize: 12, cursor: "help" }}
        title={
          `Cut (final card): ${fmt(design.size.cutWidthMm)}×${fmt(design.size.cutHeightMm)}mm\n` +
          `Full bleed (art must extend to here): ${fmt(design.size.widthMm)}×${fmt(design.size.heightMm)}mm\n` +
          `Safe area (toggle above): ${fmt(design.size.safeWidthMm)}×${fmt(design.size.safeHeightMm)}mm`
        }
      >
        Cut {fmt(design.size.cutWidthMm)}×{fmt(design.size.cutHeightMm)}mm · bleed to {fmt(design.size.widthMm)}×
        {fmt(design.size.heightMm)}mm
      </span>
      <button className="cs-btn" onClick={() => setShowDesignLibrary(true)} title="Save or load a design">
        <Save size={16} /> Designs
      </button>
      <button className="cs-btn" onClick={handleExport} title={`Export PNG at ${PRINT_DPI} DPI`}>
        <Download size={16} /> Export ({PRINT_DPI} DPI)
      </button>

      {showDesignLibrary && (
        <DesignLibraryModal
          design={design}
          onRename={renameDesign}
          onSave={() => designStorage.save(design)}
          onNew={() => {
            loadDesign(createEmptyDesign(crypto.randomUUID(), STANDARD_CARD_SIZE_MM));
            setShowDesignLibrary(false);
          }}
          onLoad={(loaded) => {
            loadDesign(loaded);
            setShowDesignLibrary(false);
          }}
          onClose={() => setShowDesignLibrary(false)}
        />
      )}

      {showFrameLibrary && (
        <FrameLibraryModal
          onSelect={(assetId) => {
            addFrame(assetId);
            setShowFrameLibrary(false);
          }}
          onClose={() => setShowFrameLibrary(false)}
        />
      )}

      {showScryfallSearch && (
        <ScryfallSearchModal
          onSelect={(card) => {
            void importFromScryfall(card);
            setShowScryfallSearch(false);
          }}
          onClose={() => setShowScryfallSearch(false)}
        />
      )}
    </div>
  );
}
