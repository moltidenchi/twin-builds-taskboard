/**
 * Framework-agnostic task domain logic.
 *
 * Both builds keep their own copy of this module so each project stays
 * self-contained. The copies are kept identical on purpose: this file is the
 * executable form of the behavioural contract in REQUIREMENTS.md, while the
 * UI layer (React vs Vue) is written independently in each build.
 */

export type Priority = 'low' | 'medium' | 'high';
export type Filter = 'all' | 'active' | 'done';
export type SortKey = 'created' | 'due' | 'priority' | 'title';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  /** ISO calendar date (YYYY-MM-DD) or empty string when no due date is set. */
  due: string;
  done: boolean;
  /** ISO timestamp, used for the default "newest first" ordering. */
  createdAt: string;
}

/** The editable subset of a task, as captured by the form. */
export interface TaskDraft {
  title: string;
  description: string;
  priority: Priority;
  due: string;
}

export type DraftErrors = Partial<Record<keyof TaskDraft, string>>;

export interface Summary {
  total: number;
  active: number;
  done: number;
  overdue: number;
}

export interface PersistedState {
  tasks: Task[];
  filter: Filter;
  sort: SortKey;
}

export const STORAGE_KEY = 'twin-taskboard:v1';
export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 500;

export const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high'];
export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const FILTERS: readonly Filter[] = ['all', 'active', 'done'];
export const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  active: 'Active',
  done: 'Done',
};

export const SORT_LABELS: Record<SortKey, string> = {
  created: 'Newest first',
  due: 'Due date',
  priority: 'Priority',
  title: 'Title A–Z',
};
export const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const EMPTY_DRAFT: TaskDraft = {
  title: '',
  description: '',
  priority: 'medium',
  due: '',
};

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  // Rejects impossible dates such as 2026-02-31 that Date would roll over.
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
}

export function validateDraft(draft: TaskDraft): DraftErrors {
  const errors: DraftErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters.`;
  if (draft.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters.`;
  }
  if (!PRIORITIES.includes(draft.priority)) errors.priority = 'Choose a valid priority.';
  if (draft.due && !isValidISODate(draft.due)) errors.due = 'Enter a valid date.';
  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Normalises a draft (trimmed text) before it is stored. */
function cleanDraft(draft: TaskDraft): TaskDraft {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    priority: draft.priority,
    due: draft.due,
  };
}

export function createTask(draft: TaskDraft, now: Date = new Date(), id: string = newId()): Task {
  return { id, ...cleanDraft(draft), done: false, createdAt: now.toISOString() };
}

export function updateTask(task: Task, draft: TaskDraft): Task {
  return { ...task, ...cleanDraft(draft) };
}

export function toDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    due: task.due,
  };
}

export function isOverdue(task: Task, today: string): boolean {
  return !task.done && task.due !== '' && task.due < today;
}

export function filterTasks(tasks: Task[], filter: Filter, query: string): Task[] {
  const needle = query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (filter === 'active' && task.done) return false;
    if (filter === 'done' && !task.done) return false;
    if (!needle) return true;
    return (
      task.title.toLowerCase().includes(needle) ||
      task.description.toLowerCase().includes(needle)
    );
  });
}

/** Returns a new, sorted array. Ties fall back to newest-first for a stable, predictable order. */
export function sortTasks(tasks: Task[], sort: SortKey): Task[] {
  const newestFirst = (a: Task, b: Task) => b.createdAt.localeCompare(a.createdAt);
  const comparators: Record<SortKey, (a: Task, b: Task) => number> = {
    created: newestFirst,
    // Tasks without a due date go last.
    due: (a, b) => {
      if (a.due === b.due) return newestFirst(a, b);
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    },
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || newestFirst(a, b),
    title: (a, b) =>
      a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) || newestFirst(a, b),
  };
  return [...tasks].sort(comparators[sort]);
}

export function summarize(tasks: Task[], today: string): Summary {
  const done = tasks.filter((t) => t.done).length;
  return {
    total: tasks.length,
    active: tasks.length - done,
    done,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
  };
}

