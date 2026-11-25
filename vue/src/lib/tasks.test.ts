import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  createTask,
  filterTasks,
  isOverdue,
  loadState,
  parseImport,
  saveState,
  seedTasks,
  serializeExport,
  sortTasks,
  summarize,
  toISODate,
  updateTask,
  validateDraft,
  type Task,
} from './tasks';

const NOW = new Date(2026, 10, 25, 12, 0, 0); // 2026-11-25 local
const TODAY = '2026-11-25';

const task = (over: Partial<Task>): Task => ({
  id: over.id ?? 'x',
  title: 'Task',
  description: '',
  priority: 'medium',
  due: '',
  done: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

describe('validateDraft (FR-3)', () => {
  const base = { title: 'Ok', description: '', priority: 'medium' as const, due: '' };

  it('accepts a minimal valid draft', () => {
    expect(validateDraft(base)).toEqual({});
  });
  it('requires a non-blank title', () => {
    expect(validateDraft({ ...base, title: '   ' }).title).toBe('Title is required.');
  });
  it('limits title and description length', () => {
    expect(validateDraft({ ...base, title: 'a'.repeat(81) }).title).toMatch(/at most 80/);
    expect(validateDraft({ ...base, description: 'a'.repeat(501) }).description).toMatch(/at most 500/);
  });
  it('rejects impossible dates and unknown priorities', () => {
    expect(validateDraft({ ...base, due: '2026-02-31' }).due).toBe('Enter a valid date.');
    expect(validateDraft({ ...base, priority: 'urgent' as never }).priority).toBeDefined();
  });
});

describe('create / update (FR-1, FR-2)', () => {
  it('trims text and starts as not done', () => {
    const t = createTask({ title: '  Hi ', description: ' d ', priority: 'high', due: '' }, NOW, 'id1');
    expect(t).toMatchObject({ id: 'id1', title: 'Hi', description: 'd', done: false });
    expect(t.createdAt).toBe(NOW.toISOString());
  });
  it('keeps id, done and createdAt when updating', () => {
    const t = task({ id: 'a', done: true });
    const u = updateTask(t, { title: 'New', description: '', priority: 'low', due: '2026-12-01' });
    expect(u).toMatchObject({ id: 'a', done: true, title: 'New', priority: 'low', due: '2026-12-01' });
  });
});

describe('filterTasks (FR-6, FR-7)', () => {
  const list = [
    task({ id: '1', title: 'Buy milk', done: false }),
    task({ id: '2', title: 'Pay rent', description: 'Before the 5th', done: true }),
  ];
  it('filters by status', () => {
    expect(filterTasks(list, 'all', '').map((t) => t.id)).toEqual(['1', '2']);
    expect(filterTasks(list, 'active', '').map((t) => t.id)).toEqual(['1']);
    expect(filterTasks(list, 'done', '').map((t) => t.id)).toEqual(['2']);
  });
  it('searches title and description case-insensitively', () => {
    expect(filterTasks(list, 'all', 'MILK').map((t) => t.id)).toEqual(['1']);
    expect(filterTasks(list, 'all', '5th').map((t) => t.id)).toEqual(['2']);
    expect(filterTasks(list, 'active', 'rent')).toEqual([]);
  });
});

describe('sortTasks (FR-8)', () => {
  const list = [
    task({ id: 'a', title: 'beta', priority: 'low', due: '2026-12-10', createdAt: '2026-11-01T00:00:00Z' }),
    task({ id: 'b', title: 'Alpha', priority: 'high', due: '', createdAt: '2026-11-03T00:00:00Z' }),
    task({ id: 'c', title: 'gamma', priority: 'medium', due: '2026-11-30', createdAt: '2026-11-02T00:00:00Z' }),
  ];
  const ids = (key: Parameters<typeof sortTasks>[1]) => sortTasks(list, key).map((t) => t.id);

  it('sorts newest first by default', () => expect(ids('created')).toEqual(['b', 'c', 'a']));
  it('sorts by due date with undated last', () => expect(ids('due')).toEqual(['c', 'a', 'b']));
  it('sorts by priority high to low', () => expect(ids('priority')).toEqual(['b', 'c', 'a']));
  it('sorts by title ignoring case', () => expect(ids('title')).toEqual(['b', 'a', 'c']));
  it('does not mutate the input', () => {
    sortTasks(list, 'title');
    expect(list.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('summary and overdue (FR-9, FR-10)', () => {
  it('counts total, active, done and overdue', () => {
    const list = [
      task({ id: '1', due: '2026-11-24' }),
      task({ id: '2', due: '2026-11-24', done: true }),
      task({ id: '3', due: TODAY }),
    ];
    expect(summarize(list, TODAY)).toEqual({ total: 3, active: 2, done: 1, overdue: 1 });
  });
  it('treats only past, unfinished, dated tasks as overdue', () => {
    expect(isOverdue(task({ due: '2026-11-24' }), TODAY)).toBe(true);
    expect(isOverdue(task({ due: TODAY }), TODAY)).toBe(false);
    expect(isOverdue(task({ due: '' }), TODAY)).toBe(false);
  });
  it('formats local dates without UTC drift', () => {
    expect(toISODate(NOW)).toBe(TODAY);
  });
});

describe('import / export (FR-13)', () => {
  const tasks = seedTasks(NOW);

  it('round-trips the export envelope', () => {
    const result = parseImport(serializeExport(tasks));
    expect(result).toEqual({ ok: true, tasks });
  });
  it('accepts a bare array and strips unknown keys', () => {
    const result = parseImport(JSON.stringify([{ ...tasks[0], extra: 1 }]));
    expect(result.ok && result.tasks[0]).toEqual(tasks[0]);
  });
  it('rejects invalid JSON, missing lists, bad tasks and duplicate ids', () => {
    expect(parseImport('{nope')).toEqual({ ok: false, error: 'File is not valid JSON.' });
    expect(parseImport('{"foo":1}')).toEqual({ ok: false, error: 'No task list found in file.' });
    expect(parseImport(JSON.stringify([{ ...tasks[0], title: '' }]))).toEqual({
      ok: false,
      error: 'Task #1 is invalid.',
    });
    expect(parseImport(JSON.stringify([tasks[0], tasks[0]]))).toEqual({
      ok: false,
      error: 'File contains duplicate task ids.',
    });
  });
});

describe('persistence (FR-11)', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  };

  it('seeds demo data on first load (FR-14)', () => {
    const state = loadState(memory(), NOW);
    expect(state.tasks).toHaveLength(4);
    expect(state).toMatchObject({ filter: 'all', sort: 'created' });
    expect(summarize(state.tasks, TODAY).overdue).toBe(1);
  });
  it('restores saved tasks and view preferences', () => {
    const store = memory();
    saveState(store, { tasks: [task({ id: 'k' })], filter: 'done', sort: 'title' });
    expect(loadState(store, NOW)).toEqual({ tasks: [task({ id: 'k' })], filter: 'done', sort: 'title' });
  });
  it('keeps an intentionally empty list empty', () => {
    const store = memory();
    saveState(store, { tasks: [], filter: 'all', sort: 'created' });
    expect(loadState(store, NOW).tasks).toEqual([]);
  });
  it('falls back to demo data when storage is corrupted', () => {
    const store = memory();
    store.setItem(STORAGE_KEY, '{broken');
    expect(loadState(store, NOW).tasks).toHaveLength(4);
  });
});
