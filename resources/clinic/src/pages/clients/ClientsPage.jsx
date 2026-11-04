import RecordSearch from '@/components/shared/RecordSearch'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserRound, X, ChevronDown, ChevronUp, ChevronRight, Plus } from 'lucide-react'
import clientsService from '@/services/clientsService'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ClientForm from './ClientForm'

export default function ClientsPage() {
  const initialSearch = new URLSearchParams(window.location.search).get('search') || ''
  const [search, setSearch] = useState(initialSearch)
  const [query, setQuery] = useState({ search: initialSearch, cursor: null, revision: 0 })
  const [result, setResult] = useState({ status: 'loading', clients: [] })
  const [expanded, setExpanded] = useState(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const inFlight = useRef(null)

  useEffect(() => {
    let active = true
    if (!inFlight.current || inFlight.current.query !== query) {
      inFlight.current = { query, request: clientsService.getPage({ search: query.search || undefined, cursor: query.cursor }) }
    }
    inFlight.current.request.then((page) => {
      if (active) setResult({ status: 'ready', clients: page.data, nextCursor: page.next_cursor, previousCursor: page.prev_cursor })
    }).catch((error) => {
      if (active) setResult({ status: 'error', clients: [], message: error.message })
    })
    return () => { active = false }
  }, [query])

  function load(value = query.search, cursor = null) {
    setExpanded(new Set())
    setResult({ status: 'loading', clients: [] })
    setQuery((current) => ({ search: value.trim(), cursor, revision: current.revision + 1 }))
  }
  function toggle(id) {
    setExpanded((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function identity(client) {
    const name = `${client.first_name} ${client.last_name}`
    return <div className="flex min-w-0 items-start gap-3">
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-sm font-semibold text-[var(--color-text-muted)]"><UserRound size={20} /></span>
      <div className="min-w-0"><Link className="font-semibold underline-offset-4 hover:underline wrap-anywhere" to={`/clients/${client.id}`}>{name}</Link><p className="mt-1 text-xs">Client #{client.id}</p></div>
    </div>
  }
  function notes(client) {
    return client.notes && <div className="mt-3 border-l-2 border-[var(--color-brand)] pl-3 text-sm"><p className="whitespace-pre-wrap wrap-anywhere"><span className="sr-only">Client notes: </span>{client.notes}</p></div>
  }
  function details(client) {
    return <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
      <div><dt className="font-medium">Email</dt><dd className="wrap-anywhere">{client.email || 'Not recorded'}</dd></div>
      <div><dt className="font-medium">Registered</dt><dd>{client.created_at ? new Date(client.created_at).toLocaleDateString('en-PH') : 'Not recorded'}</dd></div>
      <div className="sm:col-span-2"><dt className="font-medium">Address</dt><dd className="whitespace-pre-wrap wrap-anywhere">{client.address || 'Not recorded'}</dd></div>
    </dl>
  }
  function actions(client, layout) {
    const open = expanded.has(client.id)
    const Icon = open ? ChevronUp : ChevronDown
    return <div className="flex flex-wrap gap-2 xl:flex-nowrap">
      <Button variant="ghost" size="icon" title={open ? 'Hide details' : 'Show details'} aria-label={`${open ? 'Hide' : 'Show'} details for Client #${client.id}`} aria-expanded={open} aria-controls={`client-${layout}-details-${client.id}`} onClick={() => toggle(client.id)}><Icon aria-hidden="true" /></Button>
      <Button variant="ghost" size="icon" asChild><Link title="Open profile" aria-label={`Open profile for Client #${client.id}`} to={`/clients/${client.id}`}><ChevronRight aria-hidden="true" /></Link></Button>
    </div>
  }

  const { clients } = result
  return <div className="interactive-list min-w-0">
    <PageHeader title="Clients"><Button size="sm" onClick={() => setFormOpen(true)}><Plus aria-hidden="true" />Add Client</Button></PageHeader>
    {notice && <p role="status" className="mb-4 rounded-md border border-[var(--color-border)] bg-[var(--color-brand-soft)] p-3 text-sm">{notice}</p>}
    <RecordSearch label="Search clients" value={search} onChange={setSearch} onSearch={() => load(search)}>
      {search && <Button className="record-refresh" type="button" variant="ghost" size="icon" title="Clear search" aria-label="Clear search" onClick={() => { setSearch(''); load('') }}><X aria-hidden="true" /></Button>}
    </RecordSearch>
    <p role="status" className="mb-4 text-sm">{result.status === 'ready' ? `${clients.length} client${clients.length === 1 ? '' : 's'}${query.search ? ` matching “${query.search}”` : ''}${query.cursor || result.nextCursor ? ' on this page' : ''}` : result.status === 'loading' ? 'Updating client results…' : 'Client results unavailable.'}</p>
    {result.status === 'error' ? <div className="space-y-3"><ErrorState message={`${notice ? 'The client was saved, but the list could not be refreshed. ' : ''}${result.message}`} /><Button variant="outline" onClick={() => load()}>Retry client list</Button></div> : result.status === 'loading' ? <LoadingState message="Loading clients…" /> : <DataTable
      mobileBreakpoint="lg"
      columns={['Client', 'Phone', 'Status', 'Actions']}
      rowKeys={clients.map((client) => client.id)}
      rows={clients.map((client) => [<div>{identity(client)}{notes(client)}</div>, client.phone || 'Not recorded', <Badge variant={client.is_active ? 'success' : 'neutral'}>{client.is_active ? 'Active' : 'Inactive'}</Badge>, actions(client, 'desktop')])}
      rowDetails={clients.map((client) => ({ id: `client-desktop-details-${client.id}`, expanded: expanded.has(client.id), content: details(client) }))}
      mobileRows={clients.map((client) => <MobileCard key={client.id} actions={actions(client, 'mobile')}>
        {identity(client)}<MobileField label="Phone" value={client.phone || 'Not recorded'} /><div><Badge variant={client.is_active ? 'success' : 'neutral'}>{client.is_active ? 'Active' : 'Inactive'}</Badge></div>{notes(client)}
        <div id={`client-mobile-details-${client.id}`} hidden={!expanded.has(client.id)} className="mt-3 border-t border-[var(--color-border)] pt-3">{details(client)}</div>
      </MobileCard>)}
      emptyState={<EmptyState icon={Users} title="No clients found" description={query.search ? 'Try another name or phone number, or clear the search.' : 'Use Add Client above to register someone new.'} />}
    />}
    {result.status === 'ready' && (result.nextCursor || result.previousCursor) && <nav aria-label="Client pages" className="mt-4 flex items-center justify-between gap-3"><Button variant="outline" disabled={!result.previousCursor} onClick={() => load(query.search, result.previousCursor)}>Previous</Button><Button variant="outline" disabled={!result.nextCursor} onClick={() => load(query.search, result.nextCursor)}>Next</Button></nav>}
    <ClientForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={(client) => { setFormOpen(false); setNotice(`Client #${client.id} saved.`); load() }} />
  </div>
}
