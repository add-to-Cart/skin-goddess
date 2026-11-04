import { Children, cloneElement, isValidElement, useId } from 'react'
import { Input } from '@/components/ui/input'
import { SelectTrigger } from '@/components/ui/select'
import SearchSelect from './SearchSelect'
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
  submitDisabled = false,
  submitLabel = 'Save',
  error = null,
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="wrap-anywhere">{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate aria-busy={submitting}>
          <fieldset disabled={submitting} className="min-w-0 border-0 p-0 m-0">
          <DialogBody className="flex flex-col gap-4">
            {error && <ErrorState message={error} />}
            {children}
          </DialogBody>
          </fieldset>
          <DialogFooter className="flex-col-reverse sm:flex-row [&_button]:min-h-11 [&_button]:w-full [&_button]:whitespace-normal sm:[&_button]:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || submitDisabled}>
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
  const generatedId = useId()
  function findControlId(nodes) {
    for (const child of Children.toArray(nodes)) {
      if (!isValidElement(child)) continue
      if ((['input', 'textarea', 'select'].includes(child.type) || child.type === Input || child.type === SelectTrigger || child.type === SearchSelect) && child.props.id) return child.props.id
      const nestedId = child.props.children && findControlId(child.props.children)
      if (nestedId) return nestedId
    }
    return null
  }
  const fieldId = findControlId(children) || generatedId
  const labelId = `${fieldId}-label`
  const messageId = `${fieldId}-message`
  function associateControl(nodes) {
    return Children.map(nodes, (child) => {
      if (!isValidElement(child)) return child
      if (['input', 'textarea', 'select'].includes(child.type) || child.type === Input || child.type === SelectTrigger || child.type === SearchSelect) {
        return cloneElement(child, {
          id: child.props.id || fieldId,
          'aria-labelledby': [child.props['aria-labelledby'], labelId].filter(Boolean).join(' '),
          'aria-describedby': [child.props['aria-describedby'], (error || hint) && messageId].filter(Boolean).join(' ') || undefined,
          'aria-invalid': error ? true : child.props['aria-invalid'],
          'aria-required': required || child.props['aria-required'] || undefined,
        })
      }
      return child.props.children ? cloneElement(child, { children: associateControl(child.props.children) }) : child
    })
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label id={labelId} htmlFor={fieldId}>
        {label}
        {required && (
          <span className="ml-1 text-xs" style={{ color: 'var(--color-danger)' }}>*</span>
        )}
      </Label>
      {associateControl(children)}
      {hint && !error && (
        <p id={messageId} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
      )}
      {error && (
        <p id={messageId} className="text-xs font-medium" style={{ color: 'var(--color-danger)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
