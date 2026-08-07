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
  Transformer. The canvas renders a workspace margin around the card
  (`WORKSPACE_PADDING_PX`) so a layer larger than the card — or a
  Transformer handle sitting right at the card's edge — has somewhere to
  draw; without it, that content and those handles are simply clipped by
  the canvas's own pixel bounds and become unreachable.
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

## Design decisions

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

- In-app frame upload (adding a frame is a file-drop + `pnpm sync-frames`
  + commit workflow today — see [Adding frames](#adding-frames) — not a
  button in the UI; there's also no way yet for a running deployment to
  pick up a new frame without a rebuild/redeploy)
- Persistence (saving/loading designs — currently all in-memory)
- Auth/session handoff from moxproxies-website
- An API layer in front of `services/render` (it's currently a bare
  render endpoint, no auth, no storage of results)
- Font upload/custom fonts (properties panel offers a fixed list of
  system fonts today)
- Deploy config for either app
