# Quickstart: Smart Inbox Organizer

**Date**: 2026-02-01 | **Branch**: `claude`

## Prerequisites

- Node.js 20 or higher
- npm or pnpm
- Google Cloud project with Gmail API enabled
- Gmail account
- LLM API key (Anthropic Claude or Google Gemini)

---

## Installation

```bash
# Clone repository
git clone https://github.com/ckolbegger/gmail-sweeper.git
cd gmail-sweeper

# Install dependencies
npm install

# Build the project
npm run build
```

---

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the Gmail API:
   - Navigate to **APIs & Services > Library**
   - Search for "Gmail API"
   - Click **Enable**
4. Create OAuth credentials:
   - Navigate to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Select **Desktop app**
   - Download the JSON file
5. Save credentials:
   ```bash
   mkdir -p ~/.config/gmail-sweep
   mv ~/Downloads/client_secret_*.json ~/.config/gmail-sweep/credentials.json
   ```

---

## LLM API Setup

### Option A: Anthropic Claude (Recommended)

1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Set environment variable:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

### Option B: Google Gemini

1. Get API key from [Google AI Studio](https://aistudio.google.com/)
2. Set environment variable:
   ```bash
   export GOOGLE_API_KEY="..."
   ```
3. Configure in `~/.config/gmail-sweep/config.json`:
   ```json
   {
     "llmProvider": "gemini"
   }
   ```

---

## First Run

```bash
# Start the TUI with your Gmail account
npx gmail-sweep user@gmail.com

# Or if installed globally
gmail-sweep user@gmail.com
```

On first run:
1. Browser opens for Google OAuth consent
2. Grant "read, compose, send, and permanently delete" permissions
3. TUI loads with your inbox

---

## Running the Web App (Future)

```bash
# Start the web server (single process: API + frontend)
npm run web

# Open http://localhost:3000 in your browser
```

---

## Basic Usage

### Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Enter` | View email / Execute action |
| `Space` | Toggle selection |
| `Ctrl+A` | Select all |
| `?` | Show help |
| `q` | Quit |

### Sorting & Filtering

| Key | Action |
|-----|--------|
| `s` | Open sort menu |
| `f` | Open filter menu |
| `/` | Natural language search |
| `Esc` | Clear search/filter |

### Actions

| Key | Action |
|-----|--------|
| `l` | Apply label |
| `a` | Archive selected |
| `d` | Delete selected (move to trash) |

### Natural Language Search

Press `/` and type a query:

```
Find all emails that are financial offers
```

```
Find emails about upcoming events
```

```
Find newsletter emails from this week
```

Press `Enter` to execute. Press `Esc` to clear and return to full inbox.

---

## Configuration

Edit `~/.config/gmail-sweep/config.json`:

```json
{
  "gmailAccount": "user@gmail.com",
  "initialLoadSize": 50,
  "llmProvider": "claude",
  "llmApiKeyEnv": "ANTHROPIC_API_KEY",
  "theme": "default",
  "confirmDestructive": true
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `initialLoadSize` | Emails to load on start | 50 |
| `llmProvider` | "claude" or "gemini" | "claude" |
| `llmApiKeyEnv` | Env var for LLM API key | "ANTHROPIC_API_KEY" |
| `theme` | TUI color theme | "default" |
| `confirmDestructive` | Confirm archive/delete | true |

---

## Development

```bash
# Run in development mode (with hot reload)
npm run dev user@gmail.com

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Troubleshooting

### OAuth Error: "Access blocked"

Your Google Cloud project may need verification. For personal use:
1. Add your email as a test user in Google Cloud Console
2. Navigate to **OAuth consent screen > Test users**
3. Add your Gmail address

### Rate Limit Errors

Gmail API has quotas. If you see rate limit errors:
1. Wait a few minutes before retrying
2. Reduce `initialLoadSize` in config
3. Check [Google Cloud Console quotas](https://console.cloud.google.com/apis/dashboard)

### LLM Classification Slow

If natural language search takes >10 seconds:
1. Reduce the number of emails scanned (use filters first)
2. Try switching to Gemini (faster than Claude for classification)
3. Check your internet connection

### Node.js Version

Ensure you're using Node.js 20+:
```bash
node --version  # Should be v20.x.x or higher
```

If not, use nvm to install:
```bash
nvm install 20
nvm use 20
```

---

## Uninstall

```bash
# Remove configuration
rm -rf ~/.config/gmail-sweep

# Revoke OAuth access
# Visit https://myaccount.google.com/permissions
# Find "gmail-sweep" and remove access
```

---

## Next Steps

- [User Guide](./docs/user-guide.md) - Detailed feature documentation
- [Saved Queries](./docs/saved-queries.md) - Automate recurring searches (TUI Fast Follow)
- [Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions
