---
name: superpowers
description: Index of all installed obra/superpowers skills — TDD, debugging, planning, collaboration, and parallel agent workflows
metadata:
  type: reference
  source: https://github.com/obra/superpowers
  version: 6.1.1
---

# Superpowers Skills — Installed Reference

All skills from [obra/superpowers](https://github.com/obra/superpowers) are installed in `.claude/skills/`.

## Development Workflow

| Skill | Trigger | What it does |
|---|---|---|
| `/brainstorming` | "help me think through / refine this design" | Socratic questioning to sharpen designs before coding |
| `/writing-plans` | "plan this feature / task" | Breaks work into bite-sized 2–5 min tasks with precise specs |
| `/executing-plans` | "execute this plan" | Batch-executes tasks with human checkpoints |
| `/dispatching-parallel-agents` | "run these in parallel / spawn subagents" | Launches concurrent subagent workflows |
| `/subagent-driven-development` | "implement this plan with subagents" | Fast iteration via two-stage subagent review |

## Quality & Testing

| Skill | Trigger | What it does |
|---|---|---|
| `/test-driven-development` | "write tests first / TDD this" | Enforces RED→GREEN→REFACTOR cycle |
| `/systematic-debugging` | "debug this / find root cause" | 4-phase root-cause tracing process |
| `/verification-before-completion` | "verify this fix works" | Validates fixes before marking complete |

## Code Review

| Skill | Trigger | What it does |
|---|---|---|
| `/requesting-code-review` | "I'm ready for review" | Pre-review validation checklist |
| `/receiving-code-review` | "responding to review feedback" | Structured guide for acting on feedback |

## Git & Branching

| Skill | Trigger | What it does |
|---|---|---|
| `/using-git-worktrees` | "use worktrees / parallel branches" | Manages parallel dev branches via worktrees |
| `/finishing-a-development-branch` | "merge / finish this branch" | Handles merge/PR decisions at branch end |

## Meta

| Skill | Trigger | What it does |
|---|---|---|
| `/using-superpowers` | "how do superpowers skills work" | Introduction to the skills system |
| `/writing-skills` | "create a new skill" | Creates new skills following best practices |

## Recommended Workflow

1. **Design** → `/brainstorming` to refine the idea
2. **Plan** → `/writing-plans` to create task list
3. **Build** → `/executing-plans` or `/subagent-driven-development`
4. **Test** → `/test-driven-development` throughout
5. **Debug** → `/systematic-debugging` when stuck
6. **Review** → `/requesting-code-review` before merge
7. **Merge** → `/finishing-a-development-branch`
