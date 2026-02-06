# Claude Code Learning Session Handoff

**Student:** Charles
**Date:** January 2026
**Purpose:** Continue Claude Code power user training with a new instance

---

## About Charles

- **Role:** AI Strategy professional at Cigna/Evernorth, learning advanced software development
- **Background:** MS Analytics (AI/ML specialization), comfortable with code concepts, not a developer by trade
- **Learning style:** Fast-paced, complexity-first, "drowning to swim" - prefers jumping into complexity over toy examples
- **Ultimate Goal:** Become a "Product Architect Unicorn" - combining principal-level product management, systems architecture, and tech lead judgment, amplified by AI tools to operate at 100x output

**The Product Architect Unicorn thesis:** The most valuable IC role of the future combines four skills (Product Strategy, Systems Architecture, Tech Lead Judgment, Organizational Navigation) at threshold level (40-50/100 each), then uses AI + agent orchestration as the implementation layer. Charles has Product Strategy from his current job; this learning plan builds Tech Lead Judgment and introduces Systems Architecture, with agent orchestration as the core multiplier skill.

**Communication preferences (stored in global CLAUDE.md):**

- **Headline:** 1-2 sentence summary for quick orientation
- **Gist:** 100-500 words (Problem → Mental model → How it works → Why it matters) - DEFAULT
- **Rabbithole:** 500-2000+ words with technical detail, edge cases, tradeoffs

---

## App Progression Strategy

Three apps, each introducing new complexity:

| App          | Modules | Complexity              | Users                        | Learning Focus                                      |
| ------------ | ------- | ----------------------- | ---------------------------- | --------------------------------------------------- |
| **To-Do**    | 0-7     | Technical               | Just Charles                 | Fundamentals + deployment                           |
| **Shopping** | 7-9     | Social + System         | Charles + wife (stakeholder) | Backend/integrations + Beads + stakeholder feedback |
| **Habit**    | 9-10+   | Product + Orchestration | Potentially public           | Multi-agent orchestration (Gas Town)                |

**Tech stack decision:** Expo (React Native) for all three - single codebase for iOS, Android, and Web. Charles wanted "real" App Store apps, not PWAs.

**Evolution from original plan:**

- Shopping App will include backend services (API, database, auth) to practice system-level architecture
- Wife acts as stakeholder to practice translating business needs into technical solutions
- Orchestration thinking starts in Module 5, not Module 10

---

## Core Learning Philosophy: Orchestration-First Thinking

**This is the key insight added after initial planning.**

Agent orchestration isn't just the destination - it's the core multiplier that turns 10x into 100x. Starting in Module 5, every task should be evaluated through an orchestration lens:

| Question                                    | Why It Matters                       |
| ------------------------------------------- | ------------------------------------ |
| "How would I parallelize this?"             | Identifies independent work streams  |
| "What would I delegate to separate agents?" | Practices task decomposition         |
| "How would I coordinate multiple agents?"   | Builds orchestration intuition       |
| "What context does each agent need?"        | Prepares for Beads/Gas Town patterns |

**Practical application:**

- Module 5 (Subagents): Explicitly practice parallel delegation
- Module 6 (Skills): Design skills that could be used by orchestrated agents
- Module 7 (Deployment): Consider CI/CD as an orchestration pattern
- Module 8 (Advanced): Multi-terminal as manual orchestration, cross-tool delegation (Codex, Gemini)
- Module 9 (Beads): Issue tracking as agent coordination substrate
- Module 10 (Gas Town): Full multi-agent orchestration

---

## Completed Modules

### Module 0: Foundation Setup ✓

- Git configured with SSH keys
- GitHub CLI installed (`gh`)
- Claude Code working in Windows Terminal (standalone, not just VS Code)
- Global CLAUDE.md created at `C:\Users\charr\.claude\CLAUDE.md`
- Repos created: `todo-app`, `shopping-app`

### Module 1: CLAUDE.md Mastery ✓

- Project CLAUDE.md with professional structure (Identity, Goals, Session Continuity, Current State)
- Tech stack: Expo SDK 54, TypeScript, NativeWind (planned), React Context + useReducer
- Committed to GitHub

