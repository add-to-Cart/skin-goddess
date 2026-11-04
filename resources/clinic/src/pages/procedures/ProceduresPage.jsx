import RecordSearch from '@/components/shared/RecordSearch'
import RecordPagination from '@/components/shared/RecordPagination'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Stethoscope, Plus, Pencil } from 'lucide-react'
import proceduresService from '@/services/proceduresService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProcedureForm from './ProcedureForm'

export default function ProceduresPage() {
  const loadVersion = useRef(0)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', cursor: null })
  const [page, setPage] = useState({})
  const [procedures, setProcedures] = useState([])
  const [clientMap,  setClientMap]  = useState({})
  const [serviceMap, setServiceMap] = useState({})
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [formOpen,   setFormOpen]   = useState(false)
  const [notice, setNotice] = useState('')
  const [editing,    setEditing]    = useState(null) // procedure being edited

  const loadAll = useCallback(() => {
    const version = ++loadVersion.current
    setLoading(true)
    setError(null)
    proceduresService.getPage({ include_client: true, ...query })
      .then((result) => {
        if (version !== loadVersion.current) return
        const procs = result.data
        setPage(result)
        setProcedures(procs)
        const cm = {}
        procs.forEach((row) => { if (row.client) cm[row.client_id] = `${row.client.first_name} ${row.client.last_name}` })
        setClientMap(cm)
        const sm = {}
        procs.forEach((row) => { if (row.service) sm[row.service_id] = row.service.name })
        setServiceMap(sm)
      })
      .catch((e) => { if (version === loadVersion.current) setError(e.message) })
      .finally(() => { if (version === loadVersion.current) setLoading(false) })
  }, [query])

  useEffect(() => { loadAll(); return () => { loadVersion.current += 1 } }, [loadAll])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(p)  { setEditing(p);    setFormOpen(true) }
  function handleClose()  { setFormOpen(false); setEditing(null) }
  function handleSaved()  { handleClose(); setNotice('Treatment record saved.'); loadAll() }

  const empty = (
    <EmptyState icon={Stethoscope} title="No treatment records yet"
      description="Record the first treatment performed for a client.">
      <Button size="sm" onClick={openCreate}>
        <Plus className="h-4 w-4" /> Add Treatment Record
      </Button>
    </EmptyState>
  )

  return (
    <div>
      <PageHeader title="Treatment Records" subtitle="Treatments and services performed for clients.">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Treatment Record
        </Button>
      </PageHeader>

      <RecordSearch label="Search treatments" value={search} onChange={setSearch} onSearch={() => setQuery({ search: search.trim(), cursor: null })} />
      {notice && <p className="mb-4 text-sm" role="status">{notice}</p>}
      {error && <div>{notice && <p className="mb-3 text-sm">Saving succeeded, but treatment history could not be refreshed. Do not record the treatment again.</p>}<ErrorState message={error} className="mb-4" /><Button variant="outline" onClick={loadAll}>Retry loading treatment records</Button></div>}

      {loading ? (
        <LoadingState message="Loading treatment records…" />
      ) : error ? null : (
        <DataTable
          columns={['Date', 'Client', 'Treatment or Service', 'History #', 'Treatment price', 'Follow-up', 'Supplies', '']}
          rows={procedures.map((p) => [
            <span className="font-medium whitespace-nowrap">{p.procedure_date}</span>,
            <Link to={`/clients/${p.client_id}`} className="font-medium hover:underline"
              style={{ color: 'var(--color-text)' }}>
              {clientMap[p.client_id] ?? `Client #${p.client_id}`}
            </Link>,
            <span>{serviceMap[p.service_id] ?? `Treatment / Service #${p.service_id}`}</span>,
            <span>{p.session_number ?? '—'} {p.package_sale_id && <Badge variant={p.reversed_at ? 'danger' : 'success'}>{p.reversed_at ? 'Reversed' : 'Completed package session'}</Badge>}{p.package_sale?.canceled_at && <Badge variant="danger">Canceled package</Badge>}</span>,
            <span>{p.package_sale_id ? 'Included in package' : p.price != null ? formatCurrency(p.price) : '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }} className="whitespace-nowrap">
              {p.next_follow_up ?? '—'}
            </span>,
            <Badge variant="neutral">
              {p.supplies_used?.length ?? 0} item{(p.supplies_used?.length ?? 0) !== 1 ? 's' : ''}
            </Badge>,
            p.package_sale_id ? <Button variant="ghost" size="sm" asChild><Link to={`/sales/${p.package_sale_id}`}>Package #{p.package_sale_id}</Link></Button> : <Button variant="ghost" size="icon" title={`Edit treatment #${p.id}`} aria-label={`Edit treatment #${p.id}`} onClick={() => openEdit(p)}><Pencil aria-hidden="true" /></Button>,
          ])}
          mobileRows={procedures.map((p) => (
            <MobileCard key={p.id}
              actions={
                <>
                  {p.package_sale_id ? <Button variant="ghost" size="sm" asChild><Link to={`/sales/${p.package_sale_id}`}>Package #{p.package_sale_id}</Link></Button> : <Button variant="ghost" size="icon" title={`Edit treatment #${p.id}`} aria-label={`Edit treatment #${p.id}`} onClick={() => openEdit(p)}><Pencil aria-hidden="true" /></Button>}
                  <Link to={`/clients/${p.client_id}`} className="text-sm hover:underline ml-auto"
                    style={{ color: 'var(--color-brand-strong)' }}>
                    View client →
                  </Link>
                </>
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">
                  {serviceMap[p.service_id] ?? `Treatment / Service #${p.service_id}`}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {p.procedure_date}
                </span>
              </div>
              <MobileField label="Client"   value={clientMap[p.client_id] ?? `Client #${p.client_id}`} />
              <MobileField label="Session"  value={p.session_number ?? '—'} />
              <MobileField label="Treatment price"    value={p.package_sale_id ? 'Included in package' : p.price != null ? formatCurrency(p.price) : '—'} />
              {p.package_sale_id && <Badge variant={p.reversed_at ? 'danger' : 'success'}>{p.reversed_at ? 'Reversed' : 'Completed package session'}</Badge>}
              {p.package_sale?.canceled_at && <Badge variant="danger">Canceled package</Badge>}
              <MobileField label="Follow-up" value={p.next_follow_up ?? '—'} />
              <MobileField label="Supplies"
                value={`${p.supplies_used?.length ?? 0} item${(p.supplies_used?.length ?? 0) !== 1 ? 's' : ''}`} />
            </MobileCard>
          ))}
          emptyState={empty}
        />
      )}

      {!loading && !error && <RecordPagination page={page} cursor={query.cursor} onPage={(cursor) => setQuery((current) => ({ ...current, cursor }))} />}

      <ProcedureForm
        open={formOpen}
        onClose={handleClose}
        onSaved={handleSaved}
        clientName={editing ? clientMap[editing.client_id] || 'Name unavailable' : ''}
        procedure={editing}
        // New records load active catalog entries. Editing retains an inactive
        // historical entry so its original record remains understandable.
        serviceMap={editing && Object.keys(serviceMap).length ? serviceMap : null}
      />
    </div>
  )
}
