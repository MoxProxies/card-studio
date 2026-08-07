# Card Studio

A standalone card-design tool — mix and match frames, custom text, and
free-floating elements to build custom trading-card designs. Think
[Card Conjurer](https://github.com/Investigamer/cardconjurer) crossed
with Canva. Maintained as its own repo/deploy so it can evolve
independently of [moxproxies-website](https://github.com/moxproxies/moxproxies-website),
and "injected" into that site rather than merged into its codebase.

## Status

Early scaffold. The pieces below are wired together and verified working
end-to-end (typecheck, build, real render smoke tests, and browser-driven
UX checks — including the embedded shadow-DOM path, not just the
standalone dev server), but there's still no persistence/auth — see
[Not built yet](#not-built-yet).

The editor (`apps/editor`) currently supports:
- Add frame/text/image/shape layers; drag, resize, rotate via a Konva
  Transformer.
- Pan and zoom: `Ctrl/Cmd`+scroll to zoom on the cursor, plain scroll to
  pan, hold `Space`+drag or middle-mouse-drag to pan, plus a floating
  zoom control (bottom-right of the canvas) with in/out/percentage-reset/
  fit-to-view. A layer larger than the card, or a Transformer handle at
  the card's edge, is always reachable by zooming out or panning — see
  [Design decisions](#design-decisions) for why the Stage itself had to
  become a viewport rather than just adding scale to it.
- Imported images default to their own aspect ratio (contained within
  the cut area, centered) instead of a fixed box — a fixed box ignoring
  the source image's shape is what previously made every import come in
  squished. See `getImageNaturalSize` in `Toolbar.tsx`.
- A frame library (currently 6 original, generic trading-card frame
  templates, organized into folders — see [Adding frames](#adding-frames)
  below) with a searchable/filterable browser: a folder dropdown and a
  text search apply concurrently. Opened from the toolbar's "Frame"
  button (adds a new frame layer, sized to the cut/trim dimensions —
  centered the same way the cut-line guide is) or from a frame layer's
  "Change frame…" button in the properties panel (swaps its asset in
  place). Not an in-app upload button yet — see below.
- Multi-select: shift-click, or marquee (rubber-band) select on empty
  canvas.
- Alignment/snap guides while dragging a single layer (snaps to other
  layers' edges/centers and the card's edges/center).
- Undo/redo (`Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z`), duplicate (`Ctrl/Cmd+D`),
  delete (`Del`/`Backspace`), arrow-key nudge (`Shift` for a larger step).
- A properties panel: position/size/rotation/opacity, icon toggles for
  visible/locked, per-type fields (font/size/weight/color/align for text,
  frame picker + tint override for frames, fill/stroke for shapes, fit
  for images), and "align to card" for multi-select.
- Icons throughout (`lucide-react`) with a small shared stylesheet
  (`src/styles.css`) for consistent buttons/inputs — see the shadow-DOM
  note below for why it's `.cs-root` and not `:root`.
- The three-pane layout (canvas / layers / properties) is resizable —
  drag the handles between panels. The canvas area is always `flex: 1`
  (whatever's left over); only the two side panels have explicit,
  draggable widths (`App.tsx`, `ResizeHandle.tsx`).
- A "Text Fields" menu inserts the standard MTG text fields (title,
  mana cost, nickname, typeline, rules, flavor, P/T, artist/credit) at
  positions matching a classic MTG layout, individually or all at once,
  using whichever frame the design currently has to pick a config — see
  [MTG text fields](#mtg-text-fields) below.
- Text boxes shrink their font size to fit their box live in the editor
  (not just at export time), and support italic (uses the font's real
  italic file if the embedded family has one, otherwise a synthesized
  slant — same as bold).
- Embedded fonts: a folder-driven catalog (parallel to the frame
  library) with a dropdown in the properties panel, and a config
  constant for the default new text starts with — see
  [Adding fonts](#adding-fonts) below.
- A rarity dropdown places/swaps a rarity-symbol image layer at a
  config-adjustable position — see
  [Adding/changing rarity symbols](#addingchanging-rarity-symbols) below.

## Layout

```
apps/editor/           React + TypeScript + Konva canvas editor
packages/scene-schema/ Shared Design/Layer JSON schema (zod), DPI-independent
services/render/       Fastify service: scene JSON -> print-quality PNG
```

pnpm workspaces. `packages/scene-schema` is the contract every other
piece depends on — build it first (`pnpm -r build` handles ordering
automatically; each app's `predev`/`prebuild` script does too).

```
pnpm install
pnpm build          # builds scene-schema, then editor (app + embed), then render
pnpm dev:editor      # http://localhost:5173 — standalone editor
pnpm dev:render      # http://localhost:3001 — render service
```

## Adding frames

1. Drop a PNG (transparent where art should show through — see below) into
   `frame-library/<category>/`, e.g. `frame-library/borderless/my-frame.png`.
   A new category name is just a new folder; it shows up in the picker's
   folder dropdown automatically, no code change.
2. Run `pnpm sync-frames` from the repo root. This copies the image into
   both `apps/editor/public/frames/` and `services/render/assets/frames/`,
   and regenerates both `frameCatalog.generated.json` files.
3. Commit everything sync touched (`frame-library/`, the two
   `public`/`assets` copies, the two generated JSON files).

The frame's `id` is `<category>/<filename-without-extension>`; its
display name and folder label are the filename/foldername with
hyphens/underscores turned into spaces and title-cased — rename the file
if you want a different display name, there's no separate metadata file
to edit.

**Draw new frame art with a transparent art window.** The area where a
card's art should show through (typically most of the card, between the
name bar and the type/text boxes) needs to be left unpainted — actual
alpha transparency, not white — so an Image layer placed underneath a
Frame layer shows through it. Painting that region any opaque color
(including white) hides the art entirely. See
`services/render/scripts/generate-placeholder-frames.mjs` for a worked
example of drawing a frame this way with `@napi-rs/canvas`; it's also
the script to rerun (writing into `frame-library/classic/`, then sync)
if you want to tweak the 6 built-in placeholder designs.

## Adding fonts

1. Drop a font file into `font-library/<Family Name>/<weight>.woff2` (or
   `.woff`/`.ttf`/`.otf`), e.g. `font-library/Playfair Display/700.woff2`.
   `<weight>` must be the CSS font-weight number for that file — 400 for
   regular, 700 for bold. A font used at both weights needs both files.
   Add `-italic` before the extension for a real italic design at that
   weight, e.g. `400-italic.woff2` — optional; a weight with no italic
   file still gets a working italic (the browser/print engine synthesizes
   a slant), this only matters for using the font's *actual* italic
   letterforms instead of a slanted regular.
2. Run `pnpm sync-fonts`. This copies the file into both
   `apps/editor/public/fonts/` and `services/render/assets/fonts/`,
   regenerates both `fontCatalog.generated.json` files, and regenerates
   `apps/editor/src/fonts.generated.css` (the `@font-face` rules the
   browser needs).
3. Commit everything sync touched.

The new family shows up in the properties panel's font dropdown (under
"Embedded") immediately — no other code change needed. To change what
*new* text layers default to, edit `DEFAULT_FONT_FAMILY` in
`apps/editor/src/config.ts`; it must name a family that's actually in the
catalog (or a system font), otherwise it silently falls back to whatever
the browser picks and print output won't match what the editor showed.

The repo ships with [Inter](https://github.com/rsms/inter) (regular,
bold, and both their italics) under the SIL Open Font License 1.1 — see
`font-library/Inter/LICENSE.txt` — sourced from the `@fontsource/inter`
npm package's static files (that package isn't a runtime dependency;
only its files were copied in).

**A redundant `normal` keyword in a canvas font string silently defeats
italic — but only server-side.** `services/render/src/renderDesign.ts`
originally built `ctx.font` as `` `${style} ${weight} ${size}px
${family}` `` unconditionally, so normal-weight italic text became the
string `"italic normal 16px Inter"`. Chromium's canvas parses that fine
(it normalizes away the redundant weight keyword and keeps the italic),
which is why the editor's live Konva rendering (`LayerNode.tsx`, which
already omitted default keywords) looked correct — but `@napi-rs/canvas`
(Skia) parses the same string differently and silently drops the italic,
rendering upright text instead. Confirmed by rendering both engines'
interpretation of that exact string side by side before fixing it.
Fixed by only ever including the non-default tokens (`italic`, `bold`)
in the font string, the same way `LayerNode.tsx` already built its
`fontStyle` — never emit a literal `normal`. Worth remembering for any
future canvas-font-string code: don't assume Skia's parser is as
forgiving as Chromium's.

**Print exports must use the same font the editor showed, or the
"preview" lied.** `services/render/src/fontAssets.ts` registers every
embedded font with `@napi-rs/canvas`'s `GlobalFonts.registerFromPath()`
once at server startup (called from `server.ts`), so `ctx.font = "bold
16px Inter"` in `renderDesign.ts` resolves to the actual embedded Inter
Bold file instead of silently substituting a system font server-side.
Confirmed this actually works before relying on it: `GlobalFonts`
registration accepts `.woff2` directly (no need to also ship `.ttf` for
the Node side), and registering two weight files under the same family
name correctly resolves per-weight when `ctx.font` asks for `bold` vs
normal.

**Canvas text doesn't wait for its own webfont to load.** The first text
layer on a freshly loaded page could render in the browser's fallback
font, then look fine forever after — because `@font-face` alone doesn't
make a `<canvas>` `fillText()` call wait for the font file to download;
that's a DOM-text behavior, not a canvas one, and react-konva only
redraws in response to React prop changes, which font loading isn't.
Fixed two ways: `loadEmbeddedFonts.ts`'s `preloadEmbeddedFonts()` (called
from both `main.tsx` and `embed.ts`) explicitly kicks off every embedded
family/weight via the CSS Font Loading API (`document.fonts.load(...)`)
as early as possible, and `CanvasStage.tsx` calls `stage.batchDraw()`
once `document.fonts.ready` resolves (plus on every `loadingdone` event,
in case something loads later) so an in-flight load still gets picked up
even if the preload race is lost. Reproduced the bug and confirmed the
fix by screenshotting a text layer added within ~150ms of page load,
before and after.

## Adding/changing rarity symbols

1. Drop (or edit) an SVG into `rarity-library/<id>.svg`, e.g.
   `rarity-library/mythic.svg`. Flat, not folders — there's one fixed set
   of rarity symbols, not an open-ended library like frames/fonts.
2. Run `pnpm sync-rarity`. This copies the file into both
   `apps/editor/public/rarity/` and `services/render/assets/rarity/`, and
   regenerates both `rarityCatalog.generated.json` files.
3. Commit everything sync touched. If you added a new id (not just
   edited an existing symbol), also add it to `RARITY_DISPLAY_ORDER` in
   `apps/editor/src/rarityConfig.ts` so the dropdown lists it in the
   right place instead of appending it alphabetically at the end.

The toolbar's rarity dropdown (`Toolbar.tsx`'s `setRarity`) finds-or-
creates a single image layer with a fixed, well-known id
(`RARITY_LAYER_ID` in `rarityConfig.ts`) rather than tracking "which
layer is the rarity symbol" as separate UI state — picking a rarity
either adds that layer (sized/positioned from `RARITY_SYMBOL_BOX`, also
in `rarityConfig.ts` — hand-tune it if a frame's type line sits
somewhere else) or swaps the existing one's asset, and picking the blank
"Rarity…" option removes it. The layer stores `assetId` (e.g.
`"mythic"`) as the source of truth, resolved against the rarity catalog
by both the editor and the render service the same way a frame's
`assetId` is — `src` is kept alongside it as a browser-usable URL cache
so the layer stays self-describing, but isn't what either renderer
actually reads for a library asset.

`@napi-rs/canvas`'s `loadImage()` handles `.svg` files directly (checked
before building on this — no PNG rasterization step needed, unlike frame
art which is authored as PNG from the start).

## Inline symbols in text

Any text layer with `overflow: "shrink"` (rules text, by default) can mix
plain characters with `{token}` symbols mid-paragraph — `"{T}: Add {R}."`
renders a tap symbol and a red mana pip inline, wrapping and shrinking
along with the surrounding words rather than needing a separate layer.
This matters for rules text specifically: mana costs sit in their own
fixed-position field (see [MTG text fields](#mtg-text-fields) below,
still just a plain string like `"{2}{W}{W}"`), but ability text routinely
needs a symbol in the middle of a wrapping sentence, which a standalone
image layer can't do.

**Why this doesn't use a two-glyph colored font**, the way tools like
[Proxyshop](https://github.com/Investigamer/Proxyshop) do it (confirmed
by reading its source: each mana symbol is *two* font characters — a
filled circle glyph plus a black pip glyph authored with a negative left
side bearing so it lands back on the circle — colored separately via
Photoshop's per-character rich-text API): that trick exists because
Photoshop's text API is rich-text-capable but a single `fillText()` call
isn't, so a font *has* to carry two differently-colored shapes to fake
per-character color. Canvas here is exactly that same single-color-per-
call primitive, so if a font hack is going to be necessary, it's
necessary for canvas too, plus it introduces a font-licensing/authoring
question we don't have otherwise. Instead, symbols are small SVGs (the
`SVG loads directly in @napi-rs/canvas` fact already established for
rarity symbols) drawn inline by the text layout itself — no per-character
font tricks needed, and no dependency on OpenType color-font (COLR/CPAL)
support, which is inconsistent enough between Chromium and Skia that
building on it would've been a gamble.

1. Drop an SVG into `symbol-library/<id>.svg` — flat, like
   `rarity-library/`. `{W}` looks up `w.svg`, `{W/U}` looks up `w-u.svg`
   (`/` becomes `-`; token matching lowercases and strips whitespace).
2. Run `pnpm sync-symbols`. Same copy-to-both-consumers-plus-catalog
   pattern as frames/rarity: `apps/editor/public/symbols/`,
   `services/render/assets/symbols/`, `symbolCatalog.generated.json` in
   both.
3. Commit everything sync touched.

The shipped set is deliberately small — `w`, `u`, `b`, `r`, `g`, `c`
(colorless), `t` (tap), `q` (untap) — original, generic circle+letter art
(not a reproduction of WotC's actual symbols, same reasoning as the
frame art), enough to prove the mechanism rather than front-load every
mana symbol, hybrid combination, and Phyrexian variant that exists. Add
more the same way, any time.

**Generic mana numbers (`{0}`, `{1}`, `{2}`, ... any non-negative
integer) don't need a symbol-library file at all** — `isGenericManaToken`
(`symbolAssets.ts`) recognizes pure-digit tokens and a shared routine
draws a light-grey circle with the digits centered on top at draw time,
in both the editor (`drawGenericManaSymbol`-equivalent Konva nodes) and
the render service (`drawGenericManaSymbol` in `renderDesign.ts`) —
covers arbitrary generic costs without one asset per number.

**How it's implemented, for anyone touching this code:**
`shrinkTextToFit` (`packages/scene-schema/src/textFit.ts`) — the same
shared word-wrap/shrink engine both the editor and render service already
called — now tokenizes each space-separated word into a run list (plain
text and/or symbols) via an injected `resolveSymbol(token) => boolean`
predicate, so a `{token}` the caller's asset catalog doesn't recognize
falls back to its literal `"{token}"` text instead of vanishing. A
symbol run gets a fixed `symbolWidth(fontSizePx)` (currently 1em square)
for wrapping purposes, so it wraps as an atomic unit — `"{T}:"` (symbol
directly followed by punctuation, as MTG text commonly writes it) stays
together on one line as a single "word." The function's return type
changed from `lines: string[]` to `lines: LineLayout[]` (each line is a
list of positioned runs with their own x offset and width) since a line
is no longer just one string — both callers draw per-run now instead of
calling `fillText`/`<Text>` once per line: `renderDesign.ts`'s `drawText`
is `async` as of this change (symbol images load via `loadImage()` after
the final font size is known, not before — the shrink loop only needs
each symbol's *width*, a constant, not its pixels), and `LayerNode.tsx`
renders a `<Group>` of individually positioned `<Text>`/`<KonvaImage>`/
`<Circle>` nodes per line instead of one `<Text>` node, loading whatever
distinct symbol images the current content references via a new
`useHtmlImages` hook (`useHtmlImage`'s single-src version, generalized to
a dynamic list, since the set of symbols in play changes with content).

**Known limitation:** this only applies to the `"shrink"` overflow mode.
A layer set to `"clip"` or `"visible"` still renders `{W}` as literal
characters in the editor (Konva's native word-wrap, unchanged) — though
the render service, which already funneled every overflow mode through
`shrinkTextToFit`, resolves symbols for those too, so exports can
technically differ from what those two modes show on screen. Worth
closing if a design actually uses inline symbols outside shrink mode;
not done yet since rules text — the primary use case — always shrinks.

## MTG text fields

Text field placement/font/color is directory-driven and per-frame, the
same shape as the frame and font libraries:

```
text-template-library/
  _base.json       the default/fallback field set
  classic.json      override for frame-library/classic/'s frames
```

Each file is a JSON array of the standard fields (title, nickname, mana
cost, typeline, rules, flavor, power/toughness, artist/credit) — each
field's `x`/`y`/`width`/`height` (mm, relative to the *cut* corner, not
the full-bleed canvas), `fontSizePt`/`fontWeight`/`isItalic`, `align`,
and `color` are independent values, not derived from a shared grid
formula. That's deliberate: if one field looks slightly off against a
particular frame, open that frame's category file and adjust just that
field's numbers — nothing else depends on them or needs to change in
step. `flavor` starts `isItalic: true` in both `_base.json` and
`classic.json` (conventional for MTG flavor text); every other field
defaults to `false`.

An optional `fontFamily` on a field overrides `DEFAULT_FONT_FAMILY`
(`config.ts`) just for that field — e.g. a script face for flavor text —
same "must actually be in the font catalog, or a system font" caveat as
`DEFAULT_FONT_FAMILY` itself applies. Omit it to just use the default;
none of the shipped fields set it.

Run `pnpm sync-text-templates` any time you add a new `frame-library/`
category: it creates that category's `text-template-library/<category>.json`
as a verbatim duplicate of `_base.json` if one doesn't already exist yet
(never overwrites an existing one), then rebuilds the consolidated
`apps/editor/src/textTemplateCatalog.generated.json` every run. From
there, hand-edit the new category's file to fit that frame — the
duplicate is the whole point, it's a safe starting point that only
affects that one category.

**Editing an existing field's numbers day-to-day needs no command at
all.** `pnpm dev:editor` (`scripts/dev-editor.mjs`) starts the Vite dev
server *and* `scripts/watch-text-templates.mjs` together — the watcher
reruns the sync automatically the instant a file under
`text-template-library/` is saved, and Vite hot-reloads the regenerated
JSON straight into the running page (it's an ordinary JS module import,
so this is the same HMR path any other source-file edit gets — no
manual browser refresh either). Adjust a field's `x`/`y`/`color`/
whatever, save, and the *next* layer you add from that field picks it
up — a layer already placed on the canvas keeps whatever values it was
created with, since template config only supplies a starting point, not
a live binding. Driving Vite yourself instead of through `dev:editor`?
Run `pnpm watch-text-templates` alongside it for the same effect, or
fall back to plain `pnpm sync-text-templates` after each edit — it's the
same regenerate step, just triggered by hand instead of by a file save.

`Toolbar.tsx` resolves which field set applies from whatever Frame layer
is currently in the design (`activeFrameCategory`, via
`getFrameAsset(...).category`) — no frame present, or a category with no
override file yet, falls back to `_base.json`. The "Text Fields" toolbar
menu (`TextTemplateMenu.tsx`) converts a resolved template to an actual
text layer (offsetting by the cut-to-canvas margin, and using the
template's `color`) when you pick one, or all eight when you pick "Add
all fields" — the latter lands as a single undo step (`addLayers` in the
store), not eight.

**Shrink-to-fit runs live in the editor now, not just at export.** Text
boxes with `overflow: "shrink"` used to only actually shrink in the
`services/render` print export (`renderDesign.ts`'s `drawText`) — the
editor's Konva rendering just word-wrapped at the nominal font size
regardless of whether it fit the box, a real "what you see isn't what
prints" gap. Fixed by extracting the wrap/shrink loop into a shared,
engine-agnostic helper (`shrinkTextToFit` in
`packages/scene-schema/src/textFit.ts`, parameterized over a
`measureWidth`/`setFontSizePx` pair) that both `LayerNode.tsx` (using a
scratch, never-attached `<canvas>` 2D context to measure) and
`renderDesign.ts` (using its `SKRSContext2D`) now call — the two engines
have incompatible context types but an identical-enough 2D canvas text
API that duplicating the algorithm would've been the only alternative.
`LayerNode.tsx` also needed `useFontsReady()` (a small hook bumping state
on `document.fonts.ready`/`loadingdone`) since a shrink calculation that
runs once during React render, using a canvas context whose font hasn't
actually finished loading yet, gets wrong (fallback-font) metrics baked
in — unlike glyph painting, a later `stage.batchDraw()` alone doesn't
recompute it.

Fixing this surfaced a second, unrelated bug worth knowing about:
**`LayerNode.tsx` was converting `fontSizePt` to on-screen pixels at a
fixed 96 DPI, while every other measurement (the layer's box, via
`mmToStagePx`) used `EDITOR_DPI` (150).** Font size and box size were
each scaling from a different physical reference, so text rendered about
36% smaller on screen, relative to its box, than it does in the print
export — meaning a shrink threshold computed from these numbers would've
tripped at the wrong point. Fixed by deriving font size from
`EDITOR_DPI` too, the same as everything else on the canvas.

## Design decisions

**An ImageLayer's `fit` field existed in the schema but neither renderer
actually implemented `contain`/`fill` — both silently always behaved
like `cover`.** Both `LayerNode.tsx`'s plain `<KonvaImage>` (stretched to
the layer's box, i.e. `fill`) and `renderDesign.ts`'s `drawImage`
(always scaled to the *larger* of the two axis ratios and clipped, i.e.
`cover`) ignored the field entirely — harmless while every image layer's
box happened to already be sized to the image's own aspect ratio
(`addImage` picks the box that way), but it would silently distort
anything placed in a box of a different aspect ratio, which the rarity
symbols are (a square-ish SVG dropped into a hand-picked box). Fixed
with a shared `computeObjectFit` helper
(`packages/scene-schema/src/objectFit.ts`, the same CSS `object-fit`
math for all three modes) that both sides now call — `LayerNode.tsx`
wraps the image in a `Group` sized to the box (clipped only for `cover`)
with the inner `<KonvaImage>` sized/offset by the fit result;
`renderDesign.ts`'s `drawImage` does the equivalent with `ctx.clip()`.
Verified by rendering the same box in all three modes side by side —
`contain` centers the unscaled-aspect image inside the box, `cover`
scales up and clips, `fill` stretches — where before all three looked
identical.

**Scene JSON is DPI-independent (millimeters, not pixels).** A `Design`
is a background color plus an ordered list of `Layer`s (`frame`,
`image`, `text`, `shape`), each positioned in mm from the full-bleed
canvas's top-left corner. The editor draws that same JSON on a
screen-resolution Konva canvas (`EDITOR_DPI = 150`, see
`apps/editor/src/geometry.ts`); the render service draws the *same*
JSON at print resolution. Nothing is ever rasterized then scaled up —
that's what keeps the card crisp at 800 DPI (2176×2960px, the
full-bleed size) for actual print fulfillment, which is what this needs
to feed. See `packages/scene-schema/src/schema.ts` and
`services/render/src/renderDesign.ts`.

**Card size has three nested, centered regions — `CardSize` in
`packages/scene-schema/src/schema.ts`, standard values in
`STANDARD_CARD_SIZE_MM` (`units.ts`):**
- `widthMm`/`heightMm` — the **full-bleed canvas** (69.088×93.98mm).
  This is what `design.size` sizes the Stage/export to; art and frame
  layers should extend all the way to this edge, since a printer trims
  the sheet down from here.
- `cutWidthMm`/`cutHeightMm` — the **trim/cut size** (62.992×87.884mm),
  centered within the full-bleed canvas. This is the actual finished
  card. Drawn as an always-on red dashed guide.
- `safeWidthMm`/`safeHeightMm` — the **safe area** (57.912×83.058mm),
  centered within the cut size. Nothing critical (text, important art)
  should sit outside this, since cutting has some tolerance. Drawn as an
  orange dashed guide, toggle-able via the ruler icon in the toolbar
  (`showSafeArea` in the store — a view preference, not part of the
  design or undo history).

  These numbers come from a real print vendor's 300 DPI spec (bleed
  816×1110px / cut 744×1038px / safe 684×981px) — the cut and safe
  margins are each symmetric per axis, but the safe margin differs
  *between* axes (2.54mm horizontal vs 2.413mm vertical); that's in the
  source spec, not a bug. Get this wrong and print jobs come back with
  content cut off or a border of unprinted white — it's worth reading
  `units.ts`'s comment before changing any of these numbers.

**Panel content overflowing its own container was a missing `width:
100%`, not a sizing problem.** The properties panel used to overflow
horizontally past its own edge regardless of how wide it was given,
because `.cs-input` had no explicit width — a `<input type="number">`
without one keeps its browser-intrinsic width, which is wider than a
narrow two-column grid cell, and a flex/grid item's default `min-width:
auto` lets it force the *container* wider to fit that content instead of
clipping it. Fixed by giving `.cs-input` `width: 100%; min-width: 0`
(`styles.css`) and `minWidth: 0` on the grid/flex containers in
`PropertiesPanel.tsx`/`LayerPanel.tsx` — the panels themselves also
resized wider by default (300px) as a second line of defense, but that
alone wouldn't have fixed it at any width.

**Pan/zoom: the Stage is a viewport, not the card, scaled.** The obvious
first approach — give the Stage the card's own scale/position and call it
zoom — doesn't work: a `<canvas>` element's rendering is clipped to its
own pixel dimensions regardless of any internal transform, so a
card-sized Stage would clip anything panned or zoomed beyond those fixed
bounds. That's the same class of bug as the earlier transform-handle
clipping issue, just triggered by zoom instead of an oversized layer.
The fix (`CanvasStage.tsx`) is the standard "camera" pattern: the Stage
is sized to its own container (tracked with a `ResizeObserver`, so it
tracks panel resizes and window resizes too) and never scaled; all card
content — background, layers, guides, Transformer, even the marquee
overlay — lives inside one `Group` that carries `x/y/scaleX/scaleY` for
pan/zoom. Since Konva node coordinates for children of a transformed
ancestor are unaffected by that ancestor's transform (only their
*rendered* position/size changes), every existing piece of layer-drag,
resize, and snap-guide math kept working unmodified — none of it was
written in screen-pixel terms to begin with.

Two things specifically needed to change for coordinates to still line
up: marquee-selection now reads pointer position via the content
`Group`'s `getRelativePointerPosition()` instead of the Stage's
`getPointerPosition()`, so the drag rect comes out already in the same
model space as layer bounding boxes regardless of current pan/zoom
(no manual inverse-transform math needed). And PNG export
(`export.ts`) has to divide its `pixelRatio` by the current zoom and
crop from `{panX, panY, widthPx*zoom, heightPx*zoom}` instead of a fixed
region — otherwise export resolution would silently depend on whatever
zoom level happened to be on screen when you clicked Export (zoomed out
50% would have halved the output resolution, since Konva scales up from
however many pixels are actually rendered on screen, not from the card's
native size).

**Frame catalog is directory-driven, not hand-edited.** `frame-library/`
at the repo root is the canonical source: one subfolder per category,
one image per frame —

```
frame-library/
  classic/
    classic-white.png
    classic-blue.png
    ...
```

`scripts/sync-frame-library.mjs` scans it and publishes the result to
both consumers: it copies every image into `apps/editor/public/frames/`
(served to the browser) and `services/render/assets/frames/` (loaded by
`@napi-rs/canvas`'s `loadImage` from disk), and writes a generated
catalog — `id` (`"<category>/<slug>"`), display `name`/`categoryLabel`
(humanized from the folder/file names), `category`, `fileName` — to
`apps/editor/src/frameCatalog.generated.json` and
`services/render/src/frameCatalog.generated.json`. Both `frameAssets.ts`
modules just import that JSON; nothing about adding a frame requires
touching TypeScript. `FrameLibraryModal.tsx` (the search/filter browser)
and `renderDesign.ts` both resolve `assetId` against it, falling back to
a flat-tint placeholder for an unresolved id (unknown, or a legacy
design predating this asset) — so a catalog change never breaks an
existing design.

This is still two copies of the same files (one per consumer's runtime
needs — a browser fetches by URL, Node reads from disk) plus a generated
JSON catalog per copy — a known simplification for a two-consumer
scaffold, worth consolidating into a real asset store once there's a
persistence layer, rather than a shared package that still just ships
static files twice. `frame-library/` and the generated JSON/images are
all committed, so nothing needs to run at deploy time — only when you
actually add a frame.

The 6 built-in frames — a border, name bar, type bar, text box, and PT
box around a deliberately transparent "art window" (so an Image layer
placed underneath a Frame layer shows through as the card's art) — are
original, generic artwork (not a reproduction of any specific card
game's copyrighted frame design), generated with `@napi-rs/canvas` via
`services/render/scripts/generate-placeholder-frames.mjs`.

The frame-picker thumbnails and the editor's own frame rendering both
assume `/frames/...` is served from the deploying host's origin root; if
either build ever ships under a subpath, that'll need a proper base-path
fix (Vite's `base` config), not just changing the string.

**Embedding into moxproxies-website: a custom element, not an iframe.**
`apps/editor` has two Vite build targets:
- `dist/app` — the standalone SPA (deploy to e.g. `studio.moxproxies.com`
  for direct, full-page use).
- `dist/embed/card-studio-embed.js` — a self-contained bundle that
  registers `<card-studio-editor>` (`apps/editor/src/embed.ts`). The
  Laravel site loads it with a plain `<script type="module">` tag and
  drops the element into a Blade view:

  ```html
  <script type="module" src="https://studio.moxproxies.com/embed/card-studio-embed.js"></script>
  <card-studio-editor initial-design='{"...": "..."}' height="700px"></card-studio-editor>
  ```

  The element dispatches a `design-change` CustomEvent (detail = current
  `Design` JSON) on every edit, and exposes `.getDesign()` for reading
  the design imperatively (e.g. right before checkout). This was chosen
  over an iframe because moxproxies-website is a server-rendered
  Laravel/Blade app — a web component slots into an existing page the
  same way any other JS widget would, with no cross-origin postMessage
  plumbing needed for the common case of "mount an editor, read the
  result." It costs a slightly more coupled deploy (the host page needs
  the bundle's URL); that's an acceptable trade here since both sites
  are ours.

  Two pitfalls specific to this shadow-DOM/library-mode build, both
  found by actually loading the built bundle in a plain host page rather
  than trusting the standalone dev server:
  - CSS custom properties are defined on `.cs-root`, not `:root` —
    `:root` only ever matches the top-level *document's* root element,
    never a shadow tree's boundary, so a stylesheet injected into the
    shadow root (see `embed.ts`) would silently fail to theme anything
    if it used `:root`. `styles.css` is imported with Vite's `?inline`
    query and manually appended as a `<style>` inside the shadow root
    for exactly this reason — a normal `import "./styles.css"` injects
    into `document.head`, which can't cross the shadow boundary either.
  - `vite.embed.config.ts` sets `define: { "process.env.NODE_ENV":
    '"production"' }` explicitly. Vite's standard app build replaces
    that automatically (React's CJS wrapper branches on it); library
    mode doesn't pick it up the same way, so without it the bundle
    throws `process is not defined` the instant it runs in a browser —
    which is, unhelpfully, exactly the environment it's loaded into.
    Fixing it also let Rollup dead-code-eliminate React's whole dev-mode
    branch, dropping the bundle from ~1.6MB to ~750KB.

## How this is meant to connect to moxproxies-website

Not implemented yet, but the shape of it:

- moxproxies-website already has a `CardDesign` model
  (`app/Models/CardDesign.php`) driving a *prompt/field-based* AI-art
  card pipeline (`GenerateCardImageForCardDesign` job). This project is
  a different, visual-editor path to producing a card image — the two
  can coexist. A finished Card Studio design would populate
  `CardDesign.generated_url` (or a new column) once rendered, rather
  than replacing the existing model.
- Card Studio should treat moxproxies-website as its identity provider:
  the host page passes a short-lived token down to the embedded
  element (e.g. as an attribute or via a JS setter) so API calls from
  the widget (save design, upload art, request a print-quality render)
  are attributed to the logged-in user without Card Studio running its
  own auth system.
- `sourceCardDesignId` already exists on `Design` (see schema) as the
  join point back to a `CardDesign` row.

## Not built yet

- In-app frame/font/rarity-symbol/text-template upload (adding any of
  these is a file-drop + `pnpm sync-*` + commit workflow today — see
  [Adding frames](#adding-frames) / [Adding fonts](#adding-fonts) /
  [Adding/changing rarity symbols](#addingchanging-rarity-symbols) — not
  a button in the UI; there's also no way yet for a running deployment
  to pick up a new one without a rebuild/redeploy)
- Persistence (saving/loading designs — currently all in-memory,
  including panel widths and the safe-area toggle, which reset on reload)
- Auth/session handoff from moxproxies-website
- An API layer in front of `services/render` (it's currently a bare
  render endpoint, no auth, no storage of results)
- Deploy config for either app
- Inline symbols outside `overflow: "shrink"` (see [Inline symbols in
  text](#inline-symbols-in-text)'s known limitation)
- "Grow to fill" text sizing — `shrinkTextToFit` only ever reduces
  `fontSizePt` when content overflows; short content just renders at the
  authored size, however small that looks in a large box. A template-
  defined min/max range with the font size searching both directions
  (not just down) is a natural extension of the same shrink loop, not
  built yet
