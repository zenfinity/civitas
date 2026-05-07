# Civitas

A local-first civic contact tool for Portland-area residents. Look up your full matrix of elected officials, select issues you care about, generate AI-drafted scripts, and track your contacts — all without your data leaving your browser.

## Features

- **Address lookup** — finds federal, state, metro, county, city, school, and special district representatives for any Portland-area address
- **Issue selection** — preset issues (housing, transit, climate, public safety, and more) with pre-generated script templates for each channel and tone
- **Script generation** — instant templates for preset issues; on-demand Mistral AI drafts for custom issues
- **Multi-channel** — phone scripts, emails, formal letters, fax messages, and web form text
- **Local-first** — all data lives in sessionStorage; export/import encrypted `.cvts` files (AES-256-GCM) to save sessions across devices
- **No account required**

## Tech stack

- [SvelteKit](https://kit.svelte.dev/) — framework
- [Neon](https://neon.tech/) — serverless Postgres with PostGIS for district lookups
- [Mistral AI](https://mistral.ai/) — on-demand script generation fallback
- [Vercel](https://vercel.com/) — hosting

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon connection string |
| `GOOGLE_CIVIC_API_KEY` | No | Google Civic Information API |
| `CICERO_API_KEY` | No | Cicero API for rep data |
| `MISTRAL_AI_API_KEY` | Yes | Mistral AI for script generation |
| `GITHUB_TOKEN` | Yes | GitHub PAT (`public_repo` scope) for feedback submissions |

## Feedback

Use the in-app feedback button or [open an issue](https://github.com/zenfinity/civitas/issues) directly.
