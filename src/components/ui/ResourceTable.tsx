import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, LucideIcon, Pencil, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { SkeletonList } from './Skeleton';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Value used for sorting when different from the rendered content. Defaults to row[key]. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
  /** Hide this column in the mobile card layout to reduce clutter. */
  hideOnMobile?: boolean;
}

export interface BulkAction {
  label: string;
  run: (ids: string[]) => void;
  tone?: 'default' | 'danger';
}

interface ResourceTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  /** Keys searched by the built-in search box. Omit to hide search. */
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  /** Filter controls (e.g. a SegmentedControl). Rows should already be filtered by the caller. */
  filters?: React.ReactNode;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  bulkActions?: BulkAction[];
  loading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: React.ReactNode;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  /** Custom mobile card renderer; falls back to a generic label/value list. */
  renderCard?: (row: T) => React.ReactNode;
}

/**
 * Generic, store-backed resource list: built-in search, column sorting, bulk
 * selection, and inline row actions. Responsive (table on desktop, cards on
 * mobile). Filtering lives with the caller via the `filters` slot; this
 * component owns search + sort + selection only.
 */
export function ResourceTable<T>({
  rows,
  columns,
  getId,
  searchKeys,
  searchPlaceholder = 'Search…',
  filters,
  onRowClick,
  onEdit,
  onDelete,
  bulkActions,
  loading,
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptyText = 'Items will appear here.',
  emptyAction,
  initialSort,
  renderCard,
}: ResourceTableProps<T>) {
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const hasActions = Boolean(onEdit || onDelete);
  const hasBulk = Boolean(bulkActions && bulkActions.length > 0);

  const searched = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchKeys?.length) return rows;
    return rows.filter((row) => searchKeys.some((key) => {
      const value = (row as Record<string, unknown>)[key as string];
      const searchable = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
      return searchable.toLowerCase().includes(q);
    }));
  }, [rows, query, searchKeys]);

  const sorted = React.useMemo(() => {
    if (!sort) return searched;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return searched;
    const value = (row: T) => (column.sortValue ? column.sortValue(row) : ((row as Record<string, unknown>)[column.key] as string | number) ?? '');
    return [...searched].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [searched, sort, columns]);

  // Drop selections that are no longer present after filtering.
  const visibleIds = React.useMemo(() => sorted.map(getId), [sorted, getId]);
  React.useEffect(() => {
    setSelected((current) => {
      const next = new Set([...current].filter((id) => visibleIds.includes(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleIds]);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const allSelected = sorted.length > 0 && sorted.every((row) => selected.has(getId(row)));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleIds));

  const onSort = (key: string) => setSort((current) => {
    if (current?.key !== key) return { key, dir: 'asc' };
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  });

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable) return null;
    if (sort?.key !== column.key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const stop = (event: React.MouseEvent) => event.stopPropagation();

  const RowActions = ({ row }: { row: T }) => (
    <div className="flex justify-end gap-1" onClick={stop}>
      {onEdit && (
        <button onClick={() => onEdit(row)} aria-label="Edit" className="rounded-md p-1.5 text-muted transition-colors hover:bg-paper hover:text-ink">
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button onClick={() => onDelete(row)} aria-label="Delete" className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {(filters || searchKeys?.length) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">{filters}</div>
          {searchKeys?.length ? (
            <label className="relative block w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
          ) : null}
        </div>
      )}

      {hasBulk && selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft/50 px-4 py-3">
          <span className="text-sm font-bold text-ink">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            {bulkActions!.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant="ghost"
                className={cn('border border-line', action.tone === 'danger' && 'text-red-600')}
                onClick={() => { action.run([...selected]); setSelected(new Set()); }}
              >
                {action.label}
              </Button>
            ))}
            <Button size="sm" variant="quiet" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={5} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={rows.length === 0 ? emptyTitle : 'No matches'}
          description={rows.length === 0 ? emptyText : 'Try a different search or filter.'}
          action={rows.length === 0 ? emptyAction : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-widest text-muted">
                  {hasBulk && (
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" className="accent-accent" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                    </th>
                  )}
                  {columns.map((column) => (
                    <th key={column.key} className={cn('px-4 py-3', column.align === 'right' && 'text-right')}>
                      {column.sortable ? (
                        <button onClick={() => onSort(column.key)} className={cn('inline-flex items-center gap-1 uppercase tracking-widest hover:text-ink', column.align === 'right' && 'flex-row-reverse')}>
                          {column.label}
                          <SortIcon column={column} />
                        </button>
                      ) : column.label}
                    </th>
                  ))}
                  {hasActions && <th className="w-20 px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const id = getId(row);
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn('border-b border-line/60 transition-colors last:border-b-0', onRowClick && 'cursor-pointer hover:bg-paper/60', selected.has(id) && 'bg-accent-soft/30')}
                    >
                      {hasBulk && (
                        <td className="px-4 py-3" onClick={stop}>
                          <input type="checkbox" className="accent-accent" checked={selected.has(id)} onChange={() => toggle(id)} aria-label="Select row" />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column.key} className={cn('px-4 py-3', column.align === 'right' && 'text-right')}>
                          {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                        </td>
                      ))}
                      {hasActions && <td className="px-4 py-3"><RowActions row={row} /></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {sorted.map((row) => {
              const id = getId(row);
              return (
                <div
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn('rounded-2xl border border-line bg-surface p-4 shadow-sm', onRowClick && 'cursor-pointer', selected.has(id) && 'border-accent/40 bg-accent-soft/20')}
                >
                  <div className="flex items-start gap-3">
                    {hasBulk && (
                      <input type="checkbox" className="mt-1 accent-accent" checked={selected.has(id)} onChange={() => toggle(id)} onClick={stop} aria-label="Select row" />
                    )}
                    <div className="min-w-0 flex-1">
                      {renderCard ? renderCard(row) : (
                        <div className="space-y-1.5">
                          {columns.filter((c) => !c.hideOnMobile).map((column) => (
                            <div key={column.key} className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{column.label}</span>
                              <span className="min-w-0 truncate text-right text-sm font-semibold text-ink">
                                {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {hasActions && <div className="mt-3 border-t border-line/60 pt-3"><RowActions row={row} /></div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
