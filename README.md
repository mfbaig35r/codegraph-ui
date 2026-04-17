# codegraph-ui

Cyberpunk-themed interactive code graph visualizer. The visual layer for [codegraph](https://github.com/mfbaig35r/codegraph) — loads exported JSON and renders a force-directed graph with filtering, search, and detail panels.

## Screenshot

Upload a codegraph JSON export and explore your Python codebase as an interactive graph. Nodes are colored by type (cyan=module, magenta=class, green=function, purple=method), edges by relationship (cyan=calls, yellow=imports, red=inherits, magenta=decorates).

## Quick Start

```bash
git clone https://github.com/mfbaig35r/codegraph-ui.git
cd codegraph-ui
npm install
npm run dev
```

Open http://localhost:3000 and upload a codegraph JSON file.

## Getting a Graph File

Use the [codegraph](https://github.com/mfbaig35r/codegraph) CLI:

```bash
pip install "codegraph[llm]"
codegraph enrich /path/to/your/python/repo
codegraph export <repo_id> -o graph.json
```

Then upload `graph.json` in the UI.

## Features

- **Force-directed graph** powered by `react-force-graph-2d` with canvas rendering
- **Node type filtering** — toggle modules, classes, functions, methods, externals
- **Edge type filtering** — toggle contains, imports, calls, inherits, decorates
- **Tooltips** — hover over filter buttons for explanations
- **Search** — find nodes by name, auto-zoom to result
- **Detail panel** — click a node to see ID, file, line, docstring, parameters, decorators, base classes, and all connections
- **Highlight propagation** — selected node highlights all connected neighbors
- **Neon glow** — selected nodes get a cyberpunk glow halo
- **Node shapes** — classes render as hexagons, everything else as circles
- **Collapsible node table** — sortable list of all visible nodes
- **Color legend** — node type and edge type color reference
- **Zoom controls** — zoom in/out/fit-to-view

## Cyberpunk Color Scheme

### Nodes
| Type | Color |
|------|-------|
| Module | Cyan `#00f0ff` |
| Class | Magenta `#ff00ff` |
| Function | Electric Green `#39ff14` |
| Method | Purple `#bf5fff` |
| External | Dim Gray `#555555` |

### Edges
| Type | Color |
|------|-------|
| Contains | Dark Gray `#333333` |
| Imports | Yellow `#facc15` |
| Calls | Cyan `#00f0ff` |
| Inherits | Red `#ef4444` |
| Decorates | Magenta `#ff00ff` |

## Tech Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS 4
- react-force-graph-2d
- Lucide icons
- No backend — client-side JSON loading only

## Development

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # Production build
```
