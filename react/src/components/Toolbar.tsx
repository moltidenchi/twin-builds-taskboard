import { forwardRef } from 'react';
import { FILTERS, FILTER_LABELS, SORT_KEYS, SORT_LABELS, type Filter, type SortKey } from '../lib/tasks';

interface Props {
  filter: Filter;
  query: string;
  sort: SortKey;
  onFilter: (filter: Filter) => void;
  onQuery: (query: string) => void;
  onSort: (sort: SortKey) => void;
}

/** FR-6 / FR-7 / FR-8: status filter, free-text search and sort order. `ref` targets the search box. */
export const Toolbar = forwardRef<HTMLInputElement, Props>(function Toolbar(
  { filter, query, sort, onFilter, onQuery, onSort },
  searchRef,
) {
  return (
    <div className="toolbar">
      <div className="filters" role="group" aria-label="Filter tasks">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`chip${filter === f ? ' is-active' : ''}`}
            aria-pressed={filter === f}
            onClick={() => onFilter(f)}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>
      <label className="search">
        <span className="visually-hidden">Search tasks</span>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search tasks… (press / to focus)"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>
      <div className="sort">
        <label htmlFor="task-sort">Sort by</label>
        <select id="task-sort" value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
});
