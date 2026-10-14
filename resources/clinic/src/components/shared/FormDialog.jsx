import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import ErrorState from './ErrorState'

/**
 * FormDialog — standard modal wrapper for all create/edit forms.
 *
 * Props:
 *   open        — boolean
 *   onClose     — () => void
 *   title       — string
 *   description — string (optional)
 *   onSubmit    — (e) => void  — called when the form submits
 *   submitting  — boolean      — disables submit button + shows "Saving…"
 *   submitLabel — string       — default "Save"
 *   error       — string|null  — API error message
 *   children    — form fields
 */
export default function FormDialog({
  open,
  onClose,
  title,
  description,
  onSubmit,
  submitting = false,
  submitLabel = 'Save',
  error = null,
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="flex flex-col gap-4">
            {error && <ErrorState message={error} />}
            {children}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * FormField — label + input wrapper with inline validation message.
 *
 * Props:
 *   label    — string
 *   required — boolean
 *   error    — string|null  — field-level validation message
 *   hint     — string|null  — helper text below input
 *   children — the input element
 */
export function FormField({ label, required = false, error = null, hint = null, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && (
          <span className="ml-1 text-xs" style={{ color: 'var(--color-danger)' }}>*</span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium" style={{ color: 'var(--color-danger)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
