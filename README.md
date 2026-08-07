# Card Studio

A standalone card-design tool — mix and match frames, custom text, and
free-floating elements to build custom trading-card designs. Think
[Card Conjurer](https://github.com/Investigamer/cardconjurer) crossed
with Canva. Maintained as its own repo/deploy so it can evolve
independently of [moxproxies-website](https://github.com/moxproxies/moxproxies-website),
and "injected" into that site rather than merged into its codebase.

## Status

Early scaffold. The pieces below are wired together and verified working
end-to-end (typecheck, build, and a real render smoke test), but the
editor only has placeholder frame art and no persistence/auth yet — see
[Not built yet](#not-built-yet).

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

## Design decisions

**Scene JSON is DPI-independent (millimeters, not pixels).** A `Design`
is a background color plus an ordered list of `Layer`s (`frame`,
`image`, `text`, `shape`), each positioned in mm from the card's
bleed-corner. The editor draws that same JSON on a screen-resolution
Konva canvas (`EDITOR_DPI = 150`, see `apps/editor/src/geometry.ts`);
the render service draws the *same* JSON at print resolution. Nothing
is ever rasterized then scaled up — that's what keeps a 63×88mm card
crisp at 800 DPI (1984×2772px) for actual print fulfillment, which is
what this needs to feed. See `packages/scene-schema/src/schema.ts` and
`services/render/src/renderDesign.ts`.

**Frame/asset library doesn't exist yet.** `FrameLayer` already has the
shape it needs (`assetId` + optional `tint`), but there's no asset
storage or catalog behind it — both the editor and the render service
currently draw frame layers as a flat tinted rect as a placeholder.
Wiring `assetId` to real frame artwork (upload, catalog, versioning) is
the next real chunk of work, not a redesign.

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

- Frame/template asset library (upload, catalog, `assetId` resolution)
- Persistence (saving/loading designs — currently all in-memory)
- Auth/session handoff from moxproxies-website
- An API layer in front of `services/render` (it's currently a bare
  render endpoint, no auth, no storage of results)
- Undo/redo, multi-select, alignment guides, font picker/upload
- Deploy config for either app
