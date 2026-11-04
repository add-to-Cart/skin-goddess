import { useState, useEffect } from 'react'
import followUpsService from '@/services/followUpsService'
import clientsService from '@/services/clientsService'
import { todayISO } from '@/lib/utils'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import SearchSelect from '@/components/shared/SearchSelect'
import { clientLabel } from '@/lib/lookupLabels'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const STATUSES = ['upcoming', 'due', 'completed', 'cancelled']

/**
 * FollowUpForm — create a follow-up for a client.
 *
 * Props:
 *   open             — boolean
 *   onClose          — () => void
 *   onSaved          — () => void
 *   defaultClientId  — pre-select a client (optional)
 *   followUp         — existing follow-up (edit mode)
 */
export default function FollowUpForm({
  open,
  onClose,
  onSaved,
  defaultClientId = null,
  followUp = null,
  clientContext = '',
}) {
  const isEdit = Boolean(followUp)
  const [clientId, setClientId]   = useState('')
  const [date, setDate]           = useState('')
  const [status, setStatus]       = useState('upcoming')
  const [notes, setNotes]         = useState('')
  const [errors, setErrors]       = useState({})
  const [apiError, setApiError]   = useState(null)
  const [submitting, setSubmit]   = useState(false)

  useEffect(() => {
    if (!open) return

    if (followUp) {
      setClientId(String(followUp.client_id))
      setDate(followUp.follow_up_date)
      setStatus(followUp.status)
      setNotes(followUp.notes ?? '')
    } else {
      setClientId(defaultClientId ? String(defaultClientId) : '')
      setDate('')
      setStatus('upcoming')
      setNotes('')
    }
    setErrors({})
    setApiError(null)
  }, [open, defaultClientId, followUp, isEdit])

  function validate() {
    const e = {}
    if (!clientId) e.clientId = 'Select a client.'
    if (!date)     e.date     = 'Follow-up date is required.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    const payload = {
      client_id:      Number(clientId),
      follow_up_date: date,
      status,
      notes: notes.trim() || null,
    }

    setSubmit(true)
    setApiError(null)
    try {
      if (isEdit) {
        await followUpsService.update(followUp.id, {
          follow_up_date: date,
          status,
          notes: notes.trim() || null,
        })
      } else {
        await followUpsService.create(payload)
      }
      onSaved()
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
      title={isEdit ? 'Edit Follow-up' : 'Schedule Follow-up'}
      description={clientContext || (isEdit ? `Client #${followUp.client_id} · Reminder #${followUp.id}` : "Set a reminder for a client’s return visit.")}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save Changes' : 'Schedule'}
      error={apiError}
    >
      {!defaultClientId && !isEdit && (
        <FormField label="Client" required error={errors.clientId}>
          <SearchSelect searchHint="Name, phone or #ID — at least 2 characters." aria-label="Client" value={clientId} onChange={setClientId} search={clientsService.lookup} getLabel={clientLabel} />
        </FormField>
      )}

      <FormField label="Follow-up Date" required error={errors.date}>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={isEdit ? undefined : todayISO()}
        />
      </FormField>

      {isEdit && (
        <FormField label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      <FormField label="Notes">
        <textarea
          className="flex min-h-[64px] w-full rounded-lg border px-3 py-2 text-sm resize-y"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormField>
    </FormDialog>
  )
}
