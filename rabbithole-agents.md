# Claude Code Agents: Deep Technical Dive

> **Level:** Rabbithole (2000+ words)
> **Last Updated:** February 2026
> **For:** Charles - Module 5 Learning

---

## Part 1: How Agents Work Internally

### The Agentic Loop

Claude Code implements a three-phase agentic loop that applies to the main conversation, subagents, and all agent types:

1. **Gather context** - Use read-only tools (Read, Grep, Glob) to understand the problem
2. **Take action** - Execute tools (Edit, Write, Bash) to make changes
3. **Verify results** - Run tests or check output to confirm the fix works

This loop is **adaptive** - Claude decides which phase each step requires. A simple question might skip straight to answering; a bug fix cycles through all phases repeatedly. Each tool use feeds back into the decision loop, allowing course-correction.

**Key insight:** Tools return information that feeds the next decision. Without this feedback loop, it's a chatbot. With it, it's autonomous.

### Agent vs Subagent vs Main Conversation

Claude Code has three execution contexts:

| Context               | Description                       | Context Window          | Tool Access                   |
| --------------------- | --------------------------------- | ----------------------- | ----------------------------- |
| **Main conversation** | Your primary session              | Persistent, accumulates | All tools (unless restricted) |
| **Subagents**         | Spawned for specific tasks        | Isolated, independent   | Inherits or restricted        |
| **Built-in agents**   | Specialized for specific patterns | Isolated                | Pre-configured per type       |

**The critical architectural choice:** Subagents have **separate context windows** that don't bloat your main conversation. When a subagent completes, you only get its summary back, not its full exploration history. This is why subagents are effective for isolating verbose operations.

### Context Management

Each agent maintains its own context window (~200k tokens for Sonnet):

- **Main conversation**: Accumulates your prompts, tool calls, results, and loaded skills
- **Subagent context**: Completely separate - exploration doesn't consume main context
- **Auto-compaction**: When context fills to ~95%, Claude summarizes old messages
- **Subagent transcripts**: Stored in `~/.claude/projects/{projectId}/{sessionId}/subagents/`

**Important constraint:** Subagents cannot spawn other subagents (prevents nesting explosion). If you need multi-level delegation, chain them from the main conversation.

---

## Part 2: Built-in Agent Types

### 1. Explore Agent (Read-only Specialist)

```
Model:       Haiku (fast, cost-effective)
Tools:       Read, Grep, Glob, Bash (read-only commands only)
Use case:    File discovery, codebase understanding, searching
```

**Thoroughness levels:**

- `"quick"` - Targeted searches, first matches
- `"medium"` - Balanced exploration
- `"very thorough"` - Comprehensive analysis across multiple locations

**When Claude uses it:** Tasks involving "find", "search", "where is", "understand", "explore"

**Why it matters:** Keeps exploration results OUT of your main conversation context. You get a summary, not the full search history.

### 2. Plan Agent (Planning Specialist)

```
Model:       Inherits from main conversation (Sonnet by default)
Tools:       Read-only tools only
Use case:    Research before implementing (used in Plan mode via Shift+Tab)
```

**Integration with Plan Mode:** When you press `Shift+Tab` to enter plan mode, Claude uses the Plan agent internally. This prevents infinite nesting - plan mode research delegates to Plan agent instead of spawning another Plan agent.

**Returns:** Analysis and planning information without making any code changes.

### 3. General-purpose Agent (Multi-step Operator)

```
Model:       Inherits from main conversation
Tools:       All tools available
Use case:    Complex tasks requiring both exploration AND modification
```

**Best for:** Multi-step operations like "refactor this module and add tests" where the agent needs to:

1. Explore to understand current state
2. Make changes
3. Verify the changes work

### 4. Bash Agent (Execution Isolation)

```
Model:       Inherits from main conversation
Purpose:     Internal - runs shell commands in isolated context
```

Not directly user-invoked. Keeps command execution separate from conversation flow.

### 5. Other Built-in Agents

