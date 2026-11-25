<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import DataPanel from './components/DataPanel.vue';
import SummaryStats from './components/SummaryStats.vue';
import TaskForm from './components/TaskForm.vue';
import TaskItem from './components/TaskItem.vue';
import TaskToolbar from './components/TaskToolbar.vue';
import { useTaskboard } from './composables/useTaskboard';
import { isOverdue, pluralTasks } from './lib/tasks';

/** Root component: wires the useTaskboard store to presentational components. */
const board = useTaskboard();
const { tasks, filter, sort, query, draft, errors, editingId, status, today, summary, visible } = board;

const form = ref<InstanceType<typeof TaskForm> | null>(null);
const toolbar = ref<InstanceType<typeof TaskToolbar> | null>(null);

const focusTitle = () => nextTick(() => form.value?.focusTitle());

function onSubmit() {
  if (board.submit()) focusTitle();
}
function onEdit(id: string) {
  board.startEdit(id);
  focusTitle();
}
function onCancel() {
  board.cancelEdit();
  focusTitle();
}

// FR-12: "/" jumps to search unless the user is already typing somewhere.
function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
  if (event.key === '/' && !typing) {
    event.preventDefault();
    toolbar.value?.focusSearch();
  }
}
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Twin Taskboard</h1>
      <p class="tagline">Plan, track and finish your tasks.</p>
    </header>
    <main>
      <SummaryStats :summary="summary" />
      <TaskForm
        ref="form"
        :draft="draft"
        :errors="errors"
        :editing="editingId !== null"
        @change="board.setField"
        @submit="onSubmit"
        @cancel="onCancel"
      />
      <section class="panel list-panel" aria-labelledby="list-heading">
        <h2 id="list-heading">Tasks</h2>
        <TaskToolbar ref="toolbar" v-model:filter="filter" v-model:query="query" v-model:sort="sort" />
        <p v-if="tasks.length === 0" class="empty-state">No tasks yet. Add your first task above.</p>
        <p v-else-if="visible.length === 0" class="empty-state">No tasks match the current filter or search.</p>
        <template v-else>
          <p class="result-count" data-testid="result-count">
            Showing {{ visible.length }} of {{ pluralTasks(tasks.length) }}
          </p>
          <ul class="task-list">
            <TaskItem
              v-for="task in visible"
              :key="task.id"
              :task="task"
              :overdue="isOverdue(task, today)"
              :editing="task.id === editingId"
              @toggle="board.toggle"
              @edit="onEdit"
              @delete="board.remove"
            />
          </ul>
        </template>
      </section>
      <DataPanel
        :can-clear="summary.done > 0"
        @export="board.exportJson"
        @import="board.importJson"
        @clear-done="board.clearDone"
        @reset="board.resetDemo"
      />
    </main>
    <p class="status" role="status" aria-live="polite" data-testid="status">{{ status }}</p>
    <footer class="app-footer">Your tasks are stored only in this browser (localStorage). No account, no server.</footer>
  </div>
</template>
