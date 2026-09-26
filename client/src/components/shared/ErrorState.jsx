import { AlertCircle } from 'lucide-react'

/**
 * ErrorState — inline error banner.
 * For full-page errors use with a wrapper; for inline field errors use directly.
 */
export default function ErrorState({ message, className = '' }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${className}`}
      style={{
        background: 'var(--color-danger-bg)',
        color: 'var(--color-danger)',
        border: '1px solid',
        borderColor: 'color-mix(in srgb, var(--color-danger) 20%, transparent)',
      }}
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
