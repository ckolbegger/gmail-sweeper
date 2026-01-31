# Quickstart: Smart Inbox Organizer

## Prerequisites
- Node.js 20+ (LTS)
- npm or pnpm
- Google Cloud Project with Gmail API enabled
- `credentials.json` (OAuth Client ID)
- Gemini API Key

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file:
   ```env
   GEMINI_API_KEY="your-key-here"
   OPENAI_API_KEY="optional-key"
   ```

3. **Google Auth**:
   Place your `credentials.json` in the project root.

## Running the App

```bash
# Launch the TUI
npm start

# Run in dev mode (watch)
npm run dev
```

## Running Tests

```bash
# Run all tests
npm test

# Run with UI preview
npm run test:ui
```