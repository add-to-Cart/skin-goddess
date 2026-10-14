import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]',
        success:     'bg-[var(--color-success-bg)] text-[var(--color-success)]',
        warning:     'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
        danger:      'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
        info:        'bg-[var(--color-info-bg)] text-[var(--color-info)]',
        neutral:     'bg-[var(--color-border-subtle)] text-[var(--color-text-muted)]',
        outline:     'border border-[var(--color-border)] text-[var(--color-text-muted)] bg-transparent',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
