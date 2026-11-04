function cents(value, allowNegative = false) {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(value))
  if (!match || (match[1] && !allowNegative)) throw new Error('A sale summary contains an unavailable or invalid amount. Reload the profile.')
  const amount = BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
  return match[1] ? -amount : amount
}

/** Sum backend summaries without deriving balances from badges or rounding each addition. */
export function summarizeClientSales(sales) {
  const totals = { total_amount: 0n, total_paid: 0n, remaining_balance: 0n }
  for (const sale of sales) {
    for (const field of Object.keys(totals)) totals[field] += cents(sale.financial?.[field], field === 'remaining_balance')
  }
  return Object.fromEntries(Object.entries(totals).map(([field, amount]) => {
    const absolute = amount < 0n ? -amount : amount
    return [field, `${amount < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`]
  }))
}
