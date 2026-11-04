import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSaleSummary } from './saleSummaryCache.js'

const sale = { id: 42, version: 1 }
const summary = { ...sale, total_amount: '12000.00', total_paid: '4000.00', remaining_balance: '8000.00' }

test('simultaneous loads and revisiting an unchanged sale share one summary request', async () => {
  const cache = new Map()
  let requests = 0
  const request = async () => { requests += 1; return summary }
  const results = await Promise.all([getSaleSummary(sale, cache, request), getSaleSummary(sale, cache, request)])
  assert.deepEqual(results, [summary, summary])
  assert.equal(await getSaleSummary({ ...sale }, cache, request), summary)
  assert.equal(requests, 1)
})

test('a payment or correction revision fetches fresh financial values', async () => {
  const cache = new Map()
  let requests = 0
  const request = async () => { requests += 1; return requests === 1 ? summary : { ...summary, version: 2, total_paid: '7000.00', remaining_balance: '5000.00' } }
  await getSaleSummary(sale, cache, request)
  const updated = await getSaleSummary({ ...sale, version: 2 }, cache, request)
  assert.equal(requests, 2)
  assert.equal(updated.remaining_balance, '5000.00')
})

test('a failed request is retryable and never becomes a zero balance', async () => {
  const cache = new Map()
  let requests = 0
  const request = async () => { requests += 1; if (requests === 1) throw new Error('Connection lost'); return summary }
  await assert.rejects(getSaleSummary(sale, cache, request), /Connection lost/)
  assert.equal((await getSaleSummary(sale, cache, request)).remaining_balance, '8000.00')
  assert.equal(requests, 2)
})

test('missing amounts and a different sale summary cannot masquerade as verified balances', async () => {
  for (const invalid of [{ ...summary, total_paid: null }, { ...summary, remaining_balance: undefined }, { ...summary, id: 43 }]) {
    await assert.rejects(getSaleSummary(sale, new Map(), async () => invalid))
  }
})
