import { Loader2 } from 'lucide-react'

/**
 * LoadingState — centred spinner with optional message.
 */
export default function LoadingState({ message = 'Loading…' }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-3"
      role="status"
      aria-label={message}
    >
      <Loader2
        className="h-7 w-7 animate-spin"
        style={{ color: 'var(--color-brand)' }}
        aria-hidden="true"
      />
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {message}
      </p>
    </div>
  )
}
