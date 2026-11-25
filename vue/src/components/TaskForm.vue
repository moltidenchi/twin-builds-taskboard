<script setup lang="ts">
import { ref } from 'vue';
import {
  DESCRIPTION_MAX,
  PRIORITIES,
  PRIORITY_LABELS,
  TITLE_MAX,
  type DraftErrors,
  type TaskDraft,
} from '../lib/tasks';

/**
 * FR-1 / FR-2 / FR-3: shared add + edit form. The parent owns the draft;
 * `focusTitle` is exposed so the parent can move focus when editing starts.
 */
const props = defineProps<{ draft: TaskDraft; errors: DraftErrors; editing: boolean }>();
const emit = defineEmits<{
  change: [field: keyof TaskDraft, value: string];
  submit: [];
  cancel: [];
}>();

const titleInput = ref<HTMLInputElement | null>(null);
defineExpose({ focusTitle: () => titleInput.value?.focus() });

// FR-12: Escape abandons an edit without saving.
function onEscape(event: KeyboardEvent) {
  if (!props.editing) return;
  event.preventDefault();
  emit('cancel');
}

/** Accessibility attributes tying an invalid field to its error message. */
function errorAttrs(field: keyof TaskDraft) {
  return props.errors[field]
    ? { 'aria-invalid': true, 'aria-describedby': `task-${field}-error` }
    : {};
}

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;
</script>

<template>
  <section class="panel form-panel" aria-labelledby="form-heading">
    <h2 id="form-heading">{{ editing ? 'Edit task' : 'Add a task' }}</h2>
    <form class="task-form" novalidate @submit.prevent="emit('submit')" @keydown.esc="onEscape">
      <div class="field field-title">
        <label for="task-title">Title</label>
        <input
          id="task-title"
          ref="titleInput"
          type="text"
          autocomplete="off"
          :placeholder="`What needs doing? (max ${TITLE_MAX} characters)`"
          :value="draft.title"
          v-bind="errorAttrs('title')"
          @input="emit('change', 'title', valueOf($event))"
        />
        <p v-if="errors.title" id="task-title-error" class="field-error" role="alert">{{ errors.title }}</p>
      </div>
      <div class="field field-description">
        <label for="task-description">Description</label>
        <textarea
          id="task-description"
          rows="3"
          :placeholder="`Optional details (max ${DESCRIPTION_MAX} characters)`"
          :value="draft.description"
          v-bind="errorAttrs('description')"
          @input="emit('change', 'description', valueOf($event))"
        ></textarea>
        <p v-if="errors.description" id="task-description-error" class="field-error" role="alert">
          {{ errors.description }}
        </p>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="task-priority">Priority</label>
          <select
            id="task-priority"
            :value="draft.priority"
            v-bind="errorAttrs('priority')"
            @change="emit('change', 'priority', valueOf($event))"
          >
            <option v-for="p in PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABELS[p] }}</option>
          </select>
          <p v-if="errors.priority" id="task-priority-error" class="field-error" role="alert">
            {{ errors.priority }}
          </p>
        </div>
        <div class="field">
          <label for="task-due">Due date</label>
          <input
            id="task-due"
            type="date"
            :value="draft.due"
            v-bind="errorAttrs('due')"
            @input="emit('change', 'due', valueOf($event))"
          />
          <p v-if="errors.due" id="task-due-error" class="field-error" role="alert">{{ errors.due }}</p>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">{{ editing ? 'Save changes' : 'Add task' }}</button>
        <button v-if="editing" type="button" class="btn" @click="emit('cancel')">Cancel</button>
      </div>
    </form>
  </section>
</template>
