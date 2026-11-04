import { Fragment } from 'react'
import { cn } from '@/lib/utils'

export function DataTable({ columns, rows, mobileRows, emptyState, mobileBreakpoint = 'sm', rowKeys = [], rowDetails = [] }) {
  const isEmpty = rows.length === 0
  const roomyTable = columns.length > 5 || (mobileBreakpoint === 'lg' && columns.length > 4)
  return <div className={cn('clinic-records', mobileRows && 'clinic-records-responsive', roomyTable && 'clinic-records-wide')}>
    {mobileRows && <div className="clinic-record-cards flex flex-col gap-3 min-w-0">{isEmpty ? emptyState : mobileRows}</div>}
    <div className="clinic-table-shell">
      <table className="clinic-table">
        <thead><tr>{columns.map((column, index) => <th scope="col" key={index}>{column || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
        <tbody>{isEmpty ? <tr><td colSpan={columns.length}>{emptyState}</td></tr> : rows.map((cells, rowIndex) => <Fragment key={rowKeys[rowIndex] ?? rowIndex}>
          <tr>{cells.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          {rowDetails[rowIndex] && <tr id={rowDetails[rowIndex].id} hidden={!rowDetails[rowIndex].expanded}><td colSpan={columns.length}>{rowDetails[rowIndex].content}</td></tr>}
        </Fragment>)}</tbody>
      </table>
    </div>
  </div>
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
