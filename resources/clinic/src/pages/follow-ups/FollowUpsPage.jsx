import StatusFilter from '@/components/shared/StatusFilter'
import RecordSearch from '@/components/shared/RecordSearch'
import RecordPagination from '@/components/shared/RecordPagination'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Plus, Pencil } from 'lucide-react'
import followUpsService from '@/services/followUpsService'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import FollowUpForm from './FollowUpForm'

const STATUS_FILTERS = ['all', 'upcoming', 'due', 'completed', 'cancelled']
const STATUS_VARIANT = {
  upcoming:  'info',
  due:       'warning',
  completed: 'success',
  cancelled: 'neutral',
  overdue:   'danger',
}

export default function FollowUpsPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', cursor: null })
  const [page, setPage] = useState({})
  const [items, setItems]          = useState([])
  const [clientMap, setClientMap]  = useState({})
  const [overdueCount, setOverdue] = useState(0)
  const [statusFilter, setStatus]  = useState('all')
  const [loading, setLoading]      = useState(true)
  const [error, setError]          = useState(null)
  const [formOpen, setFormOpen]    = useState(false)
  const [editing, setEditing]      = useState(null)
  const [savingIds, setSavingIds] = useState(new Set())
  const pendingIds = useRef(new Set())
  const loadVersion = useRef(0)
  const [notice, setNotice] = useState('')

  const loadAll = useCallback(() => {
    const params = statusFilter !== 'all' ? { status: statusFilter } : {}
    const version = ++loadVersion.current
    setLoading(true)
    setError(null)
    return Promise.all([
      followUpsService.getPage({ ...params, ...query, include_client: true }),
      followUpsService.getOverdueCount(),
    ])
      .then(([result, overdue]) => {
        if (version !== loadVersion.current) return
        const all = result.data
        setPage(result)
        setItems(all)
        setOverdue(overdue.count)
        const cm = {}
        all.forEach((row) => { if (row.client) cm[row.client_id] = `${row.client.first_name} ${row.client.last_name}` })
        setClientMap(cm)
      })
      .catch((e) => { if (version === loadVersion.current) setError(e.message) })
      .finally(() => { if (version === loadVersion.current) setLoading(false) })
  }, [statusFilter, query])

  useEffect(() => { loadAll(); return () => { loadVersion.current += 1 } }, [loadAll])

  async function markComplete(id) {
    if (pendingIds.current.has(id)) return
    pendingIds.current.add(id)
    setSavingIds(new Set(pendingIds.current))
    try {
      await followUpsService.update(id, { status: 'completed' })
      setNotice(`Reminder #${id} marked completed.`)
      await loadAll()
    } catch (e) {
      setError(e.message)
    } finally {
      pendingIds.current.delete(id)
      setSavingIds(new Set(pendingIds.current))
    }
  }

  const empty = (
    <EmptyState
      icon={CalendarClock}
      title="No follow-ups found"
      description="Schedule follow-up visits to keep clients coming back."
    />
  )

  return (
    <div className="interactive-list min-w-0">
      <PageHeader title="Follow-ups" subtitle="Track client return visits">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Follow-up
        </Button>
      </PageHeader>

      {notice && <p className="mb-4 text-sm" role="status">{notice}</p>}
      {!loading && !error && overdueCount > 0 && (
        <ErrorState
          className="mb-4"
          message={`${overdueCount} overdue follow-up${overdueCount !== 1 ? 's' : ''} — reminders awaiting review.`}
        />
      )}

      <RecordSearch label="Search follow-ups" value={search} onChange={setSearch} onSearch={() => setQuery({ search: search.trim(), cursor: null })}>
        <StatusFilter label="Status" value={statusFilter} options={STATUS_FILTERS} onChange={(status) => { setStatus(status); setQuery((current) => ({ ...current, cursor: null })) }} />
      </RecordSearch>
      <p className="record-results-summary" role="status">{loading ? 'Loading…' : error ? 'Results unavailable' : `${items.length} reminders`}</p>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading follow-ups…" />
      ) : error ? <div><p className="text-sm mb-3">{notice ? 'The action succeeded, but the worklist may need refreshing. Do not repeat a saved action.' : 'Follow-up results could not be confirmed.'}</p><Button variant="outline" onClick={loadAll}>Retry follow-ups</Button></div> : (
        <DataTable
          columns={['Date', 'Client', 'Status', 'Notes', '']}
          rows={items.map((f) => [
            <span className="font-medium whitespace-nowrap">{f.follow_up_date}</span>,
            <Link
              to={`/clients/${f.client_id}`}
              className="font-medium hover:underline"
              style={{ color: 'var(--color-text)' }}
            >
              {clientMap[f.client_id] ?? `Client #${f.client_id}`}
            </Link>,
            <Badge variant={STATUS_VARIANT[f.status] ?? 'neutral'}>{f.status}</Badge>,
            <span className="text-xs max-w-[200px] truncate"
              style={{ color: 'var(--color-text-muted)' }}
              title={f.notes}
            >
              {f.notes ?? '—'}
            </span>,
            f.status !== 'completed' && f.status !== 'cancelled' ? (
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" disabled={savingIds.has(f.id)} onClick={() => markComplete(f.id)}>
                  {savingIds.has(f.id) ? 'Saving…' : 'Mark done'}
                </Button>
                <Button variant="ghost" size="icon" disabled={savingIds.has(f.id)} title={`Edit reminder #${f.id}`} aria-label={`Edit reminder #${f.id}`} onClick={() => { setEditing(f); setFormOpen(true) }}><Pencil aria-hidden="true" /></Button>
              </div>
            ) : null,
          ])}
          mobileRows={items.map((f) => (
            <MobileCard
              key={f.id}
              actions={
                <>
                  {f.status !== 'completed' && f.status !== 'cancelled' && (
                    <Button variant="ghost" size="sm" disabled={savingIds.has(f.id)} onClick={() => markComplete(f.id)}>
                      {savingIds.has(f.id) ? 'Saving…' : 'Mark done'}
                    </Button>
                  )}
                  {f.status !== 'completed' && f.status !== 'cancelled' && <Button variant="ghost" size="icon" disabled={savingIds.has(f.id)} title={`Edit reminder #${f.id}`} aria-label={`Edit reminder #${f.id}`} onClick={() => { setEditing(f); setFormOpen(true) }}><Pencil aria-hidden="true" /></Button>}
                  <Link
                    to={`/clients/${f.client_id}`}
                    className="inline-flex items-center min-h-11 text-sm hover:underline ml-auto"
                    style={{ color: 'var(--color-brand-strong)' }}
                  >
                    View client →
                  </Link>
                </>
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {clientMap[f.client_id] ?? `Client #${f.client_id}`}
                </span>
                <Badge variant={STATUS_VARIANT[f.status] ?? 'neutral'}>{f.status}</Badge>
              </div>
              <MobileField label="Date" value={f.follow_up_date} />
              {f.notes && <MobileField label="Notes" value={f.notes} />}
            </MobileCard>
          ))}
          emptyState={empty}
        />
      )}

      {!loading && !error && <RecordPagination page={page} cursor={query.cursor} onPage={(cursor) => setQuery((current) => ({ ...current, cursor }))} />}

      <FollowUpForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSaved={() => { setFormOpen(false); setEditing(null); setNotice('Reminder saved.'); loadAll() }}
        clientContext={editing ? `${clientMap[editing.client_id] || 'Name unavailable'} · Client #${editing.client_id} · Reminder #${editing.id}` : ''}
        followUp={editing}
      />
    </div>
  )
}
