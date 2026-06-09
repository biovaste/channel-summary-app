# Marketing Insights Generator

Paste or upload marketing data in any format (CSV, raw text, JSON). The app cleans it and generates 2–3 CMO-level insights using Google Gemini.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# Add your Gemini API key to .env.local
npm run dev
```

Get a free Gemini API key at https://aistudio.google.com/app/apikey

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy

No database, no auth, no paid services required.
