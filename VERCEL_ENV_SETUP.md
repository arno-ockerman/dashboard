# Vercel Environment Variables Setup

To connect the Vercel dashboard to the TrueNAS Express server (via Cloudflare tunnel), set the following environment variables in the Vercel dashboard:

## Settings → Environment Variables

| Variable | Value |
|---|---|
| `WORKSPACE_API_URL` | `https://dashboard.beinspiredbyus.be` |
| `WORKSPACE_API_KEY` | `jarvis-workspace-key` |

## Steps

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Open your project → **Settings** → **Environment Variables**
3. Add `WORKSPACE_API_URL` = `https://dashboard.beinspiredbyus.be`
4. Add `WORKSPACE_API_KEY` = `jarvis-workspace-key`
5. Redeploy (or it will pick up on the next push)

## What these do

- `WORKSPACE_API_URL` — The Cloudflare tunnel URL pointing to the TrueNAS Express server (`agency/server.js`) running at port 3333
- `WORKSPACE_API_KEY` — The Bearer token used by the files browser to authenticate with the workspace API

## Notes

- The Express server reads `WORKSPACE_API_KEY` from its own environment (set this on TrueNAS too if it differs)
- Default on the server side: `jarvis-workspace-key`
- The files API endpoint on the server is: `GET/POST /api/workspace/files`
