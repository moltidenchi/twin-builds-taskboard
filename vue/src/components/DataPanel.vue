<script setup lang="ts">
/** FR-11 / FR-13 / FR-14: JSON export/import, clear completed and demo reset. */
defineProps<{ canClear: boolean }>();
const emit = defineEmits<{ export: []; import: [text: string]; clearDone: []; reset: [] }>();

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  emit('import', await file.text());
  // Reset so importing the same file twice still fires a change event.
  input.value = '';
}
</script>

<template>
  <section class="panel data-panel" aria-labelledby="data-heading">
    <h2 id="data-heading">Data</h2>
    <div class="data-actions">
      <button type="button" class="btn" @click="emit('export')">Export JSON</button>
      <label class="btn file-btn">
        Import JSON
        <input type="file" class="visually-hidden" accept="application/json,.json" @change="onFile" />
      </label>
      <button type="button" class="btn" :disabled="!canClear" @click="emit('clearDone')">Clear completed</button>
      <button type="button" class="btn" @click="emit('reset')">Reset demo data</button>
    </div>
  </section>
</template>
