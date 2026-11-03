# Saqo Travel

Saqo Travel is a static travel marketplace prototype. Tour and flight examples are loaded from JSON files in `data/`.

## Run locally

```sh
npm install
npm run dev
```

## Render Static Site deployment

Create a **Static Site** connected to this repository and select branch `fix/render-static-build` to preview these fixes.

- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`

The build validates the HTML, CSS, JavaScript and JSON data files, then copies the static website into `dist/`. No server-side runtime is required for this static build.

> Flight listings are currently demo data. Do not present their prices or schedules as live airline inventory.
