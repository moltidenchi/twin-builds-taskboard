import { forwardRef, type FormEvent, type KeyboardEvent } from 'react';
import {
  DESCRIPTION_MAX,
  PRIORITIES,
  PRIORITY_LABELS,
  TITLE_MAX,
  type DraftErrors,
  type TaskDraft,
} from '../lib/tasks';

interface Props {
  draft: TaskDraft;
  errors: DraftErrors;
  editing: boolean;
  onChange: (field: keyof TaskDraft, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * FR-1 / FR-2 / FR-3: shared add + edit form. The parent owns the draft so the
 * same component serves both modes; `ref` points at the title input so the
 * parent can move focus there when editing starts.
 */
export const TaskForm = forwardRef<HTMLInputElement, Props>(function TaskForm(
  { draft, errors, editing, onChange, onSubmit, onCancel },
  titleRef,
) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  // FR-12: Escape abandons an edit without saving.
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && editing) {
      event.preventDefault();
      onCancel();
    }
  };

  const errorProps = (field: keyof TaskDraft) =>
    errors[field]
      ? { 'aria-invalid': true as const, 'aria-describedby': `task-${field}-error` }
      : {};

  const errorText = (field: keyof TaskDraft) =>
    errors[field] ? (
      <p className="field-error" id={`task-${field}-error`} role="alert">
        {errors[field]}
      </p>
    ) : null;

  return (
    <section className="panel form-panel" aria-labelledby="form-heading">
      <h2 id="form-heading">{editing ? 'Edit task' : 'Add a task'}</h2>
      <form className="task-form" noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="field field-title">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            ref={titleRef}
            type="text"
            autoComplete="off"
            placeholder={`What needs doing? (max ${TITLE_MAX} characters)`}
            value={draft.title}
            onChange={(e) => onChange('title', e.target.value)}
            {...errorProps('title')}
          />
          {errorText('title')}
        </div>
        <div className="field field-description">
          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            rows={3}
            placeholder={`Optional details (max ${DESCRIPTION_MAX} characters)`}
            value={draft.description}
            onChange={(e) => onChange('description', e.target.value)}
            {...errorProps('description')}
          />
          {errorText('description')}
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              value={draft.priority}
              onChange={(e) => onChange('priority', e.target.value)}
              {...errorProps('priority')}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            {errorText('priority')}
          </div>
          <div className="field">
            <label htmlFor="task-due">Due date</label>
            <input
              id="task-due"
              type="date"
              value={draft.due}
              onChange={(e) => onChange('due', e.target.value)}
              {...errorProps('due')}
            />
            {errorText('due')}
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editing ? 'Save changes' : 'Add task'}
          </button>
          {editing && (
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
});
