# Quickstart Guide: Gmail Sweep

Get up and running with Gmail Sweep in under 5 minutes.

---

## Installation

### Option 1: Download Pre-built Binary

```bash
# Download latest release from GitHub Releases
curl -L -o gmail-sweep https://github.com/yourorg/gmail-sweep/releases/latest/download/gmail-sweep-linux-x64
chmod +x gmail-sweep
sudo mv gmail-sweep /usr/local/bin/
```

### Option 2: Install via npm

```bash
npm install -g gmail-sweep
```

### Option 3: Build from Source

```bash
git clone https://github.com/yourorg/gmail-sweep.git
cd gmail-sweep
npm install
npm run build
npm run compile
# Binary will be at ./dist/gmail-sweep
```

---

## First-Time Setup

### 1. Authenticate with Gmail

```bash
gmail-sweep auth
```

This will:
1. Open your browser to Google's OAuth2 consent screen
2. Request permission to read and modify your Gmail
3. Store credentials securely in your OS keyring

**Required OAuth Scopes:**
- `gmail.readonly` - Read emails
- `gmail.modify` - Archive, delete, modify labels
- `gmail.labels` - Create and manage labels

### 2. Run Initial Sync

```bash
gmail-sweep sync
```

This downloads your email metadata (subjects, senders, dates, labels) to local SQLite storage. Full content is fetched on-demand when viewing emails.

**Progress indicators:**
- Shows batch progress (e.g., "Batch 5/50: 500 emails synced")
- Typical sync time: 2-5 minutes for 10K emails

---

## Daily Usage

### Launch the TUI

```bash
gmail-sweep
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate email list |
| `Enter` | View email details |
| `Space` | Select/deselect email |
| `a` | Select all visible emails |
| `/` | Focus search box |
| `n` | New natural language query |
| `s` | Sort options (date/sender/label) |
| `f` | Filter options |
| `l` | Apply label to selected |
| `e` | Archive selected |
| `d` | Delete selected |
| `r` | Refresh/sync new emails |
| `w` | Save current query as workflow |
| `W` | View saved workflows |
| `?` | Show help |
| `q` | Quit |

### Natural Language Queries

Press `n` to open the natural language prompt:

```
Query: financial offers
```

Results update instantly showing emails matching your description.

**Example Queries:**
- "promotions for online events"
- "unread newsletters from trading sites"
- "emails about password resets"
- "invoices from last month"

### Creating Workflows

1. Run a natural language query
2. Select emails (or leave unselected for auto-match)
3. Press `w` to save workflow
4. Choose an action:
   - Label (select or create label)
   - Archive
   - Delete
5. Give your workflow a name

**Auto-run on new emails:**
- Workflows are enabled by default
- On startup, you'll be prompted to run workflows against new emails
- Press `W` to manage workflows (enable/disable, reorder)

---

## Commands

### CLI Commands

```bash
# Authenticate (one-time setup)
gmail-sweep auth

# Full sync of all emails
gmail-sweep sync

# Quick sync (incremental, default on launch)
gmail-sweep sync --incremental

# Run specific workflow
gmail-sweep workflow run "Newsletter Cleanup"

# Run all enabled workflows
gmail-sweep workflow run-all

# List workflows
gmail-sweep workflow list

# Enable/disable workflow
gmail-sweep workflow enable "Workflow Name"
gmail-sweep workflow disable "Workflow Name"

# Export data
gmail-sweep export --format json --output backup.json

# Show version
gmail-sweep --version

# Show help
gmail-sweep --help
gmail-sweep help sync
```

---

## Configuration

Configuration file: `~/.config/gmail-sweep/config.json`

```json
{
  "ollama": {
    "url": "http://localhost:11434",
    "model": "qwen2.5:7b"
  },
  "sync": {
    "batchSize": 100,
    "autoSyncOnStart": true
  },
  "ui": {
    "theme": "dark",
    "dateFormat": "YYYY-MM-DD",
    "compactMode": false
  },
  "workflows": {
    "confirmDestructive": true,
    "maxEmailsPerRun": 1000
  }
}
```

---

## Troubleshooting

### "Ollama connection refused"

The natural language feature requires Ollama running locally:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the recommended model
ollama pull qwen2.5:7b

# Start Ollama server
ollama serve
```

### "Rate limit exceeded"

Gmail API has quota limits. The app automatically handles rate limiting with exponential backoff. If you hit limits:
- Wait a few minutes
- Reduce `sync.batchSize` in config
- Use `--incremental` sync instead of full sync

### "Authentication expired"

Run `gmail-sweep auth` again to refresh tokens.

### Emails not appearing

1. Check sync status: `gmail-sweep sync --status`
2. Force refresh: Press `r` in TUI or run `gmail-sweep sync`
3. Check filters aren't hiding emails: Press `f` to clear filters

---

## Data Storage

All data is stored locally:

| Location | Contents |
|----------|----------|
| `~/.local/share/gmail-sweep/emails.db` | SQLite database (email metadata) |
| `~/.config/gmail-sweep/config.json` | User preferences |
| OS keyring | OAuth2 tokens (secure) |

**Privacy:** No data leaves your machine except Gmail API calls.

---

## Next Steps

- Browse your inbox: `gmail-sweep`
- Try natural language search: Press `n`, type "financial offers"
- Create your first workflow: Search → Select → Press `w`
- Read full docs: [docs/architecture.md](../../docs/architecture.md)

---

## Keyboard Shortcuts Reference

### Navigation
- `j` / `k` - Down / Up (vim-style)
- `g` / `G` - Go to top / bottom
- `Ctrl+f` / `Ctrl+b` - Page down / up

### Selection
- `Space` - Toggle selection
- `a` - Select all
- `c` - Clear selection
- `* n` - Select all matches

### Actions
- `l` - Label
- `e` - Archive
- `d` - Delete
- `m` - Mark read/unread
- `!` - Report spam

### Views
- `Enter` - Open email
- `v` - Toggle preview pane
- `tab` - Switch focus

Press `?` in-app for complete reference.
