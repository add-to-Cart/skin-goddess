import { useEffect, useState } from 'react'
import { Search, Stethoscope, Plus } from 'lucide-react'
import servicesService from '@/services/servicesService'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingState from '@/components/shared/LoadingState'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { DataTable, MobileCard, MobileField } from '@/components/shared/DataTable'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

// ── Service Form ──────────────────────────────────────────────────────────────

const EMPTY_SERVICE = { name: '', description: '', default_price: '', duration_minutes: '' }

function ServiceForm({ open, onClose, service = null, onSaved }) {
  const isEdit = Boolean(service)
  const [fields, setFields]     = useState(EMPTY_SERVICE)
  const [errors, setErrors]     = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmit] = useState(false)

  useEffect(() => {
    if (open) {
      setFields(
        service
          ? {
              name: service.name ?? '',
              description: service.description ?? '',
              default_price: service.default_price != null ? String(service.default_price) : '',
              duration_minutes: service.duration_minutes != null ? String(service.duration_minutes) : '',
            }
          : EMPTY_SERVICE
      )
      setErrors({})
      setApiError(null)
    }
  }, [open, service])

  function set(field, value) {
    setFields((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function validate(f) {
    const e = {}
    if (!f.name.trim()) e.name = 'Treatment or service name is required.'
    if (f.default_price && isNaN(parseFloat(f.default_price)))
      e.default_price = 'Enter a valid price.'
    if (f.default_price && parseFloat(f.default_price) < 0)
      e.default_price = 'Price cannot be negative.'
    if (f.duration_minutes && isNaN(parseInt(f.duration_minutes)))
      e.duration_minutes = 'Enter a valid number of minutes.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate(fields)
    if (Object.keys(v).length) { setErrors(v); return }

    const payload = {
      name: fields.name.trim(),
      description: fields.description.trim() || null,
      default_price: fields.default_price ? parseFloat(fields.default_price) : null,
      duration_minutes: fields.duration_minutes ? parseInt(fields.duration_minutes) : null,
    }

    setSubmit(true)
    setApiError(null)
    try {
      const saved = isEdit
        ? await servicesService.update(service.id, payload)
        : await servicesService.create(payload)
      onSaved(saved)
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmit(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Treatment or Service' : 'Add Treatment or Service'}
      description="This catalog defines what the clinic offers. It does not change completed treatment records."
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Add Treatment or Service'}
      error={apiError}
    >
      <FormField label="Treatment or Service Name" required error={errors.name}>
        <Input
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Facial Treatment, Laser Hair Removal"
          autoFocus
        />
      </FormField>
      <FormField label="Description" error={errors.description}>
        <textarea
          className="flex min-h-[64px] w-full rounded-lg border px-3 py-2 text-sm resize-y"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
          value={fields.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Optional description…"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Default Price (₱)" error={errors.default_price}
          hint="Used as a starting price for new treatment records.">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={fields.default_price}
            onChange={(e) => set('default_price', e.target.value)}
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Duration (minutes)" error={errors.duration_minutes}>
          <Input
            type="number"
            min="1"
            step="1"
            value={fields.duration_minutes}
            onChange={(e) => set('duration_minutes', e.target.value)}
            placeholder="60"
          />
        </FormField>
      </div>
    </FormDialog>
  )
}

// ── Services Page ─────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [services, setServices]   = useState([])
  const [showAll, setShowAll]     = useState(false)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [formOpen, setFormOpen]   = useState(false)
  const [editing, setEditing]     = useState(null)

  function load() {
    setLoading(true)
    servicesService.getAll(!showAll)
      .then(setServices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [showAll])

  function handleSaved() {
    setFormOpen(false)
    setEditing(null)
    load()
  }

  function openEdit(svc) {
    setEditing(svc)
    setFormOpen(true)
  }

  async function toggleActive(svc) {
    try {
      await servicesService.update(svc.id, { is_active: !svc.is_active })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredServices = services.filter((svc) => {
    const query = search.trim().toLowerCase()
    return !query || `${svc.name} ${svc.description ?? ''}`.toLowerCase().includes(query)
  })

  return (
    <div>
      <PageHeader title="Treatment & Services" subtitle="Manage the clinic's treatment and service catalog.">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Treatment or Service
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <Input value={search} onChange={(event) => setSearch(event.target.value)}
            className="pl-9" placeholder="Search treatments and services…" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="show-inactive-svc" checked={showAll} onCheckedChange={setShowAll} />
          <Label htmlFor="show-inactive-svc" className="text-sm cursor-pointer">
            Show inactive entries
          </Label>
        </div>
      </div>

      {error && <ErrorState message={error} className="mb-4" />}

      {loading ? (
        <LoadingState message="Loading treatment and service catalog…" />
      ) : (
        <DataTable
          columns={['Treatment or Service', 'Default Price', 'Duration', 'Status', '']}
          rows={filteredServices.map((svc) => [
            <div>
              <p className="font-semibold">{svc.name}</p>
              {svc.description && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {svc.description}
                </p>
              )}
            </div>,
            <span>{svc.default_price != null ? formatCurrency(svc.default_price) : '—'}</span>,
            <span style={{ color: 'var(--color-text-muted)' }}>
              {svc.duration_minutes != null ? `${svc.duration_minutes} min` : '—'}
            </span>,
            <Badge variant={svc.is_active ? 'success' : 'neutral'}>
              {svc.is_active ? 'Active' : 'Inactive'}
            </Badge>,
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => openEdit(svc)}>Edit</Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleActive(svc)}
                style={{ color: svc.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}
              >
                {svc.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>,
          ])}
          mobileRows={filteredServices.map((svc) => (
            <MobileCard
              key={svc.id}
              actions={
                <>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(svc)}>Edit</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(svc)}
                    style={{ color: svc.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}
                  >
                    {svc.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </>
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{svc.name}</span>
                <Badge variant={svc.is_active ? 'success' : 'neutral'}>
                  {svc.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {svc.description && (
                <MobileField label="Description" value={svc.description} />
              )}
              <MobileField
                label="Price"
                value={svc.default_price != null ? formatCurrency(svc.default_price) : '—'}
              />
              <MobileField
                label="Duration"
                value={svc.duration_minutes != null ? `${svc.duration_minutes} min` : '—'}
              />
            </MobileCard>
          ))}
          emptyState={
            <EmptyState
              icon={Stethoscope}
              title={search ? 'No matching treatments or services' : 'No treatments or services yet'}
              description={search ? 'Try a different search.' : 'Add the treatments and services your clinic offers.'}
            >
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Add Treatment or Service
              </Button>
            </EmptyState>
          }
        />
      )}

      <ServiceForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        service={editing}
        onSaved={handleSaved}
      />
    </div>
  )
}
