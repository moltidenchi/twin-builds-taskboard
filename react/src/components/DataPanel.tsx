import type { ChangeEvent } from 'react';

interface Props {
  canClear: boolean;
  onExport: () => void;
  onImport: (text: string) => void;
  onClearDone: () => void;
  onReset: () => void;
}

/** FR-11 / FR-13 / FR-14: JSON export/import, clear completed and demo reset. */
export function DataPanel({ canClear, onExport, onImport, onClearDone, onReset }: Props) {
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    onImport(await file.text());
    // Reset so importing the same file twice still fires a change event.
    input.value = '';
  };

  return (
    <section className="panel data-panel" aria-labelledby="data-heading">
      <h2 id="data-heading">Data</h2>
      <div className="data-actions">
        <button type="button" className="btn" onClick={onExport}>
          Export JSON
        </button>
        <label className="btn file-btn">
          Import JSON
          <input
            type="file"
            className="visually-hidden"
            accept="application/json,.json"
            onChange={handleFile}
          />
        </label>
        <button type="button" className="btn" disabled={!canClear} onClick={onClearDone}>
          Clear completed
        </button>
        <button type="button" className="btn" onClick={onReset}>
          Reset demo data
        </button>
      </div>
    </section>
  );
}
