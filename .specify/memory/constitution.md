<!--
SYNC IMPACT REPORT
Version Change: New -> 1.0.0
Modified Principles: All (Initial Ratification)
Added Sections: All
Templates Requiring Updates:
- .specify/templates/tasks-template.md (✅ updated - Enforced Mandatory Tests)
- .gemini/commands/speckit.tasks.toml (✅ updated - Enforced Mandatory Tests in Prompt)
- .gemini/commands/speckit.implement.toml (✅ updated - Strengthened TDD Language)
Follow-up TODOs: None
-->
# Gmail Sweep Constitution

## Core Principles

### I. Safety & Security (NON-NEGOTIABLE)
This tool interacts with private email data. All operations must be read-only by default. Destructive actions (archiving, deleting, modifying labels) MUST require explicit user confirmation (e.g., `--confirm` flag or interactive y/n prompt). No secrets or credentials shall ever be logged or exposed.

### II. Strict Test-Driven Development (TDD)
Test-First is mandatory. No production code is written without a failing test.
1. **Unit Tests**: Mock external dependencies (Gmail API). Validate logic in isolation.
2. **Integration Tests**: Verify interactions with real or simulated components (no mocks for the slice being tested).
3. **Workflow**: Write Test -> Fail -> Write Code -> Pass -> Refactor.

### III. Modular Architecture
Code must be organized into logical modules with clear responsibilities. Separate business logic from CLI interaction and API communication. Adhere to the Single Responsibility Principle.

### IV. CLI Excellence
The interface must be simple, composable, and POSIX-compliant where possible.
- Support standard input/output streams (text/JSON).
- Clear help messages and error reporting.
- Use standard exit codes (0 for success, non-zero for failure).

### V. Simplicity & YAGNI
Do not over-engineer. Implement only what is needed for the current feature. Avoid premature optimization. Keep the codebase clean and understandable.

## Governance

### Amendment Process
This Constitution is the supreme law of the project.
- **Changes**: Require a Pull Request with specific rationale.
- **Approval**: Must be approved by project maintainers.
- **Versioning**: Follows Semantic Versioning (Major for principle changes, Minor for clarifications).

### Compliance
All code reviews and automated checks must verify compliance with these principles. Non-compliant code will be rejected.

**Version**: 1.0.0 | **Ratified**: 2026-01-31 | **Last Amended**: 2026-01-31
