# Twin Taskboard – React 19 build

Self-contained React 19 + TypeScript + Vite implementation of the Twin Taskboard.
It implements every requirement in [../REQUIREMENTS.md](../REQUIREMENTS.md);
see the [root README](../README.md) for the overview and the parity approach.

| Command | Purpose |
| ------- | ------- |
| `npm ci` | Install pinned dependencies from `package-lock.json` |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Strict type-check (`tsc`) and production bundle in `dist/` |
| `npm run preview` | Serve `dist/` on http://localhost:4173 |
| `npm test` | Vitest unit + component tests (jsdom) |
| `npm run typecheck` | Type-check only |

Requires Node.js 22.22+ or 24.15+.
