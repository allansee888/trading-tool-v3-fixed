<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/15a181e9-c694-42a0-a9ce-c3143eda0592

## Run Locally

**Prerequisites:** Node.js 18 or later (Vite 6, tsx, and the Alpaca API routes require Node 18+). On Windows, use the official installer or [nvm-windows](https://github.com/coreybutler/nvm-windows).

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