/** Human-readable due date, e.g. "Due 2026-11-30". Kept as ISO so both builds render identically in any locale. */
export function formatDue(due: string): string {
  return due ? `Due ${due}` : 'No due date';
}

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.title === 'string' &&
    typeof v.description === 'string' &&
    typeof v.priority === 'string' &&
    typeof v.due === 'string' &&
    typeof v.done === 'boolean' &&
    typeof v.createdAt === 'string' &&
    !hasErrors(
      validateDraft({
        title: v.title,
        description: v.description,
        priority: v.priority as Priority,
        due: v.due,
      }),
    )
  );
}

export type ImportResult = { ok: true; tasks: Task[] } | { ok: false; error: string };

/**
 * Parses an exported JSON file. Accepts either the export envelope
 * ({ app, version, tasks }) or a bare array of tasks. Import is all-or-nothing:
 * one invalid task rejects the whole file so existing data is never half-replaced.
 */
export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && Array.isArray((data as { tasks?: unknown }).tasks)
      ? (data as { tasks: unknown[] }).tasks
      : null;
  if (!list) return { ok: false, error: 'No task list found in file.' };
  const invalid = list.findIndex((item) => !isTask(item));
  if (invalid !== -1) return { ok: false, error: `Task #${invalid + 1} is invalid.` };
  const ids = new Set(list.map((t) => (t as Task).id));
  if (ids.size !== list.length) return { ok: false, error: 'File contains duplicate task ids.' };
  // Strip unknown keys so only the documented shape is stored.
  const tasks = (list as Task[]).map(({ id, title, description, priority, due, done, createdAt }) => ({
    id,
    title: title.trim(),
    description: description.trim(),
    priority,
    due,
    done,
    createdAt,
  }));
  return { ok: true, tasks };
}

export function serializeExport(tasks: Task[]): string {
  return JSON.stringify({ app: 'twin-taskboard', version: 1, tasks }, null, 2);
}

/** Synthetic demo data. Dates are relative to "today" so the overdue state is always demonstrable. */
export function seedTasks(now: Date = new Date()): Task[] {
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const day = (offset: number) => toISODate(addDays(now, offset));
  return [
    {
      id: 'seed-1',
      title: 'Draft the release notes',
      description: 'Summarise the changes for version 1.0 in plain language.',
      priority: 'high',
      due: day(2),
      done: false,
      createdAt: at(10),
    },
    {
      id: 'seed-2',
      title: 'Renew the domain name',
      description: 'The registrar sends a reminder, but do not wait for it.',
      priority: 'medium',
      due: day(-1),
      done: false,
      createdAt: at(20),
    },
    {
      id: 'seed-3',
      title: 'Water the office plants',
      description: '',
      priority: 'low',
      due: '',
      done: true,
      createdAt: at(30),
    },
    {
      id: 'seed-4',
      title: 'Book the team retrospective',
      description: 'Find a 45 minute slot that works for everyone.',
      priority: 'medium',
      due: day(7),
      done: false,
      createdAt: at(40),
    },
  ];
}

const DEFAULT_STATE = (now: Date): PersistedState => ({
  tasks: seedTasks(now),
  filter: 'all',
  sort: 'created',
});

/**
 * Reads persisted state. First visit (no key) gets demo data; corrupted
 * storage falls back to demo data instead of crashing the app.
 */
export function loadState(storage: Pick<Storage, 'getItem'>, now: Date = new Date()): PersistedState {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_STATE(now);
  try {
    const data = JSON.parse(raw) as Partial<PersistedState>;
    const parsed = parseImport(JSON.stringify(data.tasks ?? null));
    if (!parsed.ok) return DEFAULT_STATE(now);
    return {
      tasks: parsed.tasks,
      filter: FILTERS.includes(data.filter as Filter) ? (data.filter as Filter) : 'all',
      sort: SORT_KEYS.includes(data.sort as SortKey) ? (data.sort as SortKey) : 'created',
    };
  } catch {
    return DEFAULT_STATE(now);
  }
}

export function saveState(storage: Pick<Storage, 'setItem'>, state: PersistedState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Triggers a browser download of the given JSON text. */
export function downloadJson(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoke on the next tick so the browser has started the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function pluralTasks(count: number): string {
  return `${count} ${count === 1 ? 'task' : 'tasks'}`;
}
