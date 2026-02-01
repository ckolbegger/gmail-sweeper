# Audit: T015 [US1] Implement listEmails

- [x] it should fetch emails with pagination tokens
- [x] it should respect maxResults parameter (boundary: 1 to 500)
- [x] it should sort emails by internalDate
- [x] it should map Gmail API response to Email domain model
- [x] it should handle API errors gracefully (401, 403, 429, 500)
- [x] it should correctly construct the query string (e.g., "label:INBOX")
- [x] it should return empty list if API returns no messages (boundary)
- [x] it should handle invalid/expired page tokens gracefully
