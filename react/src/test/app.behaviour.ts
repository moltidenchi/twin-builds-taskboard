/**
 * Framework-neutral component specs. This file is identical in react/ and vue/;
 * each build's App test passes in its own `renderApp`. Queries go through
 * accessible roles and labels, so the specs exercise what a user sees rather
 * than framework internals.
 */
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

export function runAppSpecs(renderApp: () => void) {
  const count = (key: string) => screen.getByTestId(`count-${key}`).textContent;
  const titles = () =>
    screen.queryAllByTestId('task-item').map((li) => li.querySelector('.task-title')?.textContent);

  beforeEach(() => {
    window.localStorage.clear();
    renderApp();
  });

  describe('App behaviour', () => {
    it('shows the seeded demo tasks with summary counts (FR-9, FR-14)', () => {
      expect(screen.getByRole('heading', { level: 1, name: 'Twin Taskboard' })).toBeInTheDocument();
      expect(titles()).toHaveLength(4);
      expect([count('total'), count('active'), count('done'), count('overdue')]).toEqual(['4', '3', '1', '1']);
    });

    it('adds a task and announces it (FR-1, FR-15)', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Title'), 'Write unit tests');
      await user.selectOptions(screen.getByLabelText('Priority'), 'high');
      await user.click(screen.getByRole('button', { name: 'Add task' }));
      expect(titles()[0]).toBe('Write unit tests');
      expect(count('total')).toBe('5');
      expect(screen.getByRole('status')).toHaveTextContent('Task added.');
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });

    it('blocks an empty title with an accessible error (FR-3)', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Add task' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Title is required.');
      expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
      expect(count('total')).toBe('4');
      await user.type(screen.getByLabelText('Title'), 'x');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('edits a task and cancels with Escape (FR-2, FR-12)', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Edit: Draft the release notes' }));
      expect(screen.getByRole('heading', { name: 'Edit task' })).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toHaveFocus();
      await user.clear(screen.getByLabelText('Title'));
      await user.type(screen.getByLabelText('Title'), 'Publish the release notes');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(titles()).toContain('Publish the release notes');
      expect(titles()).not.toContain('Draft the release notes');

      await user.click(screen.getByRole('button', { name: 'Edit: Water the office plants' }));
      await user.keyboard('{Escape}');
      expect(screen.getByRole('heading', { name: 'Add a task' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Edit cancelled.');
    });

    it('toggles done and filters by status (FR-4, FR-6)', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('checkbox', { name: 'Mark as done: Renew the domain name' }));
      expect([count('done'), count('overdue')]).toEqual(['2', '0']);
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'true');
      expect(titles().sort()).toEqual(['Renew the domain name', 'Water the office plants']);
      await user.click(screen.getByRole('button', { name: 'Active' }));
      expect(titles()).toHaveLength(2);
    });

    it('deletes only after confirmation (FR-5)', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Delete: Water the office plants' }));
      await user.click(screen.getByRole('button', { name: 'Keep: Water the office plants' }));
      expect(titles()).toContain('Water the office plants');
      await user.click(screen.getByRole('button', { name: 'Delete: Water the office plants' }));
      await user.click(screen.getByRole('button', { name: 'Confirm delete: Water the office plants' }));
      expect(titles()).not.toContain('Water the office plants');
      expect(screen.getByRole('status')).toHaveTextContent('Task deleted.');
    });

    it('searches, sorts and shows the no-match empty state (FR-7, FR-8, FR-10)', async () => {
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText('Sort by'), 'title');
      expect(titles()).toEqual([
        'Book the team retrospective',
        'Draft the release notes',
        'Renew the domain name',
        'Water the office plants',
      ]);
      await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'zzz');
      expect(screen.getByText('No tasks match the current filter or search.')).toBeInTheDocument();
    });

    it('clears completed tasks and shows the empty state (FR-10, FR-14)', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Clear completed' }));
      expect(count('total')).toBe('3');
      expect(screen.getByRole('button', { name: 'Clear completed' })).toBeDisabled();
      for (const title of [...titles()]) {
        const row = screen.getAllByTestId('task-item').find((li) => li.textContent?.includes(title!))!;
        await user.click(within(row).getByRole('button', { name: `Delete: ${title}` }));
        await user.click(within(row).getByRole('button', { name: `Confirm delete: ${title}` }));
      }
      expect(screen.getByText('No tasks yet. Add your first task above.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Reset demo data' }));
      expect(count('total')).toBe('4');
    });

    it('persists changes to localStorage (FR-11)', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Title'), 'Persist me{Enter}');
      const saved = JSON.parse(window.localStorage.getItem('twin-taskboard:v1')!);
      expect(saved.tasks[0].title).toBe('Persist me');
    });

    it('imports a JSON file and reports invalid files (FR-13)', async () => {
      const user = userEvent.setup({ applyAccept: false });
      const input = screen.getByLabelText('Import JSON');
      const good = { app: 'twin-taskboard', version: 1, tasks: [{ id: 'i1', title: 'Imported', description: '', priority: 'low', due: '', done: false, createdAt: '2026-01-01T00:00:00.000Z' }] };
      await user.upload(input, new File([JSON.stringify(good)], 'tasks.json', { type: 'application/json' }));
      await expect.poll(() => titles()).toEqual(['Imported']);
      expect(screen.getByRole('status')).toHaveTextContent('Imported 1 task.');
      await user.upload(input, new File(['nope'], 'bad.json', { type: 'application/json' }));
      await expect.poll(() => screen.getByRole('status').textContent).toBe('Import failed: File is not valid JSON.');
      expect(titles()).toEqual(['Imported']);
    });
  });
}