- **statusline-setup** (Sonnet) - Configures status line display
- **claude-code-guide** (Haiku) - Answers questions about Claude Code itself

---

## Part 3: Tool Access Architecture

Tools are categorized into access levels:

```
Read-Only Tools
├─ Read      (file contents)
├─ Grep      (content search with regex)
├─ Glob      (file pattern matching)
└─ Bash      (commands that don't modify)

Write Tools
├─ Edit      (replace text in existing files)
├─ Write     (create new files)
└─ Bash      (with modification capabilities)

External Tools
├─ WebFetch  (fetch URLs, convert to markdown)
├─ WebSearch (search the web)
└─ MCP Tools (external services)

Meta Tools
└─ Task      (spawn subagents)
```

Each agent inherits tool access from its parent by default, but can have tools restricted via:

- `tools` (allowlist) - Only these tools available
- `disallowedTools` (denylist) - Everything except these

---

## Part 4: Creating Custom Agents

### File Format

Custom agents are **Markdown files with YAML frontmatter**:

```markdown
---
name: my-agent
description: When to invoke this agent (Claude uses this to decide delegation)
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a specialized agent. Your system prompt goes here.
Explain your behavior, priorities, and how to approach tasks.
Include specific instructions that guide your actions.
```

### Storage Locations (Priority Order)

```
1. CLI Flag (--agents JSON)           ← Highest priority, session-only
2. Project Scope (.claude/agents/)    ← Checked into version control
3. User Scope (~/.claude/agents/)     ← Personal, all projects
4. Plugin Scope (plugin/agents/)      ← Lowest priority
```

When multiple agents have the same name, the highest-priority scope wins. This enables team defaults overridden by project-specific versions.

### For Your Setup (Windows)

| Scope             | Path                                               |
| ----------------- | -------------------------------------------------- |
| User-level agents | `C:\Users\charr\.claude\agents\`                   |
| Project agents    | `C:\Users\charr\projects\todo-app\.claude\agents\` |

### Frontmatter Fields Reference

| Field             | Required | Type       | Purpose                                         |
| ----------------- | -------- | ---------- | ----------------------------------------------- |
| `name`            | YES      | string     | Unique identifier (lowercase, hyphens only)     |
| `description`     | YES      | string     | Claude uses this to decide when to delegate     |
| `tools`           | NO       | CSV string | Allowlist of tools (if omitted, inherits all)   |
| `disallowedTools` | NO       | CSV string | Denylist of tools                               |
| `model`           | NO       | string     | `sonnet`, `opus`, `haiku`, or inherit (default) |
| `permissionMode`  | NO       | string     | `default`, `acceptEdits`, `plan`, etc.          |
| `skills`          | NO       | array      | Preload skill content into agent context        |
| `hooks`           | NO       | object     | Lifecycle hooks (PreToolUse, PostToolUse, Stop) |

### Model Options

```yaml
model: inherit    # Uses main conversation's model (default)
model: haiku      # Fast, cheap - good for exploration
model: sonnet     # Balanced - good for general work
model: opus       # Most capable - for complex reasoning
```

**Cost comparison:**

- Haiku: $0.80/$2.40 per million tokens (input/output)
- Sonnet: $3/$15 per million tokens
- Opus: $15/$60 per million tokens

### Permission Modes

```yaml
permissionMode: default           # Standard prompts (asks user)
permissionMode: acceptEdits       # Auto-approve file edits, prompt for commands
permissionMode: plan              # Read-only exploration only
permissionMode: bypassPermissions # Skip all checks (dangerous)
```

---

## Part 5: How Claude Decides to Delegate

Claude uses three signals:

1. **Your prompt language** - Words like "search", "find", "research" trigger Explore
2. **Agent `description` field** - Describes when to use that agent
3. **Context relevance** - Whether the task fits the agent's domain

### Example Flow

You say: "Research the authentication module"

Claude considers:

- Prompt says "Research" → exploration signal
- Explore description: "Fast, read-only agent for searching and analyzing codebases"
- Task fits the domain → **Delegates to Explore agent**

### Explicit Delegation

You can request specific agents:

```
Use the code-reviewer agent to check my changes
Have the debugger agent investigate this test failure
```

### Proactive Delegation

Make agents auto-trigger with description phrases:

```yaml
description: Expert code reviewer. Use proactively after code changes.
```

Now Claude will auto-delegate after writes without you asking.

---

## Part 6: Foreground vs Background Execution

| Mode           | Behavior                                              | When Used            |
| -------------- | ----------------------------------------------------- | -------------------- |
| **Foreground** | Blocks main conversation, shows permission prompts    | Interactive tasks    |
| **Background** | Concurrent execution, auto-denies unknown permissions | Parallel exploration |

**Force background:** Press `Ctrl+B` or ask "Run this in the background"

**Background constraints:**

- Auto-denies permissions not pre-approved
- No MCP tools (can't auth external services)
- Failures don't stop main conversation
- Can resume in foreground if needed

---

## Part 7: Practical Patterns

### Pattern 1: Isolate High-Volume Operations

Run tests in subagent, return only failures:

```yaml
---
name: test-runner
description: Run test suite and report failures
model: haiku
---

