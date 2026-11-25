import { useEffect, useRef, useState } from 'react';
import { PRIORITY_LABELS, formatDue, type Task } from '../lib/tasks';

interface Props {
  task: Task;
  overdue: boolean;
  editing: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/** FR-4 / FR-5 / FR-10: one task row with done toggle, edit and two-step delete. */
export function TaskItem({ task, overdue, editing, onToggle, onEdit, onDelete }: Props) {
  // Delete needs an explicit second click so a stray click never loses data.
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // FR-5 / FR-12: focus the safe "Keep" choice when asking, and return focus to
  // "Delete" when the user keeps the task, so keyboard users never lose their place.
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
    else if (wasConfirming.current) deleteRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const classes = [
    'task-item',
    `priority-${task.priority}`,
    task.done && 'is-done',
    overdue && 'is-overdue',
    editing && 'is-editing',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={classes} data-testid="task-item">
      <input
        type="checkbox"
        className="task-toggle"
        checked={task.done}
        aria-label={`Mark as done: ${task.title}`}
        onChange={() => onToggle(task.id)}
      />
      <div className="task-body">
        <p className="task-title">{task.title}</p>
        {task.description && <p className="task-description">{task.description}</p>}
        <div className="task-meta">
          <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
          <span className="due">{formatDue(task.due)}</span>
          {overdue && <span className="overdue-label">Overdue</span>}
        </div>
      </div>
      <div className="task-actions">
        {confirming ? (
          <>
            <span className="confirm-text">Delete this task?</span>
            <button
              type="button"
              className="btn btn-small btn-danger"
              aria-label={`Confirm delete: ${task.title}`}
              onClick={() => onDelete(task.id)}
            >
              Confirm
            </button>
            <button
              ref={keepRef}
              type="button"
              className="btn btn-small"
              aria-label={`Keep: ${task.title}`}
              onClick={() => setConfirming(false)}
            >
              Keep
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-small"
              aria-label={`Edit: ${task.title}`}
              onClick={() => onEdit(task.id)}
            >
              Edit
            </button>
            <button
              ref={deleteRef}
              type="button"
              className="btn btn-small btn-danger"
              aria-label={`Delete: ${task.title}`}
              onClick={() => setConfirming(true)}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
