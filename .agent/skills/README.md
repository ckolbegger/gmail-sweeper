# ai-agent-skills

This repo contains various skills that I have written for Claude Code.
All skills have been tested in Claude Code.
Most have also been tested with both OpenCode and Codex.

Here is a high-level description of each of the skills, in the order they were developed.

## soc-design-review

This skill is designed to be used with speckit to make sure that the design created  
in the planning step has clear boundaries between data, domain, and presentation layers.
It has some project-specific assumptions, so your mileage may vary.

## tdd-task

I created this skill for two reasons.

1 - I got tired of having to watch coding agents to make sure they were doing TDD.

2 - I noticed that a full suite test run could eat up quite a lot of the context window.

This skill is intended to be used by a subagent to implement a single task from a task breakdown file.
In Claude Code it can do this in a subagent, which minimizes the impact on the main agent loop context window.

I typically run it by telling Claude Code
Please start a subagent using the tdd-task skill to implement T006 from @spec-002/tasks.md.


## jit-task-audit

Often, when I have a coding agent create an implementation plan from a PRD
the AI likes to design things in layers and it writes stories that way.
So frequently there will be a "foundations" story that does all of the interfaces and database schema.
Then it would write a bunch of user stories, and usually the first user story
only uses a small part of what was created in the foundation stories.

This prompt will take a plan like that and move the foundation pieces out of
an initial foundation story and into the user stories where the actually will be used.
In practice, for a decent sized spec this cuts the number of tasks needed to implement
the first story at least in half.

Run this as:

Please use the jit-task-audit skill to review @spec-002/tasks.md
(you can do this in a subagent to save room in your context window)

It will give you a list of suggestions and then you can tell it to apply the suggestions to the plan.


## value-delivery-audit

This skill pairs with jit-task-audit to help refactor task breakdowns.
jit-task-audit looks for tasks that are occuring too early in a task breakdown.
value-delivery-audit looks for tasks that are occuring too late in a task breakdown.

As an example, you might add a feature to implement some new kind of data input.
The data input should affect the dashboard of your product, but a lot of times things like
updating the dashboard get written near the end of the task breakdowns, even if the change
is introduced in the very first user story.  This skill finds these and produces a 
list of recommended changes to the task breakdown.

You can review the recommendations and then ask the coding agent to implement the recommendations.

Run this as:

Please use the value-delivery-audit to review @spec-002/tasks.md


## test-case-enhancer

This skill will examine a task breakdown and add test cases that
should be implemented for each task as a series of "it should..." statements.
You can run it against the whole file, or tell it which parts of the file to enhance.

Sample command:

Use the test-case-enhancer skill to update the tasks in Phase 4 US2 of @specs/002-short-put-strategy/tasks.md


