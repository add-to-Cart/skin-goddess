import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes safely, resolving conflicts.
 * Used by all shadcn/ui components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Philippine Peso currency.
 */
export function formatCurrency(amount) {
  return `₱${Number(amount ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Return today's date as YYYY-MM-DD string (local time).
 */
export function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}
