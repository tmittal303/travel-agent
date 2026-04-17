<<<<<<< HEAD
# travel-agent
=======
# Travel Agent — Agentic Last-Minute Deal Finder

Intent-driven travel search powered by Claude as an agentic orchestrator.

## How it works

User types freeform intent → Claude calls 4 tools in sequence/parallel → real API data → ranked deal cards.

```
User intent
  → Claude: parse_intent (extracts dates, budget, vibe, candidates)
  → Claude: get_drive_times + search_flights + search_hotels (parallel)
  → Claude: ranks results, writes highlight copy
  → Deal cards with real prices and booking links
```

## Setup

### 1. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Add API keys
\`\`\`bash
cp .env.example .env.local
\`\`\`

Fill in `.env.local`:

| Key | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `GOOGLE_MAPS_KEY` | console.cloud.google.com → enable Routes API |
| `KIWI_API_KEY` | tequila.kiwi.com → sign up free |
| `AMADEUS_CLIENT_ID` | developers.amadeus.com → sandbox is free |
| `AMADEUS_CLIENT_SECRET` | same as above |

> **Missing keys?** The app works without them — each executor falls back to mock data so you can develop and test the agentic flow without real API keys.

### 3. Run
\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000

## Project structure

\`\`\`
src/
├── app/
│   ├── api/search/route.ts   # POST /api/search — entry point
│   ├── page.tsx              # UI
│   └── layout.tsx
└── lib/
    ├── agent.ts              # Agentic loop (the core)
    └── tools/
        ├── definitions.ts    # Tool schemas Claude sees
        └── executors.ts      # Real API calls
\`\`\`

## Adding a new tool

1. Add tool definition to `src/lib/tools/definitions.ts`
2. Add executor function to `src/lib/tools/executors.ts`
3. Add case to `executeTool()` in `src/lib/agent.ts`
4. Update the system prompt to tell Claude when to use it

That's it — Claude will use it automatically when relevant.

## Deploy to Vercel

\`\`\`bash
npx vercel
\`\`\`

Add your env vars in Vercel dashboard → Project Settings → Environment Variables.
\`\`\`
>>>>>>> d370626 (Initial commit)