### Module 2: Slash Commands ✓

**Personal commands** (`C:\Users\charr\.claude\commands\`):

| Command          | Purpose                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `/check`         | Project status, recent commits, current state                                         |
| `/commit`        | Smart commit with conventional message                                                |
| `/push`          | Push current branch to origin                                                         |
| `/undo`          | Undo last commit, keep changes                                                        |
| `/find-examples` | Search community for Claude Code patterns                                             |
| `/handoff`       | Finish session - update CLAUDE.md, HANDOFF.md, and agent files (AGENTS.md, GEMINI.md) |
| `/branch`        | Create a new feature branch (`/branch feat/thing`)                                    |
| `/pr`            | Create a PR for current branch                                                        |
| `/merge`         | Merge current PR (default: squash; options: `/merge merge`, `/merge rebase`)          |
| `/sync`          | Return to main and pull latest (`git checkout main && git pull`)                      |

**Project command** (`.claude/commands/` in todo-app):

| Command | Purpose                       |
| ------- | ----------------------------- |
| `/dev`  | Start Expo dev server for web |

### Module 3: Hooks ✓

**Configured in** `C:\Users\charr\.claude\settings.json`:

| Hook              | Event          | What It Does                                               |
| ----------------- | -------------- | ---------------------------------------------------------- |
| Notification beep | `Stop`         | Plays 800Hz beep when Claude finishes                      |
| Input needed beep | `Notification` | Plays 1000Hz beep (higher, longer) when Claude needs input |
| Auto-format       | `PostToolUse`  | Runs Prettier on edited .ts/.tsx/.js/.jsx/.json files      |

**Note:** The auto-format hook required a PowerShell script (`C:\Users\charr\prettier-hook.ps1`) because Windows path handling in hooks is finicky. Claude Code debugged this during the session - good example of real problem-solving.

### Module 4: GitHub Workflow ✓

**Key learning:** The ST6 case study issue wasn't about needing sophisticated recovery tools - it was about not having checkpoints. Git itself is the recovery mechanism when you're actually using it.

**What was set up:**

- Branch protection ruleset on `todo-app` main (requires PR to merge)
- Made repo public (required for branch protection on free GitHub)
- Added README.md

**Git workflow commands added:**

- `/branch` - create feature branch
- `/pr` - open pull request
- `/merge` - merge PR (with squash/merge/rebase options)
- `/sync` - return to main and pull

**The workflow pattern:**

```
/branch type/feature-name
# ... do work ...
/commit
/push
/pr
/merge
/sync
```

**Session management pattern established:**

- Handoff at end of each logical unit (phase, feature, PR)
- Run `/handoff` before `/commit` so docs are included
- Short sessions = better context, less drift

**Recovery commands documented (break-glass-in-emergency):**

- `git reset --soft HEAD~1` - undo commit, keep changes
- `git reset --hard origin/main` - reset to remote
- `git stash` / `git stash pop` - save/restore uncommitted changes
- `git branch -D branch-name` - delete bad branch
- `git reflog` - find lost commits

### Build Session: To-Do App ✓

Charles let Claude Code build overnight with auto-accept. The app now has:

- Multiple todo lists with tabs
- Categories within lists (Now/Next/Later default)
- Tasks with subtasks (one level deep)
- Task detail modal for editing
- Tap-based reordering and nesting
- Drag-and-drop reordering
- Web split-view (multi-list side-by-side)
- AsyncStorage persistence
- Category CRUD
- UI animations (spring-based micro-interactions)
- Dark mode with NativeWind v4

**Current state:** Functional multi-list todo app through Phase 8. See `CLAUDE.md` in the todo-app repo for detailed architecture and next steps.

### Module 5: Subagents ✓

**Key learning:** Practiced parallel agent delegation by splitting Phase 8 into two independent workstreams.

**What was done:**

- Created custom subagents: `test-writer.md`, `code-reviewer.md`, `research-agent.md`
- Read deep-dive on agent architecture (`rabbithole-agents.md`)
- Practiced parallel delegation: two agents working simultaneously on Phase 8
  - Agent A: UI animations (PR #4) on `feat/phase8-animations` branch
  - Agent B: Dark mode with NativeWind v4 (PR #5) on `feat/phase8-dark-mode` branch
- Both PRs merged independently to main

**Orchestration lessons learned:**

- Parallel agents work well when tasks have no shared file dependencies
- Documentation updates are easily missed when agents work in parallel - need explicit documentation tasks
- Code review agent caught real issues (see `open-issues.md`)
- Task decomposition is the critical skill: identifying truly independent work streams

---

## Remaining Modules

### Module 6: Skills (Next)

**Time:** 3 hours

**Content:**

- Difference: Commands (user-invoked) vs. Skills (auto-discovered)
- Skill structure: SKILL.md + scripts/ + references/ + assets/
- Progressive disclosure (metadata → SKILL.md → references)
- Creating a custom skill

**Orchestration-first addition:**

- Design skills as "capabilities an orchestrated agent could invoke"
- Think about what context/references each skill needs to work independently

**Suggested skill:** `habit-science` for the Habit app - evidence-based habit formation guidance

### Module 7: Deployment

**Time:** 3-4 hours
**Pause after:** Yes - 3-7 days, must ship a fix to prod

**Content:**

- Apple Developer Account setup ($99/year)
- EAS Build for iOS
- TestFlight distribution
- OTA updates (no review needed for JS-only changes)
- Vercel for web version (optional)

**Orchestration-first addition:**

- View CI/CD as an orchestration pattern (automated agents doing build/test/deploy)
- Consider: "How would multiple agents coordinate a release?"

**Goal:** To-Do app deployed to TestFlight, installable on Charles's iPhone

### Module 8: Advanced Patterns

**Time:** 3 hours

**Content:**

- MCP (Model Context Protocol) servers
- GitHub MCP for issue/PR integration
- Multi-terminal workflow (Claude Code + dev server + git)
- Session management (`claude --resume`, `claude --continue`)
- **Cross-tool delegation:** Using Codex/Gemini alongside Claude Code
  - When to delegate to which tool
  - Keeping context in sync (AGENTS.md, GEMINI.md mirroring CLAUDE.md)
  - Practical patterns for code review, UI work, etc.

**Orchestration-first addition:**

- Multi-terminal is manual orchestration - practice running 2-3 Claude Code instances on different tasks
- Document what coordination challenges arise
- This is the "training wheels" version of Gas Town

### Module 9: Beads + Shopping App

**Time:** 3-4 hours for Beads, then ongoing for Shopping App
**Pause after:** 1-2 weeks using Beads on real work

**Content:**

- What Beads solves (persistent issue tracking for AI agents)
- Installation (`go install` or `npm`)
- Basic commands: `bd init`, `bd create`, `bd list`, `bd ready`
- Claude Code plugin integration

**Shopping App scope (System-level architecture practice):**

- Backend service (API for shared lists)
- Database (Supabase or similar)
- Auth (shared access for Charles + wife)
- Real-time sync between users
- Wife as stakeholder - practice translating her needs into technical solutions

**Orchestration-first addition:**

- Use Beads to coordinate work across features
- Practice: "How would I assign these issues to multiple agents?"
- Beads is the coordination substrate for Gas Town

**Note:** Go is not installed on Charles's machine. Will need to install before this module.

### Module 10: Gas Town + Habit App

**Time:** Ongoing

**Prerequisites before Gas Town:**

- Solid Claude Code fundamentals ✓
- GitHub workflow mastery ✓ (Module 4)
- Beads proficiency (Module 9)
- Multiple active projects (To-Do + Shopping)
- Comfort with 3-5 concurrent agent sessions (Module 8)
- tmux or multi-terminal comfort

**Gas Town concepts:**

- Roles: Mayor, Polecats, Refinery, Witness, Deacon, Dogs, Crew
- GUPP: "If there's work on your hook, you run it"
- Hooks (git worktrees) for persistent agent state
- Convoys for grouping related work

**Habit App scope:**

- Complex domain logic (habit science, behavior design)
- Multiple agents working in parallel on different features
- Full Gas Town orchestration
- Potentially public release

---

## Key Patterns Established

### Git Workflow

```
/branch type/feature → work → /commit → /push → /pr → /merge → /sync
```

Handoff before commit to include updated docs.

### Session Management

- Short sessions are better (less context drift, faster responses)
- Handoff at natural boundaries: phase complete, feature done, PR merged
- `/handoff` updates CLAUDE.md, HANDOFF.md, and agent files

### When to use Plan Mode

- Building new features with multiple files
- Complex tasks where the path isn't obvious
- When you want to review approach before execution

### When NOT to use Plan Mode

- Simple file edits
- Clear, specific instructions
- Quick additions

### Escape Hatches

Sometimes the "automatic" solution is more trouble than a manual command. Examples:

- Auto-format hook was complex; `/format` command would have been simpler (but Charles wanted to solve it properly)
- When to use Claude.ai web vs. Claude Code
- When to Google vs. ask Claude

### Debugging with Claude Code

When something doesn't work, describe the problem and let Claude Code investigate. This is real-world usage, not a scripted tutorial. Charles did this successfully with the Prettier hook.

### Overnight Builds

For long builds, use auto-accept mode BUT:

1. Create a feature branch first (`git checkout -b feat/feature-name`)
2. If you hate the result, nuke the branch and start fresh
3. Main stays clean

### Orchestration Thinking

From Module 5 onward, always ask:

- "How would I parallelize this?"
- "What would I delegate to separate agents?"
- "How would I coordinate multiple agents?"
- "What context does each agent need?"

---

## File Locations (Windows)

| File                 | Location                                |
| -------------------- | --------------------------------------- |
| Global CLAUDE.md     | `C:\Users\charr\.claude\CLAUDE.md`      |
| Personal commands    | `C:\Users\charr\.claude\commands\`      |
| Hooks config         | `C:\Users\charr\.claude\settings.json`  |
| Prettier hook script | `C:\Users\charr\prettier-hook.ps1`      |
| Projects             | `C:\Users\charr\projects\`              |
| To-Do app            | `C:\Users\charr\projects\todo-app\`     |
| Shopping app         | `C:\Users\charr\projects\shopping-app\` |

---

## Current State

**To-Do App:**

- Functional multi-list app through Phase 8 (animations + dark mode complete)
- Repo is now public with branch protection enabled
- Known issues tracked in `open-issues.md`
- Next: Module 6 (Skills) or Phase 9 (iOS deployment)

**Shopping App:**

- Repo created, empty
- Will start after To-Do is deployed
- Will include backend/system architecture (not just client-side)
- Wife as stakeholder for product requirements
- Primary vehicle for Beads learning (Module 9)

**Habit App:**

- Not started
- Will be the Gas Town project (Module 10+)
- Complex enough to justify multi-agent orchestration

---

## Recommended Next Session

Start with **Module 6: Skills**.

Suggested opening:

1. Review this handoff
2. Run `/check` in todo-app to see current state
3. Learn the difference between Commands (user-invoked) and Skills (auto-discovered)
4. Create a custom skill (e.g., `habit-science` for the upcoming Habit app)

Module 5 (Subagents) is complete - Charles practiced parallel delegation during Phase 8, splitting work across two agents that produced independent PRs. The foundation for orchestration thinking is established.

---

## Questions Charles May Have

He's quick to ask good questions. Patterns from sessions:

- "Give me the headline/gist/rabbithole on X"
- "What if we switch Y later?"
- "Is there a way to do Z from command line?"
- Questions about tradeoffs before making decisions

Don't over-explain. He learns by doing and asks when he needs more.

---

## Context: Product Architect Unicorn

Charles is working toward becoming a "Product Architect Unicorn" - a role that combines:

| Skill                     | Charles's Current Level | How This Plan Helps                         |
| ------------------------- | ----------------------- | ------------------------------------------- |
| Product Strategy          | Strong (current job)    | Shopping App stakeholder practice           |
| Systems Architecture      | Learning                | Shopping App backend, separate crash course |
| Tech Lead Judgment        | Building                | Core focus of this plan                     |
| Organizational Navigation | Strong (current job)    | Not addressed here                          |

The agent orchestration capability (Beads → Gas Town) is the multiplier that turns these skills into 100x output. That's why orchestration thinking is woven throughout the plan, not saved for the end.
