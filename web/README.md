# TuskPoint — Web

The marketing-grade **UI showcase + interactive demo dashboard** for TuskPoint
(the Walrus-backed LangGraph checkpointer + MCP server in the repo root).

> **Demo only.** This site stores **no secrets** and makes **no live network
> calls**. The dashboard runs on baked-in sample data that mirrors a real
> researcher→writer run. The actual engine lives in the Python package at the
> repo root.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **Tailwind CSS** (custom dark "walrus-deep" theme)
- 100% static export — deploys to Vercel with zero config

## Pages

| Route        | What's there                                                            |
|--------------|-------------------------------------------------------------------------|
| `/`          | Hero, the 6-tool directory (searchable/filterable), architecture, flow  |
| `/dashboard` | Inspect checkpoints, diff two states, semantic-search the run history   |
| `/docs`      | Quick start, tool reference, MCP registration, exact-vs-semantic design |

## Develop

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build    # static, prerendered output
npm start        # serve the production build
```

## Deploy to Vercel

Set the project **Root Directory** to `web/` in the Vercel dashboard (or via
the CLI), since the Next app is a subfolder of the Python repo. Framework
preset: **Next.js**. No environment variables are required.

See `DEPLOY.md` in the repo root for full step-by-step instructions.
