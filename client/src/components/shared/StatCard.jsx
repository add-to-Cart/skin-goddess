import { cn } from '@/lib/utils'

/**
 * StatCard
 * A metric tile for dashboard and summary sections.
 *
 * accent: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
 */
const ACCENT_CLASSES = {
  brand:   'border-t-[var(--color-brand)]',
  success: 'border-t-[var(--color-success)]',
  warning: 'border-t-[var(--color-warning)]',
  danger:  'border-t-[var(--color-danger)]',
  info:    'border-t-[var(--color-info)]',
  neutral: 'border-t-[var(--color-border)]',
}

export default function StatCard({ label, value, sub, accent = 'neutral', icon: Icon }) {
  return (
    <div
      className={cn(
        'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5',
        'shadow-[var(--shadow-sm)] border-t-2',
        ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.neutral
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-bold leading-none truncate"
            style={{ color: 'var(--color-text)' }}
          >
            {value}
          </p>
          {sub && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {sub}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-background)' }}
          >
            <Icon className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        )}
      </div>
    </div>
  )
}
