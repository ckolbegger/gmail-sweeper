# Tasks: Email Detail Rendering Improvements

**Input**: Design documents from /specs/003-minimax-email-detail-rendering/
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Verify project dependencies (React 18, Ink 4, Vitest) are installed via package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 [P] Create src/core/rendering/ directory structure
- [x] T003 [P] Create src/core/rendering/index.ts with module exports
- [x] T004 Implement blank-lines.ts with collapseBlankLines() function - write tests first
- [x] T005 Implement url-parser.ts with URL detection regex and parseUrls() function - write tests first
- [x] T006 Implement text-truncator.ts with calculateDisplayText() function - write tests first
- [x] T006b [P] Add terminal width detection utility in src/core/rendering/terminal-width.ts - write tests first
- [x] T006c [P] Handle HTML email body conversion to plain text in src/core/rendering/html-converter.ts - write tests first

---

## Phase 3: User Story 1 - Collapsed Blank Lines (Priority: P1) MVP

- [x] T007 [P] [US1] Add terminalWidth prop to EmailPreview component in src/tui/components/EmailPreview.tsx
- [x] T008 [US1] Integrate collapseBlankLines() into EmailPreview - write tests first

---

## Phase 4: User Story 2 - URL Display as Link Text (Priority: P1)

- [x] T009 [P] [US2] Create UrlLink component in src/tui/components/UrlLink.tsx
- [x] T010 [P] [US2] Create useUrlActions hook in src/tui/hooks/useUrlActions.ts
- [x] T011 [US2] Integrate parseUrls() into EmailPreview - write tests first
- [x] T012 [US2] Render URLs as UrlLink components with truncation

---

## Phase 5: User Story 3 - Copy URL to Clipboard (Priority: P2)

- [x] T013 [US3] Implement clipboard copy in useUrlActions hook - write tests first
- [x] T014 [US3] Add visual feedback on successful copy in UrlLink component

---

## Phase 6: User Story 4 - Click to Open URL in Browser (Priority: P3)

- [x] T015 [US4] Implement openInBrowser in useUrlActions hook - write tests first
- [x] T016 [US4] Wire click handler in UrlLink component to openInBrowser

---

## Phase 7: Integration Tests

- [x] T017 [P] Integration test: EmailPreview renders email with blank lines collapsed in tests/integration/email-preview-blank-lines.test.ts
- [x] T018 [P] Integration test: EmailPreview renders URLs as truncated clickable links in tests/integration/email-preview-urls.test.ts
- [x] T019 [P] Integration test: UrlLink copy action copies full URL in tests/integration/url-link-copy.test.ts
- [x] T020 [P] Integration test: UrlLink click opens browser in tests/integration/url-link-open.test.ts

---

## Phase 8: Polish and Edge Cases

- [ ] T021 [P] Edge case: Empty email body displays "(No body)"
- [ ] T022 [P] Edge case: Email with only URL renders single link
- [ ] T023 [P] Edge case: Malformed URLs (missing protocol) render as plain text
- [ ] T024 [P] Edge case: Resize triggers re-truncation of URLs
- [ ] T025 [P] Edge case: Non-HTTP URLs (ftp, mailto, tel) handled appropriately
- [ ] T026 Run full test suite: npm test
