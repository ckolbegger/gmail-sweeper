# Task-Driven Development (TDD) Rules

These rules are mandatory and MUST be followed for every task in the `gmail-sweep` project.

## 1. Audit Files
- Before starting any Task (e.g., `T015`), create a file named `audit-[TASK_ID].md` (e.g., `audit-T015.md`) in the root directory.
- This file must contain the exact list of "it should" statements from `tasks.md` for that task.
- Each statement must be checked off (`[x]`) ONLY after its corresponding test passes.

## 2. Granular TDD
- Work through each "it should" statement sequentially.
- Follow the Red-Green-Refactor loop:
    1. Write a failing test.
    2. Write minimal code to pass.
    3. Refactor.
- Do not implement logic for statements that haven't been reached yet.

## 3. Task Completion & Verification
- A Task is only complete when ALL "it should" statements in its audit file are checked.
- Before marking a Task as complete:
    1. Run the **full test suite** (`npm test run`).
    2. Ensure 100% pass rate.
    3. Fix any regressions immediately.

## 4. Commits
- Commit ONLY once a Task is fully completed, verified by the full test suite, and the audit file is updated.
- Commit message should reference the Task ID (e.g., `feat: complete T015 - implement listEmails`).

## 5. Scope Guard
- Do not implement features or UI elements outside the scope of the current Task.
- Do not jump ahead to future User Stories or Tasks without explicit instruction.

## 6. Communication Protocol (Response-First)
- If the USER's prompt contains a question, feedback, or a clarification request, you are FORBIDDEN from calling any "Work Tools" (writing code, moving files, running implementation commands) in that turn.
- You must first provide a comprehensive answer and wait for the USER's "Go" before resuming execution.
- This ensures pair-programming alignment and prevents robotic over-execution.
