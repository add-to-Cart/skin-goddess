import { cn } from '@/lib/utils'

/**
 * DataTable
 * A thin wrapper that provides:
 *  - A styled desktop <table> (hidden on mobile when mobileRows provided)
 *  - Optional mobile card rows (shown on mobile only)
 *
 * When mobileRows is omitted the table scrolls horizontally on small screens.
 *
 * Usage (desktop + mobile):
 *   <DataTable
 *     columns={['Name', 'Phone', 'Status', '']}
 *     rows={clients.map(c => [c.name, c.phone, <Badge>, <Button>])}
 *     mobileRows={clients.map(c => <MobileCard key={c.id} client={c} />)}
 *   />
 */
export function DataTable({ columns, rows, mobileRows, emptyState }) {
  const isEmpty = rows.length === 0

  return (
    <>
      {/* ── Mobile card list ────────────────────────── */}
      {mobileRows && (
        <div className="sm:hidden flex flex-col gap-2">
          {isEmpty
            ? emptyState
            : mobileRows}
        </div>
      )}

      {/* ── Desktop / tablet table ───────────────────── */}
      <div className={cn('overflow-x-auto rounded-xl border border-[var(--color-border)]', mobileRows ? 'hidden sm:block' : 'block')}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: 'var(--color-border-subtle)' }}>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-b border-[var(--color-border)]',
                  )}
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState}
                </td>
              </tr>
            ) : (
              rows.map((cells, ri) => (
                <tr
                  key={ri}
                  className="border-b border-[var(--color-border-subtle)] last:border-0 transition-colors"
                  style={{ background: 'var(--color-surface)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-brand-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                >
                  {cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-3 align-middle"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

/**
 * MobileCard — a generic card row for mobile DataTable views.
 * Pass an array of { label, value } pairs.
 */
export function MobileCard({ children, actions }) {
  return (
    <div
      className="rounded-xl border border-[var(--color-border)] p-4 flex flex-col gap-2"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="flex flex-col gap-1.5">{children}</div>
      {actions && (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border-subtle)] mt-1">
          {actions}
        </div>
      )}
    </div>
  )
}

export function MobileField({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="text-right" style={{ color: 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  )
}
