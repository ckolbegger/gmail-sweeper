# Quickstart: Clean Email Rendering

## Testing the Changes

1. **Build the application**:
   Ensure dependencies (`open`, `clipboardy`) are installed.
   ```bash
   npm install open clipboardy
   npm run build
   ```

2. **Run the TUI**:
   ```bash
   npm run dev
   ```

3. **Verify Blank Line Collapsing**:
   - Find an email with excessive whitespace.
   - Select it.
   - Verify the detail pane shows no more than 2 consecutive blank lines.

4. **Verify Link Shortening & Interactivity**:
   - Find an email with a long URL.
   - Verify it is truncated or replaced by link text, taking up no more than 50% of the detail pane width.
   - Scroll the detail pane. Verify the link closest to the top becomes highlighted in Cyan.
   - Press `Tab` to cycle focus between multiple links.
   - Press `Enter` to open the highlighted link in your browser.
   - Press `c` to copy the highlighted link to your clipboard.
