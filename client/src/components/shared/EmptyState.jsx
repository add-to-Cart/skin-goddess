/**
 * EmptyState — no-data placeholder.
 * Renders an icon area, title, description, and optional action slot.
 */
export default function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      {Icon && (
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center mb-1"
          style={{ background: 'var(--color-brand-soft)' }}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" style={{ color: 'var(--color-brand-strong)' }} />
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {title}
      </p>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