Run the full test suite. Return only:
1. Test results summary
2. Failed test names
3. Error messages for failures
```

### Pattern 2: Parallel Research

Spawn multiple agents for independent investigations:

```
Main conversation:
├─ Spawn agent 1: Research authentication module
├─ Spawn agent 2: Research database layer
├─ Spawn agent 3: Research API endpoints
└─ Synthesize findings when all complete
```

### Pattern 3: Chained Agents

Sequential delegation for multi-step workflows:

```
Main → code-reviewer (find issues)
    → optimizer (fix performance issues)
    → test-runner (verify fixes)
    → Main (integrate results)
```

### Pattern 4: Conditional Tool Access

Same tool, different agents, different constraints:

```yaml
# General developer - full access
name: dev-agent
tools: Bash, Edit, Read

# Production analyzer - read-only
name: prod-analyzer
tools: Read, Bash
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: ./validate-readonly.sh
```

---

## Part 8: Agent Lifecycle Hooks

Agents support three hook events:

```yaml
hooks:
  PreToolUse: # Before agent uses a tool (validation)
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./validate-command.sh"

  PostToolUse: # After agent uses a tool (logging)
    - matcher: "*"
      hooks:
        - type: command
          command: "./log-tool-use.sh"

  Stop: # When agent finishes (cleanup)
    - hooks:
        - type: command
          command: "./cleanup.sh"
```

**Hook exit codes:**

- `0` - Continue normally
- `2` - Block the operation
- Other - Error (operation continues)

---

## Part 9: Suggested Agents for Your Project

Based on the Module 5 learning plan, here are the three agents to create:

### 1. test-writer.md

```yaml
---
name: test-writer
description: Generate tests for React Native components and hooks. Use when adding test coverage or after creating new components.
tools: Read, Grep, Glob, Write, Edit
model: sonnet
---

You are a test specialist for React Native/Expo applications.

When writing tests:
1. Read the component/hook to understand its behavior
2. Identify key behaviors to test (not implementation details)
3. Write tests using Jest and React Testing Library
4. Focus on user interactions and outcomes
5. Include edge cases and error states

Test file conventions:
- Place tests in `__tests__/` adjacent to source
- Name: `ComponentName.test.tsx` or `hookName.test.ts`
- Use describe/it blocks with clear descriptions

Return:
- List of test cases created
- Any components that need mocking
- Suggestions for additional coverage
```

### 2. code-reviewer.md

```yaml
---
name: code-reviewer
description: Review code for quality, security, and best practices. Use proactively after code changes to identify issues.
tools: Read, Grep, Glob
model: sonnet
---

You are a senior code reviewer for React Native/TypeScript projects.

