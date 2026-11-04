import { Button } from '@/components/ui/button'

export default function RecordPagination({ page, cursor, onPage }) {
  if (!cursor && !page.next_cursor && !page.prev_cursor) return null
  return <nav aria-label="Record pages" className="mt-4 flex flex-wrap items-center gap-2">
    <Button variant="outline" size="sm" disabled={!page.prev_cursor} onClick={() => onPage(page.prev_cursor)}>Previous</Button>
    <span className="text-xs text-[var(--color-text-muted)]" aria-label="Up to 25 records per page">25 / page</span>
    <Button variant="outline" size="sm" disabled={!page.next_cursor} onClick={() => onPage(page.next_cursor)}>Next</Button>
    {cursor && !page.prev_cursor && <Button variant="ghost" size="sm" onClick={() => onPage(null)}>First page</Button>}
  </nav>
}
