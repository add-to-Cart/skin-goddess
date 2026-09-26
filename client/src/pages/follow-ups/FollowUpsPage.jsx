import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import followUpsService from '@/services/followUpsService'
import clientsService from '@/services/clientsService'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STATUS_FILTERS = ['all', 'upcoming', 'due', 'completed', 'cancelled']
const STATUS_VARIANT = {
  upcoming:  'info',
  due:       'warning',
  completed: 'success',
  cancelled: 'neutral',
  overdue:   'danger',
}

export default function FollowUpsPage() {
  const [items, setItems]          = useState([])
  const [clientMap, setClientMap]  = useState({})
  const [overdueCount, setOverdue] = useState(0)
  const [statusFilter, setStatus]  = useState('all')
  const [loading, setLoading]      = useState(true)
  const [error, setError]          = useState(null)

  useEffect(() => {
    const params = statusFilter !== 'all' ? { status: statusFilter } : {}
    setLoading(true)

    Promise.all([
      followUpsService.getAll(params),
      followUpsService.getOverdue(),
      clientsService.getAll(),
    ])
      .then(([all, overdue, clients]) => {
        setItems(all)
        setOverdue(overdue.length)
        const cm = {}
        clients.forEach((c) => { cm[c.id] = `${c.first_name} ${c.last_name}` })
        setClientMap(cm)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [statusFilter])

  async function markComplete(id) {
    try {
      await followUpsService.update(id, { status: 'completed' })
      setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'completed' } : f)))
    } catch (e) {
      alert(e.message)
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
    <div>
      <PageHeader title="Follow-ups" subtitle="Track client return visits">
        {/* TODO: Add Follow-up modal */}
        <Button size="sm">+ Add Follow-up</Button>
      </PageHeader>

      {overdueCount > 0 && (
        <ErrorState
          className="mb-4"
          message={`${overdueCount} overdue follow-up${overdueCount !== 1 ? 's' : ''} — clients who have not returned yet.`}
        />
      )}

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-5 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: statusFilter === s ? 'var(--color-brand)' : 'var(--color-surface)',
              color: statusFilter === s ? '#fff' : 'var(--color-text-muted)',
              border: `1px solid ${statusFilter === s ? 'var(--color-brand)' : 'var(--color-border)'}`,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {items.length} record{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading follow-ups…" />
      ) : (
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
              <Button variant="ghost" size="sm" onClick={() => markComplete(f.id)}>
                Mark done
              </Button>
            ) : null,
          ])}
          mobileRows={items.map((f) => (
            <MobileCard
              key={f.id}
              actions={
                <>
                  {f.status !== 'completed' && f.status !== 'cancelled' && (
                    <Button variant="ghost" size="sm" onClick={() => markComplete(f.id)}>
                      Mark done
                    </Button>
                  )}
                  <Link
                    to={`/clients/${f.client_id}`}
                    className="text-sm hover:underline ml-auto"
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
    </div>
  )
}
