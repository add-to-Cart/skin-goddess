import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-brand)] text-white shadow-xs hover:bg-[var(--color-brand-hover)] active:bg-[var(--color-brand-active)]',
        secondary:
          'bg-transparent border border-[var(--color-brand)] text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]',
        ghost:
          'bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]',
        destructive:
          'bg-[var(--color-danger)] text-white shadow-xs hover:bg-red-700',
        link:
          'text-[var(--color-brand-strong)] underline-offset-4 hover:underline p-0 h-auto',
        outline:
          'border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs hover:bg-[var(--color-border-subtle)]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-7 rounded-md px-3 text-xs',
        lg:      'h-11 rounded-lg px-6 text-base',
        icon:    'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
