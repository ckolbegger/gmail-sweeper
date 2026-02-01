# Audit: T020 [US1] Add CLI flag parsing for page size override

- [x] it should parse --limit flag from process.argv (Implemented in index.tsx)
- [x] it should use the parsed limit in the useGmail hook/service call (Passed via App limit prop)
- [x] it should default to 10 if flag is missing
- [x] it should handle invalid limit values gracefully (NaN check in index.tsx)
