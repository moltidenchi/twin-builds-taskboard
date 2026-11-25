<script setup lang="ts">
import { ref } from 'vue';
import { FILTERS, FILTER_LABELS, SORT_KEYS, SORT_LABELS, type Filter, type SortKey } from '../lib/tasks';

/** FR-6 / FR-7 / FR-8: status filter, free-text search and sort order (all v-model bound). */
const filter = defineModel<Filter>('filter', { required: true });
const query = defineModel<string>('query', { required: true });
const sort = defineModel<SortKey>('sort', { required: true });

const searchInput = ref<HTMLInputElement | null>(null);
defineExpose({ focusSearch: () => searchInput.value?.focus() });
</script>

<template>
  <div class="toolbar">
    <div class="filters" role="group" aria-label="Filter tasks">
      <button
        v-for="f in FILTERS"
        :key="f"
        type="button"
        :class="['chip', { 'is-active': filter === f }]"
        :aria-pressed="filter === f"
        @click="filter = f"
      >
        {{ FILTER_LABELS[f] }}
      </button>
    </div>
    <label class="search">
      <span class="visually-hidden">Search tasks</span>
      <input ref="searchInput" v-model="query" type="search" placeholder="Search tasks… (press / to focus)" />
    </label>
    <div class="sort">
      <label for="task-sort">Sort by</label>
      <select id="task-sort" v-model="sort">
        <option v-for="key in SORT_KEYS" :key="key" :value="key">{{ SORT_LABELS[key] }}</option>
      </select>
    </div>
  </div>
</template>
