# AgentForge

> AI-powered full-stack app builder. Describe your app → agents generate the codebase → preview → deploy.

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/eugenemcmillian24-debug/agent-forge)

## Features

- **Chat to build** — Describe your app in plain English, agents generate the full codebase
- **12 specialized agents** — Orchestrator, Product Manager, Architect, UI/UX, Frontend, Backend, Database, AI Integration, GitHub, Cloudflare, QA, Repair
- **5 AI providers** — GitHub Models (free tier), Mistral (Codestral), Groq (fast repair), OpenRouter, HuggingFace
- **Live code editor** — Browse, edit, and save any generated file
- **Agent timeline** — Watch every agent task in real time with provider/model/token details
- **GitHub push** — One click to create a repo and push all files
- **Cloudflare deploy** — Auto-detect Pages vs Workers, generate wrangler config
- **ZIP export** — Download project with manifest, setup docs, and .env.example
- **Version history** — Every generation creates a rollback snapshot

## Quick Start

```bash
git clone https://github.com/eugenemcmillian24-debug/agent-forge
cd agent-forge
npm install
cp .env.example .env.local
# Fill in .env.local with your credentials
npm run dev
```

## Minimum Setup (Free Tier)

You only need **two** credentials to start:

1. Supabase project (`NEXT_PUBLIC_SUPABASE_URL` + keys)
2. `GITHUB_MODELS_TOKEN` — GitHub PAT with `models:read` permission

## Database Setup

Apply migrations to your Supabase project:

**Option A — SQL Editor** (easiest):
1. Open your Supabase project → SQL Editor
2. Paste and run `supabase/migrations/COMBINED_RUN_IN_SQL_EDITOR.sql`

**Option B — Supabase CLI**:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GITHUB_MODELS_TOKEN=ghp_your_token   # models:read permission
GITHUB_TOKEN=ghp_your_token          # repo scope for pushes
OPENROUTER_API_KEY=sk-or-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
HUGGINGFACE_TOKEN=hf_...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
ENCRYPTION_KEY=your-32-char-secret
```

## Model Routing

| Agent | Primary | Fallback |
|---|---|---|
| Orchestrator | gpt-4.1-mini (GitHub) | deepseek-v3 (GitHub) |
| Architecture | deepseek-v3 (GitHub) | mistral-medium (Mistral) |
| Frontend code | codestral-latest (Mistral) | codestral-25.01 (GitHub) |
| Backend code | mistral-medium (Mistral) | codestral-latest (Mistral) |
| QA + Repair | llama-3.3-70b-versatile (Groq) | qwen3-32b (Groq) |
| Docs + Export | phi-4 (GitHub) | HuggingFace dynamic |

## Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy .next --project-name=agentforge
```

Or push to `main` — GitHub Actions deploys automatically.

## Tech Stack

Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Zod · Zustand · Octokit · JSZip · Vitest

## License

MIT
