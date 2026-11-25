<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { PRIORITY_LABELS, formatDue, type Task } from '../lib/tasks';

/** FR-4 / FR-5 / FR-10: one task row with done toggle, edit and two-step delete. */
const props = defineProps<{ task: Task; overdue: boolean; editing: boolean }>();
const emit = defineEmits<{ toggle: [id: string]; edit: [id: string]; delete: [id: string] }>();

// Delete needs an explicit second click so a stray click never loses data.
const confirming = ref(false);
const keepButton = ref<HTMLButtonElement | null>(null);
const deleteButton = ref<HTMLButtonElement | null>(null);

// FR-5 / FR-12: focus the safe "Keep" choice when asking, and return focus to
// "Delete" when the user keeps the task, so keyboard users never lose their place.
watch(confirming, async (now) => {
  await nextTick();
  (now ? keepButton : deleteButton).value?.focus();
});

const classes = computed(() => [
  'task-item',
  `priority-${props.task.priority}`,
  { 'is-done': props.task.done, 'is-overdue': props.overdue, 'is-editing': props.editing },
]);
</script>

<template>
  <li :class="classes" data-testid="task-item">
    <input
      type="checkbox"
      class="task-toggle"
      :checked="task.done"
      :aria-label="`Mark as done: ${task.title}`"
      @change="emit('toggle', task.id)"
    />
    <div class="task-body">
      <p class="task-title">{{ task.title }}</p>
      <p v-if="task.description" class="task-description">{{ task.description }}</p>
      <div class="task-meta">
        <span :class="['badge', `badge-${task.priority}`]">{{ PRIORITY_LABELS[task.priority] }}</span>
        <span class="due">{{ formatDue(task.due) }}</span>
        <span v-if="overdue" class="overdue-label">Overdue</span>
      </div>
    </div>
    <div class="task-actions">
      <template v-if="confirming">
        <span class="confirm-text">Delete this task?</span>
        <button
          type="button"
          class="btn btn-small btn-danger"
          :aria-label="`Confirm delete: ${task.title}`"
          @click="emit('delete', task.id)"
        >
          Confirm
        </button>
        <button
          ref="keepButton"
          type="button"
          class="btn btn-small"
          :aria-label="`Keep: ${task.title}`"
          @click="confirming = false"
        >
          Keep
        </button>
      </template>
      <template v-else>
        <button type="button" class="btn btn-small" :aria-label="`Edit: ${task.title}`" @click="emit('edit', task.id)">
          Edit
        </button>
        <button
          ref="deleteButton"
          type="button"
          class="btn btn-small btn-danger"
          :aria-label="`Delete: ${task.title}`"
          @click="confirming = true"
        >
          Delete
        </button>
      </template>
    </div>
  </li>
</template>