Review checklist:
1. TypeScript correctness (no `any`, proper types)
2. React patterns (hooks rules, memoization needs)
3. Security (no exposed secrets, proper input handling)
4. Performance (unnecessary re-renders, expensive operations)
5. Accessibility (proper labels, semantic elements)
6. Code clarity (naming, structure, comments where needed)

For each issue found, provide:
- File and line number
- Issue description
- Severity (critical/warning/suggestion)
- Recommended fix

Do NOT make changes - only report findings.
```

### 3. research-agent.md

```yaml
---
name: research-agent
description: Investigate libraries, patterns, and approaches before implementation. Use when evaluating options or learning new technologies.
tools: Read, Grep, Glob, WebSearch, WebFetch
model: haiku
---

You are a technical researcher.

When researching:
1. Understand the problem/question clearly
2. Search for relevant documentation and examples
3. Compare multiple approaches if applicable
4. Note tradeoffs (bundle size, complexity, maintenance)
5. Check compatibility with Expo/React Native

Return a structured analysis:
- Problem statement
- Options considered
- Recommended approach with rationale
- Implementation notes
- Potential pitfalls
```

---

## Part 10: Orchestration Thinking (Module 5 Focus)

The key learning goal for Module 5 is practicing **parallel delegation and task decomposition**. For every task, ask:

| Question                                    | Why It Matters                       |
| ------------------------------------------- | ------------------------------------ |
| "How would I parallelize this?"             | Identifies independent work streams  |
| "What would I delegate to separate agents?" | Practices task decomposition         |
| "How would I coordinate multiple agents?"   | Builds orchestration intuition       |
| "What context does each agent need?"        | Prepares for Beads/Gas Town patterns |

### Example: Adding Dark Mode

**Without orchestration thinking:**

```
Claude, add dark mode to the app
[Single agent does everything sequentially]
```

**With orchestration thinking:**

```
This task decomposes into:
1. Research: What dark mode patterns work in Expo/NativeWind?
2. Design: What colors/tokens do we need?
3. Implementation: Add theme context, update components
4. Testing: Verify on all platforms

