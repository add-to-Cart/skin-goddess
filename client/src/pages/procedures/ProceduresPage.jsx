import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import proceduresService from '@/services/proceduresService'
import clientsService from '@/services/clientsService'
import servicesService from '@/services/servicesService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState([])
  const [clientMap, setClientMap]   = useState({}) // id → full name
  const [serviceMap, setServiceMap] = useState({}) // id → name
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    Promise.all([
      proceduresService.getAll(),
      clientsService.getAll(),
      servicesService.getAll(false),
    ])
      .then(([procs, clients, svcs]) => {
        setProcedures(procs)
        const cm = {}
        clients.forEach((c) => { cm[c.id] = `${c.first_name} ${c.last_name}` })
        setClientMap(cm)
        const sm = {}
        svcs.forEach((s) => { sm[s.id] = s.name })
        setServiceMap(sm)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const empty = (
    <EmptyState
      icon={Stethoscope}
      title="No procedures yet"
      description="Add the first procedure to get started."
    />
  )

  return (
    <div>
      <PageHeader title="Procedures" subtitle="All procedures performed on clients">
        {/* TODO: Add Procedure modal */}
        <Button size="sm">+ Add Procedure</Button>
      </PageHeader>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading procedures…" />
      ) : (
        <DataTable
          columns={['Date', 'Client', 'Service', 'Session', 'Price', 'Follow-up', 'Supplies']}
          rows={procedures.map((p) => [
            <span className="font-medium whitespace-nowrap">{p.procedure_date}</span>,
            <Link
              to={`/clients/${p.client_id}`}
              className="font-medium hover:underline"
              style={{ color: 'var(--color-text)' }}
            >
              {clientMap[p.client_id] ?? `Client #${p.client_id}`}
            </Link>,
            <span>{serviceMap[p.service_id] ?? `Service #${p.service_id}`}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{p.session_number ?? '—'}</span>,
            <span>{p.price != null ? formatCurrency(p.price) : '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }} className="whitespace-nowrap">
              {p.next_follow_up ?? '—'}
            </span>,
            <Badge variant="neutral">
              {p.supplies_used?.length ?? 0} item{(p.supplies_used?.length ?? 0) !== 1 ? 's' : ''}
            </Badge>,
          ])}
          mobileRows={procedures.map((p) => (
            <MobileCard
              key={p.id}
              actions={
                <Link
                  to={`/clients/${p.client_id}`}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-brand-strong)' }}
                >
                  View client →
                </Link>
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {serviceMap[p.service_id] ?? `Service #${p.service_id}`}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {p.procedure_date}
                </span>
              </div>
              <MobileField label="Client" value={clientMap[p.client_id] ?? `Client #${p.client_id}`} />
              <MobileField label="Session" value={p.session_number ?? '—'} />
              <MobileField label="Price" value={p.price != null ? formatCurrency(p.price) : '—'} />
              <MobileField label="Follow-up" value={p.next_follow_up ?? '—'} />
              <MobileField
                label="Supplies"
                value={`${p.supplies_used?.length ?? 0} item${(p.supplies_used?.length ?? 0) !== 1 ? 's' : ''}`}
              />
            </MobileCard>
          ))}
          emptyState={empty}
        />
      )}
    </div>
  )
}
