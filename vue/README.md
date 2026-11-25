# Twin Taskboard – Vue 3 build

Self-contained Vue 3 + TypeScript + Vite implementation of the Twin Taskboard.
It implements every requirement in [../REQUIREMENTS.md](../REQUIREMENTS.md);
see the [root README](../README.md) for the overview and the parity approach.

| Command | Purpose |
| ------- | ------- |
| `npm ci` | Install pinned dependencies from `package-lock.json` |
| `npm run dev` | Dev server on http://localhost:5174 |
| `npm run build` | Strict type-check (`vue-tsc`) and production bundle in `dist/` |
| `npm run preview` | Serve `dist/` on http://localhost:4174 |
| `npm test` | Vitest unit + component tests (jsdom) |
| `npm run typecheck` | Type-check only |

Requires Node.js 22.22+ or 24.15+.
