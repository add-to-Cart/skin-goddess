import { cn } from '@/lib/utils'

export function DataTable({ columns, rows, mobileRows, emptyState }) {
  const isEmpty = rows.length === 0
  return <>
    {mobileRows && <div className="sm:hidden flex flex-col gap-3">{isEmpty ? emptyState : mobileRows}</div>}
    <div className={cn('clinic-table-shell', mobileRows ? 'hidden sm:block' : 'block')}>
      <table className="clinic-table">
        <thead><tr>{columns.map((column, index) => <th scope="col" key={index}>{column || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
        <tbody>{isEmpty ? <tr><td colSpan={columns.length}>{emptyState}</td></tr> : rows.map((cells, rowIndex) => <tr key={rowIndex}>{cells.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </>
}

export function MobileCard({ children, actions }) {
  return <div className="clinic-mobile-record">
    <div className="flex flex-col gap-1.5">{children}</div>
    {actions && <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[var(--color-border)]">{actions}</div>}
  </div>
}

export function MobileField({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return <div className="clinic-mobile-field"><span>{label}</span><span>{value}</span></div>
}
