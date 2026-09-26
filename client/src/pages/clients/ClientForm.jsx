import { useState, useEffect } from 'react'
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
  const [fields, setFields]       = useState(EMPTY)
  const [errors, setErrors]       = useState({})
  const [apiError, setApiError]   = useState(null)
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
    }
  }, [open, client])

  function set(field, value) {
    setFields((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
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
    try {
      const saved = isEdit
        ? await clientsService.update(client.id, payload)
        : await clientsService.create(payload)
      onSaved(saved)
      onClose()
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Client' : 'Add Client'}
      description={isEdit ? 'Update client information.' : 'Register a new client.'}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Add Client'}
      error={apiError}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="First Name" required error={errors.first_name}>
          <Input
            value={fields.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            placeholder="Maria"
            autoFocus
          />
        </FormField>
        <FormField label="Last Name" required error={errors.last_name}>
          <Input
            value={fields.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            placeholder="Santos"
          />
        </FormField>
      </div>
      <FormField label="Phone" error={errors.phone}>
        <Input
          type="tel"
          value={fields.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="09XX XXX XXXX"
        />
      </FormField>
      <FormField label="Email" error={errors.email}>
        <Input
          type="email"
          value={fields.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="maria@example.com"
        />
      </FormField>
      <FormField label="Address" error={errors.address}>
        <Input
          value={fields.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Street, City"
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
          placeholder="Optional notes…"
        />
      </FormField>
    </FormDialog>
  )
}
