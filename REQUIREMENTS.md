# Twin Taskboard – Functional Requirements

This document is the single specification both builds implement. Every
requirement has an id (FR-n), acceptance criteria, and a row in the
[traceability matrix](#traceability-matrix) that points to the code in each
build and to the tests that prove it.

- **Build A** – `react/` (React 19 + TypeScript + Vite)
- **Build B** – `vue/` (Vue 3 + TypeScript + Vite)

Both builds must expose the same screens, workflows, visible text and outputs.
A user switching between them should not be able to tell which one is open.

## Data model

| Field         | Type                          | Rules                                         |
| ------------- | ----------------------------- | --------------------------------------------- |
| `id`          | string                        | Unique, generated on create                   |
| `title`       | string                        | Required, trimmed, 1–80 characters            |
| `description` | string                        | Optional, trimmed, max 500 characters         |
| `priority`    | `low` \| `medium` \| `high`   | Default `medium`                              |
| `due`         | `YYYY-MM-DD` or empty         | Optional, must be a real calendar date        |
| `done`        | boolean                       | `false` on create                             |
| `createdAt`   | ISO timestamp                 | Set on create, never changed by edits         |

## Requirements

### FR-1 Add a task
The user can create a task from the form with title, description, priority and
due date. New tasks appear at the top of the default ("Newest first") list,
the form resets and focus returns to the Title field.

### FR-2 Edit a task
"Edit" on a task loads it into the same form (heading changes to "Edit task",
button to "Save changes", a "Cancel" button appears, the row is highlighted).
Saving updates title, description, priority and due date only; `id`, `done`
and `createdAt` are preserved.

### FR-3 Validate input
Submitting is blocked when the title is blank or longer than 80 characters,
the description exceeds 500 characters, or the due date is not a real date.
Each error is shown under its field (`role="alert"`, linked via
`aria-describedby`, field marked `aria-invalid`). A field's error clears as
soon as the user edits it.

### FR-4 Mark done / not done
Each task has a checkbox. Checking it marks the task done (title struck
through); unchecking makes it active again.

### FR-5 Delete with confirmation
"Delete" swaps the row actions for "Delete this task?" with "Confirm" and
"Keep". Focus moves to "Keep" (the safe choice) and back to "Delete" if the
task is kept. Only "Confirm" removes the task. Deleting the task being edited
also resets the form.

### FR-6 Filter by status
Three toggle buttons – All, Active, Done – filter the list. The active filter
is shown with `aria-pressed="true"`.

### FR-7 Search
A search box filters by case-insensitive substring match on title or
description, combined with the status filter.

### FR-8 Sort
"Sort by" offers: Newest first (default), Due date (earliest first, undated
last), Priority (High → Low), Title A–Z (case-insensitive). Ties fall back to
newest first.

### FR-9 Summary counts
Four counters show Total, Active, Done and Overdue for all tasks (independent
of filter and search) and update immediately.

### FR-10 List feedback
- A task is **overdue** when it is not done and its due date is before today
  (local time); it shows an "Overdue" label and red due date.
- Above the list: "Showing X of N tasks".
- Empty states: "No tasks yet. Add your first task above." when there are no
  tasks; "No tasks match the current filter or search." when filters hide all.

### FR-11 Persistence
Tasks, the status filter and the sort order are saved to `localStorage`
(key `twin-taskboard:v1`) on every change and restored on reload. An empty
list stays empty. Corrupted storage falls back to demo data instead of
crashing. The search text is intentionally not persisted.

### FR-12 Keyboard accessibility
Everything is operable with native, labelled controls (Tab, Enter, Space).
Additionally: Enter in the Title field submits; Escape cancels an edit; "/"
focuses search when not typing in a field; focus moves to Title when editing
starts and after saving.

### FR-13 JSON export / import
- "Export JSON" downloads `twin-taskboard-YYYY-MM-DD.json` containing
  `{ "app": "twin-taskboard", "version": 1, "tasks": [...] }`.
- "Import JSON" accepts that file (or a bare array of tasks) and replaces the
  current list. Import is all-or-nothing: invalid JSON, a missing task list,
  any invalid task or duplicate ids reject the file with a specific message
  and leave existing data untouched.

### FR-14 Demo data and bulk actions
- The first visit (no saved data) loads four synthetic demo tasks, one of
  them overdue and one done, with dates relative to today.
- "Clear completed" removes all done tasks (disabled when there are none).
- "Reset demo data" restores the demo tasks and default view.

### FR-15 Status announcements
Every action reports its outcome in a polite live region (`role="status"`),
e.g. "Task added.", "Task updated.", "Task deleted.", "Imported 4 tasks.",
"Import failed: …", "Cleared 1 completed task.", "Demo data restored.".

### FR-16 Responsive layout
The UI works from phone width (390 px) upward without horizontal scrolling.

### FR-17 Build parity
Both builds render the same DOM structure, CSS classes, ARIA attributes,
form values and visible text in every state, and ship the same stylesheet,
page title and language.

## Traceability matrix

Paths are relative to each build folder (`react/` or `vue/`). Unit tests are
named after the FR they cover; `app.behaviour.ts` and `tasks.test.ts` are
identical in both builds, so the same unit specs run against each one.
E2E tests live in `e2e/tests/` and run once per build.

| FR | React build | Vue build | Unit tests (both builds) | E2E (`user-flows.spec.ts`, run per build) |
| -- | ----------- | --------- | ------------------------ | ----------------------------------------- |
| FR-1 | `src/App.tsx` `handleSubmit`, `src/components/TaskForm.tsx` | `src/composables/useTaskboard.ts` `submit`, `src/components/TaskForm.vue` | `tasks.test.ts` › create / update; `app.behaviour.ts` › adds a task | FR-1 FR-15 add a task with all fields |
| FR-2 | `src/App.tsx` `handleEdit`, `TaskForm.tsx` | `useTaskboard.ts` `startEdit`, `TaskForm.vue` | `tasks.test.ts` › keeps id, done and createdAt; `app.behaviour.ts` › edits a task | FR-2 FR-12 edit a task… |
| FR-3 | `src/lib/tasks.ts` `validateDraft`, `TaskForm.tsx` | `src/lib/tasks.ts` `validateDraft`, `TaskForm.vue` | `tasks.test.ts` › validateDraft (4); `app.behaviour.ts` › blocks an empty title | FR-3 validation blocks invalid input |
| FR-4 | `src/components/TaskItem.tsx`, `App.tsx` `handleToggle` | `src/components/TaskItem.vue`, `useTaskboard.ts` `toggle` | `app.behaviour.ts` › toggles done and filters | FR-4 FR-10 toggle done… |
| FR-5 | `TaskItem.tsx` (confirm state), `App.tsx` `handleDelete` | `TaskItem.vue` (confirm state), `useTaskboard.ts` `remove` | `app.behaviour.ts` › deletes only after confirmation | FR-5 delete requires confirmation |
| FR-6 | `src/components/Toolbar.tsx`, `tasks.ts` `filterTasks` | `src/components/TaskToolbar.vue`, `tasks.ts` `filterTasks` | `tasks.test.ts` › filters by status; `app.behaviour.ts` › toggles done and filters | FR-6 FR-7 filter and search combine |
| FR-7 | `Toolbar.tsx`, `tasks.ts` `filterTasks` | `TaskToolbar.vue`, `tasks.ts` `filterTasks` | `tasks.test.ts` › searches title and description; `app.behaviour.ts` › searches, sorts… | FR-6 FR-7 filter and search combine |
| FR-8 | `Toolbar.tsx`, `tasks.ts` `sortTasks` | `TaskToolbar.vue`, `tasks.ts` `sortTasks` | `tasks.test.ts` › sortTasks (5); `app.behaviour.ts` › searches, sorts… | FR-8 sort orders |
| FR-9 | `src/components/Summary.tsx`, `tasks.ts` `summarize` | `src/components/SummaryStats.vue`, `tasks.ts` `summarize` | `tasks.test.ts` › counts total, active…; `app.behaviour.ts` › shows the seeded demo tasks | FR-14 FR-9 first visit… |
| FR-10 | `App.tsx` (result count, empty states), `TaskItem.tsx`, `tasks.ts` `isOverdue` | `App.vue` (result count, empty states), `TaskItem.vue`, `tasks.ts` `isOverdue` | `tasks.test.ts` › overdue rules; `app.behaviour.ts` › no-match / empty state | FR-4 FR-10 toggle done…; FR-6 FR-7…; FR-14 clear completed… |
| FR-11 | `App.tsx` (`useEffect` → `saveState`), `tasks.ts` `loadState`/`saveState` | `useTaskboard.ts` (`watch` → `saveState`), `tasks.ts` | `tasks.test.ts` › persistence (4); `app.behaviour.ts` › persists changes | FR-11 tasks and view preferences survive a reload |
| FR-12 | `TaskForm.tsx` (Escape), `App.tsx` ("/" listener, focus) | `TaskForm.vue` (`@keydown.esc`), `App.vue` ("/" listener, focus) | `app.behaviour.ts` › edits a task and cancels with Escape | FR-12 keyboard only…; FR-2 FR-12 edit… |
| FR-13 | `src/components/DataPanel.tsx`, `tasks.ts` `parseImport`/`serializeExport` | `src/components/DataPanel.vue`, `tasks.ts` | `tasks.test.ts` › import / export (3); `app.behaviour.ts` › imports a JSON file | FR-13 export downloads JSON…; FR-13 invalid import… |
| FR-14 | `tasks.ts` `seedTasks`, `DataPanel.tsx`, `App.tsx` `handleClearDone`/`handleReset` | `tasks.ts` `seedTasks`, `DataPanel.vue`, `useTaskboard.ts` `clearDone`/`resetDemo` | `tasks.test.ts` › seeds demo data; `app.behaviour.ts` › clears completed… | FR-14 FR-9 first visit…; FR-14 clear completed… |
| FR-15 | `App.tsx` (`status` state, live region) | `useTaskboard.ts` (`status` ref), `App.vue` | `app.behaviour.ts` (status assertions in most specs) | asserted in most flows |
| FR-16 | `src/styles/app.css` (`@media`) | `src/styles/app.css` (identical) | – | FR-16 layout adapts to a phone-sized screen |
| FR-17 | whole build | whole build | `scripts/check-parity.mjs` (shared files identical) | `parity.spec.ts` › identical DOM through a full workflow; › title, language and stylesheet |

## Out of scope

Accounts, server sync, multi-device sharing, recurring tasks and
drag-and-drop ordering are intentionally not part of this feature set.
