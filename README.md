# 3D tile content inspector

[3D tile content](https://github.com/CesiumGS/3d-tiles/blob/master/specification/README.md#tile-format-specifications) inspector.

[![screenshot.png](docs/screenshot.png)](https://3d-tile-content-inspector.vercel.app/)

## Supported formats

- [x] .pnts
- [x] .b3dm
- [x] .i3dm
- [x] .cmpt
- [x] .glb
- [x] draco

## Features

- Colour-coded hex viewer: headers, feature/batch tables and glTF chunks are highlighted, with a legend to jump to each section.
- Click a field such as `featureTableJson` or `glb` in the JSON view to reveal its bytes.
- Sample files on the start screen (see `src/samples/README.md` for sources and licenses).
- Files are parsed locally in the browser and never uploaded.

## Dependencies

- Draco
- codemirror-5.59.4

See `src/thirdParty`.

## Development

Update submodule:

```bash
git submodule update --init --recursive
```

Lift development server:

```
npx http-server
```

Open `http://127.0.0.1:8080/src`.
