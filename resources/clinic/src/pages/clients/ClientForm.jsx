import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import authService from '@/services/authService'
import clientsService from '@/services/clientsService'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'

const EMPTY = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

function validate(f) {
  const e = {}
  if (!f.first_name.trim()) e.first_name = 'First name is required.'
  if (!f.last_name.trim())  e.last_name  = 'Last name is required.'
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = 'Enter a valid email address.'
  return e
}

/**
 * ClientForm — create or edit a client.
 *
 * Props:
 *   open     — boolean
 *   onClose  — () => void
 *   client   — existing client object (edit mode) or null (create mode)
 *   onSaved  — (client) => void — called after successful save
 */
export default function ClientForm({ open, onClose, client = null, onSaved }) {
  const isEdit = Boolean(client)
  const storageKey = `sg_client_registration_${authService.getUsername()}`
  const [pending, setPending] = useState(null)
  const [storageReady, setStorageReady] = useState(false)
  const [nameMatches, setNameMatches] = useState([])
  const [reviewedName, setReviewedName] = useState(false)
  const [reviewedPending, setReviewedPending] = useState(false)
  const [fields, setFields]       = useState(EMPTY)
  const [errors, setErrors]       = useState({})
  const [apiError, setApiError]   = useState(null)
  const [existingClient, setExistingClient] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Populate fields when editing
  useEffect(() => {
    if (open) {
      setFields(
        client
          ? {
              first_name: client.first_name ?? '',
              last_name:  client.last_name  ?? '',
              phone:      client.phone      ?? '',
              email:      client.email      ?? '',
              address:    client.address    ?? '',
              notes:      client.notes      ?? '',
            }
          : EMPTY
      )
      setErrors({})
      setApiError(null)
      setExistingClient(null)
      setNameMatches([])
      setReviewedName(false)
      setReviewedPending(false)
      setPending(null)
      try {
        const saved = isEdit ? null : JSON.parse(sessionStorage.getItem(storageKey) || 'null')
        if (saved) {
          setPending(saved)
          setFields(Object.fromEntries(Object.keys(EMPTY).map((field) => [field, saved[field] ?? ''])))
        }
        setStorageReady(true)
      } catch {
        setStorageReady(false)
        setApiError('Registration recovery is unavailable. Review the client list before clearing browser storage.')
      }
    }
  }, [open, client, isEdit, storageKey])

  function set(field, value) {
    setReviewedName(false)
    setNameMatches([])
    setFields((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting || (!isEdit && !storageReady)) return
    const validation = validate(fields)
    if (Object.keys(validation).length) { setErrors(validation); return }

    // Build payload — omit empty optional strings
    const payload = {
      first_name: fields.first_name.trim(),
      last_name:  fields.last_name.trim(),
      phone:      fields.phone.trim()   || null,
      email:      fields.email.trim()   || null,
      address:    fields.address.trim() || null,
      notes:      fields.notes.trim()   || null,
    }

    setSubmitting(true)
    setApiError(null)
    setExistingClient(null)
    try {
      if (!isEdit && !pending && !reviewedName) {
        const normalize = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase()
        const matches = (await clientsService.findMatchingNames(payload.first_name, payload.last_name)).data.filter((entry) => normalize(entry.first_name) === normalize(payload.first_name) && normalize(entry.last_name) === normalize(payload.last_name))
        if (matches.length) { setNameMatches(matches); return }
      }
      const submitted = pending || { ...payload, registration_key: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` }
      if (!isEdit) { sessionStorage.setItem(storageKey, JSON.stringify(submitted)); setPending(submitted) }
      const saved = isEdit
        ? await clientsService.update(client.id, payload)
        : await clientsService.create(submitted)
      if (!isEdit) { sessionStorage.removeItem(storageKey); setPending(null) }
      onSaved(saved)
      onClose()
    } catch (err) {
      if (!isEdit && (err.existingClient || [400, 403, 404, 422].includes(err.status))) {
        sessionStorage.removeItem(storageKey)
        setPending(null)
      }
      setApiError(err.message)
      setExistingClient(err.existingClient || null)
      if (err.errors) setErrors(Object.fromEntries(Object.entries(err.errors).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages])))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Client' : 'Add Client'}
      description={isEdit ? `Client #${client.id}` : undefined}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : pending ? 'Retry registration' : 'Add Client'}
      submitDisabled={!isEdit && !storageReady}
      error={apiError}
    >
      {pending && <div className="text-sm space-y-2" role="status"><p>Registration pending confirmation. Retry checks the original request.</p><a className="underline" href="/clients" target="_blank" rel="noreferrer">Review client list</a><label className="flex items-center gap-2"><input type="checkbox" checked={reviewedPending} onChange={(event) => setReviewedPending(event.target.checked)} />I checked the client list.</label><button type="button" disabled={!reviewedPending || submitting} className="min-h-11 underline disabled:opacity-50" onClick={() => { sessionStorage.removeItem(storageKey); setPending(null); setReviewedPending(false); setReviewedName(false); setApiError(null) }}>Discard pending request</button></div>}
      {nameMatches.length > 0 && !pending && <section className="text-sm space-y-2" role="status"><p>A client with this name already exists.</p><a className="inline-flex min-h-11 items-center underline" href={`/clients?search=${encodeURIComponent(`${fields.first_name} ${fields.last_name}`)}`} target="_blank" rel="noreferrer">Review all matching clients</a>{nameMatches.map((entry) => <Link key={entry.id} className="flex min-h-11 items-center gap-2 underline" to={`/clients/${entry.id}`} onClick={onClose}><UserRound size={18} aria-hidden="true" />#{entry.id} · {entry.phone || entry.email || 'No contact recorded'}</Link>)}<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={reviewedName} onChange={(event) => setReviewedName(event.target.checked)} />This is a different person.</label></section>}
      <fieldset disabled={Boolean(pending)} className="contents">
      {existingClient && <div className="text-sm">{existingClient.is_active ? <Link className="inline-flex min-h-11 items-center gap-2 underline" to={`/clients/${existingClient.id}`} onClick={onClose}><UserRound size={18} aria-hidden="true" />Open Client #{existingClient.id}</Link> : <p>This client is archived. Ask an administrator to review the existing record.</p>}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="First Name" required error={errors.first_name}>
          <Input
            value={fields.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            autoFocus
          />
        </FormField>
        <FormField label="Last Name" required error={errors.last_name}>
          <Input
            value={fields.last_name}
            onChange={(e) => set('last_name', e.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Phone" error={errors.phone}>
        <Input
          type="tel"
          value={fields.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </FormField>
      <FormField label="Email" error={errors.email}>
        <Input
          type="email"
          value={fields.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </FormField>
      <FormField label="Address" error={errors.address}>
        <Input
          value={fields.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </FormField>
      <FormField label="Notes" hint="Allergies, preferences, or other relevant information.">
        <textarea
          className="flex min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm resize-y"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
          value={fields.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </FormField>
      </fieldset>
    </FormDialog>
  )
}
