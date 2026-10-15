# 3D Tile Content Inspector

Browser-based tool that parses and inspects 3D Tiles formats: `.pnts`, `.b3dm`, `.i3dm`, `.cmpt`, `.glb`, and `.drc` (Draco).

## Setup

```bash
git submodule update --init --recursive
```

The Draco decoder submodule (`src/thirdParty/draco`) must be initialized before the app or tests can work. Without it, Draco-compressed files will fail to decode.

## Dev Server

No build step. Serve directly:

```bash
npx http-server
```

Open `http://127.0.0.1:8080/src`.

## Testing

Tests require a **manually started** dev server at port 5504 (hardcoded in `tests/app.spec.js`):

```bash
npx http-server -p 5504 &
npx playwright test
```

The `webServer` config in `playwright.config.js` is commented out — don't rely on it.

- `npm test` installs Playwright browsers before running tests; use `npx playwright test` directly if browsers are already installed.
- `fullyParallel: false` in Playwright config; tests run sequentially.
- CI retries: 2 (local: 0). `forbidOnly` in CI.
- Browsers: chromium, firefox, Mobile Chrome (webkit and Safari commented out).
- Test fixture dirs: `tests/Cesium3DTiles/`, `tests/glb/`, `tests/draco/`.

Run a single test:

```bash
npx playwright test -g "can inspect b3dm"
```

View report:

```bash
npm run show-test-report
```

## Architecture

- **Entrypoint**: `src/index.html` + `src/index.js` (ES module via `<script type="module">`)
- **Core logic**: `src/inspect.js` — dispatches parsing by file magic bytes (`pnts`, `cmpt`, `b3dm`, `i3dm`, `glTF`, `DRACO`)
- **Parsers**: `src/parse{B3dm,Cmpt,Glb,I3dm,Pnts,Draco,FeatureTableOrBatchTable}.js`
- **Hex viewer**: `src/hexDump.js` runs as a Web Worker; `src/constructHexViewer.js` renders output
- **Draco decoding**: WASM-based, loaded via `src/loadDracoDecoder.js`
- **UI**: CodeMirror (bundled in `src/thirdParty/codemirror-5.59.4`) for JSON display; drag-and-drop or file picker input

No bundler, no transpiler — all source runs directly in the browser as ES modules.

## Key Gotchas

- `playwright.config.js` uses CJS (`require`/`module.exports`), but the app itself uses ESM (`import`/`export`). Don't mix styles.
- Feature table display caps at 100 records; hex viewer caps at 512 KiB (see note in `index.html`).
- `npm run build` does not exist; CI has `--if-present` so it skips cleanly.