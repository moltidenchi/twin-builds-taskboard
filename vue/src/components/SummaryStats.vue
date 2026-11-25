<script setup lang="ts">
import type { Summary } from '../lib/tasks';

/** FR-9: live counts of total / active / done / overdue tasks. */
defineProps<{ summary: Summary }>();

const STATS: { key: keyof Summary; label: string }[] = [
  { key: 'total', label: 'Total' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
  { key: 'overdue', label: 'Overdue' },
];
</script>

<template>
  <section class="summary" aria-label="Summary">
    <div v-for="stat in STATS" :key="stat.key" :class="['stat', `stat-${stat.key}`]">
      <span class="stat-value" :data-testid="`count-${stat.key}`">{{ summary[stat.key] }}</span>
      <span class="stat-label">{{ stat.label }}</span>
    </div>
  </section>
</template>
