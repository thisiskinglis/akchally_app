# Akchally — Voice-Active Kitchen Assistant
> Domain: akchally.com | PWA + Android + AI Backend

Susan says: "I've got 2 eggs, flour, yoghurt, spice, pork bangers, tomatoes, onions and potatoes, tonight I'm not in a rush, what can I make?"

Akchally listens, suggests recipes from what you *actually* have, speaks them to you, and stays on standby while you cook.

### Stack
- **Frontend**: Vite + React + Tailwind — Responsive PWA with Web Speech API (STT + TTS)
- **Backend**: Node / Express — AI engine (OpenAI / Gemini) with recipe generation + cooking Q&A
- **Android**: Trusted Web Activity (TWA) via Bubblewrap + optional native WebView Kotlin
- **Deploy**: GitHub Pages / Vercel → akchally.com (custom domain)

### Quick Start
```bash
git clone https://github.com/YOURUSERNAME/akchally.git
cd akchally
# frontend
cd frontend && npm install && npm run dev
# backend (in new terminal)
cd backend && npm install && npm run dev
```

See /frontend, /backend, /android for detailed READMEs.