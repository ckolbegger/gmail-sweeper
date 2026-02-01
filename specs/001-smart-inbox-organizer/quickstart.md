# Quickstart: Smart Inbox Organizer

## Prerequisites

- **Node.js**: v20+
- **Google Cloud Console Project**:
    - Gmail API enabled
    - OAuth2 Credentials (Client ID/Secret) downloaded to `credentials.json`
- **Gemini API Key**: Exported as `GEMINI_API_KEY`

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. **Credentials**: Place your `credentials.json` (from Google Cloud Console) in the project root (added to `.gitignore`).
2. **Env Vars**: Create a `.env` file:
   ```bash
   GEMINI_API_KEY=your_key_here
   ```

## Running the App

### Development Mode
Runs the TUI with hot-reloading (via Ink):

```bash
npm run dev
```

### Production Build
Builds the TypeScript code and runs the CLI:

```bash
npm run build
npm start
```

## First Run

1. The app will open a browser window to authenticate with Google.
2. Grant the requested permissions.
3. The TUI will load your Inbox.

## Usage Guide

- **Navigation**: Up/Down arrows to move selection.
- **View**: `Enter` to open an email. `Esc` to go back.
- **Filter**: Press `/` to type a natural language query (e.g., "Show me bills").
- **Actions**:
    - `a`: Archive selected (requires confirmation)
    - `d`: Delete selected (requires confirmation)
    - `l`: Label selected
- **Workflows**:
    - `s`: Save current filter as Workflow.
    - `w`: View saved workflows.
