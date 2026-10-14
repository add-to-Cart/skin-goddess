import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, X, ChevronRight, Plus } from 'lucide-react'
import clientsService from '@/services/clientsService'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import ClientForm from './ClientForm'

export default function ClientsPage() {
  const [clients, setClients]     = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [formOpen, setFormOpen]   = useState(false)

  function load(q = '') {
    setLoading(true)
    clientsService.getAll({ search: q || undefined })
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function handleSearch(e) {
    e.preventDefault()
    load(search)
  }

  function clearSearch() {
    setSearch('')
    load('')
  }

  function handleSaved(newClient) {
    // Prepend or replace in list, then reload to get correct sort order
    load(search)
  }

  const empty = (
    <EmptyState
      icon={Users}
      title="No clients found"
      description={
        search
          ? `No results for "${search}". Try a different name or phone number.`
          : 'Add your first client to get started.'
      }
    >
      {!search && (
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      )}
    </EmptyState>
  )

  return (
    <div>
      <PageHeader title="Clients" subtitle="Manage client records">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </PageHeader>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <Input
            className="pl-8"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search clients"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">Search</Button>
        {search && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={clearSearch} aria-label="Clear search">
            <X className="h-4 w-4" />
          </Button>
        )}
        <span className="text-sm hidden sm:inline" style={{ color: 'var(--color-text-muted)' }}>
          {clients.length} client{clients.length !== 1 ? 's' : ''}
        </span>
      </form>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading clients…" />
      ) : (
        <DataTable
          columns={['Name', 'Phone', 'Email', 'Registered', 'Status', '']}
          rows={clients.map((c) => [
            <span className="font-semibold">{c.last_name}, {c.first_name}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{c.phone ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>{c.email ?? '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>
              {new Date(c.created_at).toLocaleDateString('en-PH')}
            </span>,
            <Badge variant={c.is_active ? 'success' : 'neutral'}>
              {c.is_active ? 'Active' : 'Inactive'}
            </Badge>,
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/clients/${c.id}`}>
                View <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>,
          ])}
          mobileRows={clients.map((c) => (
            <MobileCard
              key={c.id}
              actions={
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/clients/${c.id}`}>
                    View profile <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {c.first_name} {c.last_name}
                </span>
                <Badge variant={c.is_active ? 'success' : 'neutral'}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <MobileField label="Phone" value={c.phone ?? '—'} />
              <MobileField label="Email" value={c.email ?? '—'} />
              <MobileField
                label="Registered"
                value={new Date(c.created_at).toLocaleDateString('en-PH')}
              />
            </MobileCard>
          ))}
          emptyState={empty}
        />
      )}

      <ClientForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
