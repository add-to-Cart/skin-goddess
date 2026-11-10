import RecordSearch from '@/components/shared/RecordSearch'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Mail, Phone, Plus, UserRound, Users, X } from 'lucide-react'
import clientsService from '@/services/clientsService'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ClientForm from './ClientForm'

export default function ClientsPage() {
  const initialSearch = new URLSearchParams(window.location.search).get('search') || ''
  const [search, setSearch] = useState(initialSearch)
  const [query, setQuery] = useState({ search: initialSearch, cursor: null, revision: 0 })
  const [result, setResult] = useState({ status: 'loading', clients: [] })
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
    setResult({ status: 'loading', clients: [] })
    setQuery((current) => ({ search: value.trim(), cursor, revision: current.revision + 1 }))
  }
  const { clients } = result
  return <div className="interactive-list min-w-0">
    <PageHeader title="Clients"><Button size="sm" onClick={() => setFormOpen(true)}><Plus aria-hidden="true" />Add Client</Button></PageHeader>
    {notice && <p role="status" className="mb-4 rounded-md border border-[var(--color-border)] bg-[var(--color-brand-soft)] p-3 text-sm">{notice}</p>}
    <RecordSearch label="Search clients" value={search} onChange={setSearch} onSearch={() => load(search)}>
      {search && <Button className="record-refresh" type="button" variant="ghost" size="icon" title="Clear search" aria-label="Clear search" onClick={() => { setSearch(''); load('') }}><X aria-hidden="true" /></Button>}
    </RecordSearch>
    <p role="status" className="mb-4 text-sm">{result.status === 'ready' ? `${clients.length} client${clients.length === 1 ? '' : 's'}${query.search ? ` matching “${query.search}”` : ''}${query.cursor || result.nextCursor ? ' on this page' : ''}` : result.status === 'loading' ? 'Updating client results…' : 'Client results unavailable.'}</p>
    {result.status === 'error' ? <div className="space-y-3"><ErrorState message={`${notice ? 'The client was saved, but the list could not be refreshed. ' : ''}${result.message}`} /><Button variant="outline" onClick={() => load()}>Retry client list</Button></div> : result.status === 'loading' ? <LoadingState message="Loading clients…" /> : clients.length === 0 ? (
      <EmptyState icon={Users} title="No clients found" description={query.search ? 'Try another name or phone number, or clear the search.' : 'Use Add Client above to register someone new.'} />
    ) : (
      <ul aria-label="Client directory" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
        {clients.map((client) => <li key={client.id} className="min-w-0"><ClientCard client={client} /></li>)}
      </ul>
    )}
    {result.status === 'ready' && (result.nextCursor || result.previousCursor) && <nav aria-label="Client pages" className="mt-4 flex items-center justify-between gap-3"><Button variant="outline" disabled={!result.previousCursor} onClick={() => load(query.search, result.previousCursor)}>Previous</Button><Button variant="outline" disabled={!result.nextCursor} onClick={() => load(query.search, result.nextCursor)}>Next</Button></nav>}
    <ClientForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={(client) => { setFormOpen(false); setNotice(`Client #${client.id} saved.`); load() }} />
  </div>
}

function ClientCard({ client }) {
  const name = `${client.first_name} ${client.last_name}`
  const initials = [client.first_name, client.last_name]
    .map((part) => Array.from(part?.trim() ?? '')[0])
    .join('')
    .toLocaleUpperCase()

  return (
    <Card className="h-full rounded-xl transition-shadow hover:shadow-sm focus-within:shadow-sm">
      <Link
        to={`/clients/${client.id}`}
        aria-label={`View profile for ${name}`}
        className="client-card-link flex h-full min-w-0 flex-col rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-t-xl bg-[var(--color-brand-soft)] px-5 py-4">
          <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--color-surface)] text-lg font-semibold tracking-wide text-[var(--color-brand-strong)]">
            {initials || <UserRound size={22} />}
          </span>
          <Badge variant={client.is_active ? 'success' : 'neutral'}>{client.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
        <div className="flex flex-1 flex-col gap-3 px-5 py-4">
          <h2 className="text-base font-semibold wrap-anywhere">{name}</h2>
          <div className="flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
            {client.phone && <p className="flex items-start gap-2">
              <Phone size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="wrap-anywhere"><span className="sr-only">Phone </span>{client.phone}</span>
            </p>}
            {client.email && <p className="flex items-start gap-2">
              <Mail size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="wrap-anywhere"><span className="sr-only">Email </span>{client.email}</span>
            </p>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] px-5 py-3 text-sm font-medium text-[var(--color-brand-strong)]">
          <span>View profile</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </div>
      </Link>
    </Card>
  )
}
