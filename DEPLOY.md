# Deploying TuskPoint

This repo has two parts:

- **Python package** (root) — the `WalrusSaver` engine + MCP server. Runs locally.
- **`web/`** — a Next.js UI showcase + interactive demo dashboard. Deploys to Vercel.

The steps below get the code onto GitHub (repo **`tuskpoint`**) and the site live
on Vercel. **I've already initialized git and committed locally** — you just
push and deploy. No secrets are in the repo (`.env` is git-ignored).

---

## 1. Push to GitHub

### Option A — GitHub CLI (if you install it)

```bash
# one-time: winget install GitHub.cli   (then: gh auth login)
cd C:/Users/User/Documents/tuskpoint
gh repo create tuskpoint --public --source=. --remote=origin --push
```

### Option B — GitHub website + git (no extra tools)

1. Go to <https://github.com/new>.
2. Repository name: **`tuskpoint`**. Visibility: your choice. **Do NOT** check
   "Add a README / .gitignore / license" (the repo already has them).
3. Click **Create repository**.
4. Back in your terminal:

```bash
cd C:/Users/User/Documents/tuskpoint
git branch -M main
git remote add origin https://github.com/<your-username>/tuskpoint.git
git push -u origin main
```

If prompted to authenticate, use your GitHub username + a **Personal Access
Token** (Settings → Developer settings → Tokens) as the password, or sign in via
the browser popup.

---

## 2. Deploy the web app to Vercel

The Next.js app lives in the **`web/`** subfolder, so Vercel must be told that.

### Option A — Vercel dashboard (recommended, no CLI)

1. Go to <https://vercel.com/new> and sign in with GitHub.
2. **Import** the `tuskpoint` repository.
3. In the configuration screen, set:
   - **Root Directory** → `web`
   - **Framework Preset** → Next.js (auto-detected)
   - **Build Command** / **Output** → leave defaults
   - **Environment Variables** → none needed
4. Click **Deploy**. You'll get a live `https://tuskpoint-<hash>.vercel.app` URL
   in ~1 minute.

### Option B — Vercel CLI

```bash
# one-time: npm i -g vercel   (then: vercel login)
cd C:/Users/User/Documents/tuskpoint/web
vercel            # first run: link/create project, accept defaults
vercel --prod     # promote to production
```

When the CLI asks "In which directory is your code located?", answer `./`
(you're already inside `web/`).

---

## 3. After deploy

- Every `git push` to `main` auto-deploys a new production build.
- To set a custom domain: Vercel project → **Settings → Domains**.
- The site is fully static — no server, no secrets, no runtime cost.

---

## Notes & safety

- **Nothing secret ships.** `.env`, `.walrus_threads.json`, `node_modules/`, and
  `.next/` are all git-ignored. The dashboard uses baked-in sample data only.
- The Python engine is **not** deployed to Vercel (Vercel is serverless and the
  engine signs Walrus/MemWal operations with your private key — that stays
  local, by design).
- I (the assistant) don't create your GitHub repo or run the deploy for you,
  because those need your account login. The commands above are yours to run.
