/** Cache only within the mounted sales list, keyed by the backend's financial revision. */
export function getSaleSummary(sale, cache, request) {
  const key = `${sale.id}:${sale.version}`
  if (cache.has(key)) return cache.get(key)
  const pending = Promise.resolve().then(() => request(sale.id)).then((summary) => {
    for (const field of ['total_amount', 'total_paid', 'remaining_balance']) {
      if (!/^-?\d+(?:\.\d{1,2})?$/.test(String(summary[field]))) throw new Error('The sale balance could not be confirmed.')
    }
    if (summary.id !== sale.id) throw new Error('The sale summary does not match this transaction.')
    return summary
  }).catch((error) => {
    if (cache.get(key) === pending) cache.delete(key)
    throw error
  })
  cache.set(key, pending)
  return pending
}
