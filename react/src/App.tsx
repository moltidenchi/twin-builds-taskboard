import { useEffect, useMemo, useRef, useState } from 'react';
import { DataPanel } from './components/DataPanel';
import { Summary } from './components/Summary';
import { TaskForm } from './components/TaskForm';
import { TaskItem } from './components/TaskItem';
import { Toolbar } from './components/Toolbar';
import {
  EMPTY_DRAFT,
  createTask,
  downloadJson,
  filterTasks,
  hasErrors,
  isOverdue,
  loadState,
  parseImport,
  pluralTasks,
  saveState,
  seedTasks,
  serializeExport,
  sortTasks,
  summarize,
  toDraft,
  toISODate,
  updateTask,
  validateDraft,
  type DraftErrors,
  type Filter,
  type SortKey,
  type Task,
  type TaskDraft,
} from './lib/tasks';

/** Root component: owns all state and wires the presentational components together. */
export default function App() {
  // Lazy initialiser so localStorage is read once, not on every render.
  const [initial] = useState(() => loadState(window.localStorage));
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [filter, setFilter] = useState<Filter>(initial.filter);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // FR-11: persist tasks and view preferences on every change.
  useEffect(() => {
    saveState(window.localStorage, { tasks, filter, sort });
  }, [tasks, filter, sort]);

  // FR-12: "/" jumps to search unless the user is already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const today = toISODate(new Date());
  const summary = useMemo(() => summarize(tasks, today), [tasks, today]);
  const visible = useMemo(
    () => sortTasks(filterTasks(tasks, filter, query), sort),
    [tasks, filter, query, sort],
  );

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setEditingId(null);
  };

  const handleChange = (field: keyof TaskDraft, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    // Clear a field's error as soon as the user starts fixing it.
    setErrors(({ [field]: _removed, ...rest }) => rest);
  };

  const handleSubmit = () => {
    const found = validateDraft(draft);
    if (hasErrors(found)) {
      setErrors(found);
      setStatus('Please fix the highlighted fields.');
      return;
    }
    if (editingId) {
      setTasks((list) => list.map((t) => (t.id === editingId ? updateTask(t, draft) : t)));
      setStatus('Task updated.');
    } else {
      setTasks((list) => [createTask(draft), ...list]);
      setStatus('Task added.');
    }
    resetForm();
    titleRef.current?.focus();
  };

  const handleEdit = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setEditingId(id);
    setDraft(toDraft(task));
    setErrors({});
    titleRef.current?.focus();
  };

  const handleCancel = () => {
    resetForm();
    setStatus('Edit cancelled.');
    titleRef.current?.focus();
  };

  const handleToggle = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    setStatus(task.done ? 'Task marked as active.' : 'Task marked as done.');
  };

  const handleDelete = (id: string) => {
    setTasks((list) => list.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
    setStatus('Task deleted.');
  };

  const handleExport = () => {
    downloadJson(`twin-taskboard-${today}.json`, serializeExport(tasks));
    setStatus(`Exported ${pluralTasks(tasks.length)}.`);
  };

  const handleImport = (text: string) => {
    const result = parseImport(text);
    if (!result.ok) {
      setStatus(`Import failed: ${result.error}`);
      return;
    }
    setTasks(result.tasks);
    resetForm();
    setStatus(`Imported ${pluralTasks(result.tasks.length)}.`);
  };

  const handleClearDone = () => {
    const removed = tasks.filter((t) => t.done).length;
    setTasks((list) => list.filter((t) => !t.done));
    if (editingId && tasks.find((t) => t.id === editingId)?.done) resetForm();
    setStatus(`Cleared ${removed} completed ${removed === 1 ? 'task' : 'tasks'}.`);
  };

  const handleReset = () => {
    setTasks(seedTasks());
    setFilter('all');
    setSort('created');
    setQuery('');
    resetForm();
    setStatus('Demo data restored.');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Twin Taskboard</h1>
        <p className="tagline">Plan, track and finish your tasks.</p>
      </header>
      <main>
        <Summary summary={summary} />
        <TaskForm
          ref={titleRef}
          draft={draft}
          errors={errors}
          editing={editingId !== null}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
        <section className="panel list-panel" aria-labelledby="list-heading">
          <h2 id="list-heading">Tasks</h2>
          <Toolbar
            ref={searchRef}
            filter={filter}
            query={query}
            sort={sort}
            onFilter={setFilter}
            onQuery={setQuery}
            onSort={setSort}
          />
          {tasks.length === 0 ? (
            <p className="empty-state">No tasks yet. Add your first task above.</p>
          ) : visible.length === 0 ? (
            <p className="empty-state">No tasks match the current filter or search.</p>
          ) : (
            <>
              <p className="result-count" data-testid="result-count">
                Showing {visible.length} of {pluralTasks(tasks.length)}
              </p>
              <ul className="task-list">
                {visible.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    overdue={isOverdue(task, today)}
                    editing={task.id === editingId}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </>
          )}
        </section>
        <DataPanel
          canClear={summary.done > 0}
          onExport={handleExport}
          onImport={handleImport}
          onClearDone={handleClearDone}
          onReset={handleReset}
        />
      </main>
      <p className="status" role="status" aria-live="polite" data-testid="status">
        {status}
      </p>
      <footer className="app-footer">
        Your tasks are stored only in this browser (localStorage). No account, no server.
      </footer>
    </div>
  );
}