Agents I'd use:
- research-agent: Investigate Expo dark mode approaches (parallel)
- research-agent: Find NativeWind theming examples (parallel)
- [Main conversation]: Make implementation decisions
- test-writer: Add theme toggle tests (after implementation)
- code-reviewer: Check accessibility of color choices (after implementation)
```

This mental exercise builds the intuition needed for Gas Town (Module 10).

---

## Part 11: Debugging & Troubleshooting

### Check Registered Agents

Run `/agents` to see all available agents:

- Built-in agents (Explore, Plan, etc.)
- User-level agents (~/.claude/agents/)
- Project agents (.claude/agents/)

### Debug Agent Delegation

Use `--debug` flag:

```bash
claude --debug "your prompt"
```

Look for:

```
[DEBUG] Considered agents: Explore, general-purpose
[DEBUG] Matched Explore because: task involves code search
```

### Verify Agent Configuration

Check frontmatter is valid YAML:

```bash
cat ~/.claude/agents/my-agent.md | head -20
```

### Common Issues

| Problem                | Cause                          | Fix                    |
| ---------------------- | ------------------------------ | ---------------------- |
| Agent not found        | Wrong directory or name        | Check `/agents` output |
| Tools not available    | Restricted in agent definition | Update `tools` field   |
| Agent uses wrong model | Not specified or typo          | Set `model` explicitly |
| Hooks not running      | Invalid hook syntax            | Check YAML formatting  |

---

## Part 12: Parallel Agent Case Study - Phase 8

> **Added:** February 2026
> **Context:** Module 5 practice session - first real parallel agent delegation

### The Task

Phase 8 needed two independent features: UI animations and dark mode. Instead of building sequentially, Charles practiced orchestration thinking by delegating to two parallel agents.

### Setup

| Agent               | Task                                                                 | Branch                   | PR  |
| ------------------- | -------------------------------------------------------------------- | ------------------------ | --- |
| Agent A (Animation) | Spring-based micro-interactions (checkbox, entry/exit, button press) | `feat/phase8-animations` | #4  |
| Agent B (Dark Mode) | NativeWind v4 migration, CSS variables, theme toggle                 | `feat/phase8-dark-mode`  | #5  |

**Key decision:** Each agent got its own feature branch. This prevented merge conflicts and let both work truly independently.

### What Worked

1. **Independent branches = no conflicts.** Because the agents worked on separate branches, they never stepped on each other's code. Each PR merged cleanly to main.
2. **Task decomposition was natural.** Animations touched component rendering logic; dark mode touched styling infrastructure. These were genuinely independent concerns.
3. **Code review agent added value.** Running the code-reviewer agent after each agent's work caught real issues (documented in `open-issues.md`): a subtask drag bug, missing accessibility labels, and type looseness in animation constants.
4. **Both PRs merged successfully.** The parallel approach delivered two features in roughly the time one would have taken sequentially.

### What Was Missed

1. **Documentation fell through the cracks.** The dark mode agent partially updated CLAUDE.md but only documented its own work as "Phase 8." The animation agent didn't update docs at all. Neither agent knew about the other's existence or the need to document the parallel session itself.
2. **Implementation plans were lost.** Both agents created implementation plans in the worktree, but these were deleted during cleanup. No persistent record of the planning process survived.
3. **Handoff doc wasn't updated.** `learning-session-handoff.md` still showed Phase 7 as current and Module 5 as "next" even after Module 5 was effectively practiced.

### Lessons Learned

| Lesson                                   | Implication                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Parallel agents don't coordinate docs    | Add an explicit "documentation update" task after parallel work completes               |
| Each agent sees only its own context     | Shared artifacts (CLAUDE.md, handoff docs) need a single owner or a merge step          |
| Implementation plans should be persisted | Save plans to `docs/` before execution, not just in ephemeral worktree files            |
| The orchestrator role is critical        | Someone (human or coordinator agent) must track the full picture across parallel agents |

### Connection to Gas Town (Module 10)

This session was a manual preview of Gas Town's orchestration model:

- **Charles acted as Mayor** - decomposed work, assigned agents, reviewed results
- **The two agents acted as Polecats** - independent workers on assigned tasks
- **Missing: Witness role** - no agent was responsible for observing and documenting the overall process
- **Missing: Deacon role** - no agent validated that all artifacts (docs, tests, plans) were complete

The gap between "two agents working in parallel" and "orchestrated multi-agent system" is exactly the coordination layer that Gas Town provides.

---

## Summary: Mental Model

Think of Claude Code agents as **specialized workers** in a project:

| Concept           | Analogy                                      |
| ----------------- | -------------------------------------------- |
| Main conversation | You + Claude discussing the project          |
| Explore agent     | Intern who quickly searches and reports back |
| Plan agent        | Analyst who researches before you implement  |
| Custom agents     | Domain experts with specific skills          |
| Hooks             | Rules/validators that apply to work          |

**The key architectural insight:** Subagents have independent context windows. They can explore, investigate, and return summaries **without consuming your main conversation context**.

**The delegation system:** Claude automatically decides which agent to use based on your prompt language and each agent's description. You can also request specific agents explicitly.

**The tool access system:** Agents inherit tools from parents but can be restricted, enabling fine-grained security and behavioral control.

---

## Quick Reference

### Create an Agent

1. Create file: `~/.claude/agents/my-agent.md` (user) or `.claude/agents/my-agent.md` (project)
2. Add frontmatter with `name` and `description`
3. Write system prompt in markdown body
4. Run `/agents` to verify registration

### Invoke an Agent

```
Use the my-agent agent to [task description]
```

Or let Claude auto-delegate based on description matching.

### Run in Background

Press `Ctrl+B` or ask "Run this in the background"

### Check Agent Output

Read transcript at:

```
~/.claude/projects/{projectId}/{sessionId}/subagents/agent-{agentId}.jsonl
```

---

_Module 5 complete. Custom agents (test-writer, code-reviewer, research-agent) created and used during Phase 8 parallel delegation. See Part 12 for the case study._
