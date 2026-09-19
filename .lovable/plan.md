# Nova chat-first agent redesign

## Goal
Turn Nova into a workspace-based, chat-only coding agent. Remove the visible header, file explorer, editor, and terminal while keeping those capabilities available to the agent through tools.

## Interface
- Add a slim collapsible sidebar with:
  - workspace selector
  - “New project” action
  - chat history grouped under the active workspace
  - new chat, rename, and delete actions
  - settings access at the bottom
- Use a dedicated URL for every chat: `/workspace/:workspaceId/chat/:threadId`.
- Make the main area a focused conversation surface with no global header or developer panels.
- Keep the clean, light, flat visual direction and adapt it for desktop and mobile.
- Keep the composer focused and add simple quick actions such as Create, Edit, Analyze, Search, and Run.

## Workspace and chat history
- Keep workspace files and cloud sandboxes in the existing backend.
- Store the workspace list, thread metadata, and each thread’s AI SDK messages in browser storage, as selected.
- Create the first workspace/thread only through an idempotent browser-safe bootstrap.
- Creating or switching a workspace selects its latest thread and navigates to its dedicated URL.
- Creating or switching a chat navigates to that chat URL and isolates its message history.
- Derive thread titles from the first user message and persist updates while streaming completes.

## Agent activity presentation
- Replace raw tool cards and realtime code output with compact, collapsible activity rows inspired by the reference image.
- Present friendly actions such as:
  - `Created  TS  prompt.ts  +84 -0`
  - `Edited  TS  prompt.ts  +4 -2`
  - `Analyzed  12 files`
  - `Ran  npm run build`
  - `Searched  authentication flow`
- Show file-type icons, file names, command summaries, running/completed/error states, and green/red line counts.
- Calculate create/edit line deltas on the server and return concise tool metadata; keep full parameters/results hidden behind a closed disclosure.
- Do not stream full file contents or terminal output into the normal conversation.

## Agent capabilities
- Preserve file listing, reading, creating, editing, deleting, and real sandbox command execution.
- Add focused codebase tools for text search, file discovery, and a compact project index/overview.
- Add web search for current documentation and research.
- Add browser-local per-workspace memory that the agent can read and update through explicit memory tools.
- Update the agent instructions to inspect, plan briefly, act autonomously, verify changes, use search/index/memory when useful, and summarize completed work concisely.
- Keep model calls server-side and continue using `openai/gpt-6-astra` with reasoning and multi-step tool use.

## Technical changes
- Add browser storage utilities and types for workspaces, threads, messages, and memory.
- Add the workspace/thread route and make `/` bootstrap then redirect to it.
- Build a sidebar shell, chat thread view, activity renderer, and compact empty state using the existing AI Elements primitives.
- Extend sandbox helpers with search/index functions and line-delta metadata.
- Extend the chat request with the active thread’s workspace memory and add search/index/memory tools.
- Keep settings local and available from the sidebar.
- Add unique page metadata for the index and chat routes.

## Validation
- Verify creating and switching between at least two workspaces.
- Verify creating two chats in one workspace, sending messages in both, switching, and reloading each dedicated URL without message bleed.
- Verify create/edit/analyze/search/run actions render as compact activity rows without exposing full code or terminal output.
- Verify the agent can create and edit files, search/index the workspace, run a command, and retain workspace memory.
- Verify desktop and mobile layouts, sidebar collapse/reopen, composer focus, errors, and empty/loading states.
