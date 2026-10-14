import { useState, useEffect } from 'react'
import paymentsService from '@/services/paymentsService'
import { formatCurrency, todayISO } from '@/lib/utils'
import FormDialog, { FormField } from '@/components/shared/FormDialog'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'gcash',         label: 'GCash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card',          label: 'Card' },
  { value: 'other',         label: 'Other' },
]

function newPaymentRequestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

/**
 * PaymentForm — record a payment toward a sale.
 *
 * Props:
 *   open              — boolean
 *   onClose           — () => void
 *   onSaved           — () => void
 *   saleId            — number (required)
 *   remainingBalance  — number — used to warn if overpaying
 */
export default function PaymentForm({ open, onClose, onSaved, saleId, remainingBalance = null }) {
  const [amount, setAmount]         = useState('')
  const [method, setMethod]         = useState('cash')
  const [date, setDate]             = useState(todayISO())
  const [notes, setNotes]           = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentRequestKey, setPaymentRequestKey] = useState('')
  const [errors, setErrors]         = useState({})
  const [apiError, setApiError]     = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount('')
      setMethod('cash')
      setDate(todayISO())
      setNotes('')
      setReferenceNumber('')
      setPaymentRequestKey(newPaymentRequestKey())
      setErrors({})
      setApiError(null)
    }
  }, [open])

  function validate() {
    const e = {}
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt))   e.amount = 'Enter a valid amount.'
    if (!isNaN(amt) && amt <= 0) e.amount = 'Payment amount must be greater than ₱0.'
    if (!date) e.date = 'Payment date is required.'
    if (['gcash', 'bank_transfer', 'card'].includes(method) && !referenceNumber.trim()) {
      e.referenceNumber = 'Transaction reference is required for this payment method.'
    }
    if (remainingBalance !== null && !isNaN(amt) && amt > remainingBalance + 0.01) {
      e.amount = `Payment cannot exceed the remaining balance of ${formatCurrency(remainingBalance)}.`
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    const payload = {
      sale_id:        saleId,
      payment_date:   date,
      amount:         parseFloat(amount),
      idempotency_key: paymentRequestKey,
      expected_remaining_balance: remainingBalance,
      payment_method: method || null,
      reference_number: referenceNumber.trim() || null,
      notes:          notes.trim() || null,
    }

    setSubmitting(true)
    setApiError(null)
    try {
      await paymentsService.create(payload)
      onSaved()
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const enteredAmt    = parseFloat(amount) || 0
  const wouldOverpay  = remainingBalance !== null && enteredAmt > remainingBalance + 0.01

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Record Payment"
      description={
        remainingBalance !== null
          ? `Remaining balance: ${formatCurrency(remainingBalance)}`
          : undefined
      }
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Record Payment"
      error={apiError}
    >
      <FormField label="Amount (₱)" required error={errors.amount}>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); if (errors.amount) setErrors((er) => ({ ...er, amount: null })) }}
          placeholder="0.00"
          autoFocus
        />
        {wouldOverpay && !errors.amount && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>
            This exceeds the remaining balance of {formatCurrency(remainingBalance)}.
          </p>
        )}
      </FormField>

      <FormField label="Payment Method">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Payment Date" required error={errors.date}>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </FormField>

      {['gcash', 'bank_transfer', 'card'].includes(method) && (
        <FormField label="Transaction Reference" required error={errors.referenceNumber}>
          <Input
            value={referenceNumber}
            onChange={(e) => { setReferenceNumber(e.target.value); if (errors.referenceNumber) setErrors((er) => ({ ...er, referenceNumber: null })) }}
            placeholder="Reference or terminal number"
          />
        </FormField>
      )}

      <FormField label="Notes">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes…"
        />
      </FormField>
    </FormDialog>
  )
}
