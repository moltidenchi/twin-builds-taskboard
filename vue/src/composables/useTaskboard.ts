import { computed, reactive, ref, watch } from 'vue';
import {
  EMPTY_DRAFT,
  createTask,
  downloadJson,
  filterTasks,
  hasErrors,
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
} from '../lib/tasks';

/**
 * All Taskboard state and actions as a Vue composable. Components stay
 * presentational; App.vue wires this store to them. Each action returns
 * nothing and reports its outcome through `status` (FR-15).
 */
export function useTaskboard(storage: Storage = window.localStorage) {
  const initial = loadState(storage);
  const tasks = ref<Task[]>(initial.tasks);
  const filter = ref<Filter>(initial.filter);
  const sort = ref<SortKey>(initial.sort);
  const query = ref('');
  const draft = reactive<TaskDraft>({ ...EMPTY_DRAFT });
  const errors = ref<DraftErrors>({});
  const editingId = ref<string | null>(null);
  const status = ref('');

  // FR-11: persist tasks and view preferences on every change.
  watch(
    [tasks, filter, sort],
    () => saveState(storage, { tasks: tasks.value, filter: filter.value, sort: sort.value }),
    { deep: true },
  );

  // Reading `tasks` makes "today" re-evaluate on every task change, so overdue
  // flags stay correct across midnight (the React build recomputes per render).
  const today = computed(() => {
    void tasks.value;
    return toISODate(new Date());
  });
  const summary = computed(() => summarize(tasks.value, today.value));
  const visible = computed(() => sortTasks(filterTasks(tasks.value, filter.value, query.value), sort.value));

  function resetForm() {
    Object.assign(draft, EMPTY_DRAFT);
    errors.value = {};
    editingId.value = null;
  }

  function setField(field: keyof TaskDraft, value: string) {
    (draft as Record<keyof TaskDraft, string>)[field] = value;
    // Clear a field's error as soon as the user starts fixing it.
    if (errors.value[field]) {
      const { [field]: _removed, ...rest } = errors.value;
      errors.value = rest;
    }
  }

  /** Returns true when the draft was saved (so the caller can restore focus). */
  function submit(): boolean {
    const found = validateDraft(draft);
    if (hasErrors(found)) {
      errors.value = found;
      status.value = 'Please fix the highlighted fields.';
      return false;
    }
    if (editingId.value) {
      const id = editingId.value;
      tasks.value = tasks.value.map((t) => (t.id === id ? updateTask(t, draft) : t));
      status.value = 'Task updated.';
    } else {
      tasks.value = [createTask(draft), ...tasks.value];
      status.value = 'Task added.';
    }
    resetForm();
    return true;
  }

  function startEdit(id: string) {
    const task = tasks.value.find((t) => t.id === id);
    if (!task) return;
    editingId.value = id;
    Object.assign(draft, toDraft(task));
    errors.value = {};
  }

  function cancelEdit() {
    resetForm();
    status.value = 'Edit cancelled.';
  }

  function toggle(id: string) {
    const task = tasks.value.find((t) => t.id === id);
    if (!task) return;
    tasks.value = tasks.value.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    status.value = task.done ? 'Task marked as active.' : 'Task marked as done.';
  }

  function remove(id: string) {
    tasks.value = tasks.value.filter((t) => t.id !== id);
    if (editingId.value === id) resetForm();
    status.value = 'Task deleted.';
  }

  function exportJson() {
    downloadJson(`twin-taskboard-${today.value}.json`, serializeExport(tasks.value));
    status.value = `Exported ${pluralTasks(tasks.value.length)}.`;
  }

  function importJson(text: string) {
    const result = parseImport(text);
    if (!result.ok) {
      status.value = `Import failed: ${result.error}`;
      return;
    }
    tasks.value = result.tasks;
    resetForm();
    status.value = `Imported ${pluralTasks(result.tasks.length)}.`;
  }

  function clearDone() {
    const removed = tasks.value.filter((t) => t.done).length;
    if (editingId.value && tasks.value.find((t) => t.id === editingId.value)?.done) resetForm();
    tasks.value = tasks.value.filter((t) => !t.done);
    status.value = `Cleared ${removed} completed ${removed === 1 ? 'task' : 'tasks'}.`;
  }

  function resetDemo() {
    tasks.value = seedTasks();
    filter.value = 'all';
    sort.value = 'created';
    query.value = '';
    resetForm();
    status.value = 'Demo data restored.';
  }

  return {
    tasks,
    filter,
    sort,
    query,
    draft,
    errors,
    editingId,
    status,
    today,
    summary,
    visible,
    setField,
    submit,
    startEdit,
    cancelEdit,
    toggle,
    remove,
    exportJson,
    importJson,
    clearDone,
    resetDemo,
  };
}
