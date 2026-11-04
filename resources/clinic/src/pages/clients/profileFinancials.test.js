import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeClientSales } from './profileFinancials.js'

test('a confirmed client with no sales has zero totals', () => {
  assert.deepEqual(summarizeClientSales([]), { total_amount: '0.00', total_paid: '0.00', remaining_balance: '0.00' })
})

test('ordinary sales and separate purchases of the same treatment all contribute their authoritative summaries', () => {
  const sales = [
    { id: 1, financial: { total_amount: '500.10', total_paid: '100.05', remaining_balance: '400.05' } },
    { id: 2, package_service_id: 3, financial: { total_amount: '12000', total_paid: '4000', remaining_balance: '8000' } },
    { id: 3, package_service_id: 3, canceled_at: '2026-10-25', financial: { total_amount: '2500.20', total_paid: '500.10', remaining_balance: '2000.10' } },
  ]
  assert.deepEqual(summarizeClientSales(sales), { total_amount: '15000.30', total_paid: '4600.15', remaining_balance: '10400.15' })
})

test('missing failed or malformed financial data is never silently treated as zero', () => {
  for (const missing of [undefined, null, '', 'NaN', '-1.00', '1.001']) {
    assert.throws(() => summarizeClientSales([{ financial: { total_amount: missing, total_paid: '0', remaining_balance: '0' } }]), /unavailable or invalid/)
  }
  assert.throws(() => summarizeClientSales([{}]), /unavailable or invalid/)
})

test('decimal additions remain exact for large balances and many small payments', () => {
  const sales = Array.from({ length: 100 }, () => ({ financial: { total_amount: '9999999999.99', total_paid: '0.01', remaining_balance: '9999999999.98' } }))
  assert.deepEqual(summarizeClientSales(sales), { total_amount: '999999999999.00', total_paid: '1.00', remaining_balance: '999999999998.00' })
})

test('a negative balance returned by the backend is preserved rather than hidden or clamped', () => {
  assert.deepEqual(summarizeClientSales([{ financial: { total_amount: '100.00', total_paid: '100.05', remaining_balance: '-0.05' } }]), { total_amount: '100.00', total_paid: '100.05', remaining_balance: '-0.05' })
})
