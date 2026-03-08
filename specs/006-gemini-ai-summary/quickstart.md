# Quickstart: AI Summary

This feature adds AI-powered email summarization to the CLI.

## Testing the Feature

1. **Configure AI Provider**: Ensure you have an AI provider configured in your environment variables, as this feature reuses the existing `AiProvider` abstraction.
   ```bash
   export AI_PROVIDER=gemini # or openai, anthropic
   export AI_MODEL=gemini-2.5-flash
   export AI_API_KEY=your_api_key
   ```

2. **Run the Application**:
   ```bash
   npm start
   ```

3. **Navigate and Summarize**:
   - Use the arrow keys to select an email in the list.
   - Press `Enter` to open the detail view (if not already focused).
   - Press the `s` key. You should see a loading indicator.
   - Once complete, the view will switch to show a one-sentence description and a bulleted list of action items.
   - Press the `s` key again to return to the full email view.

4. **Verify Persistence**:
   - Select a different email, then select the summarized email again.
   - Press `s`. The summary should appear instantly without a loading delay.
   - Check the `~/.config/gmail-sweep/summaries.json` file to verify the data was saved.
