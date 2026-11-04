import assert from 'node:assert/strict'
import { test } from 'node:test'
import { newPackageRequestKey, readPendingPackage, savePendingPackage, clearPendingPackage, packageRequestMayHaveSaved } from './packageRequests.js'

function tabStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
}

test('an uncertain purchase survives closing the form with its original key and price', () => {
  const storage = tabStorage()
  const payload = { client_id: 1, package_purchase_key: newPackageRequestKey(), items: [{ unit_price: '12000.00' }] }
  savePendingPackage('purchase_admin', payload, storage)
  payload.items[0].unit_price = '15000.00'
  const reopened = readPendingPackage('purchase_admin', storage)
  assert.equal(reopened.items[0].unit_price, '12000.00')
  assert.equal(reopened.package_purchase_key, payload.package_purchase_key)
  assert.match(reopened.package_purchase_key, /^[a-z0-9_-]{16,64}$/)
})

test('completion recovery is scoped to the user and exact purchase and clears only after resolution', () => {
  const storage = tabStorage()
  const payload = { completion_key: newPackageRequestKey(), supplies: [{ inventory_item_id: 3, quantity_used: '1.125' }] }
  savePendingPackage('completion_admin_1', payload, storage)
  savePendingPackage('completion_admin_2', { completion_key: 'second-completion-key' }, storage)
  assert.equal(readPendingPackage('completion_staff_1', storage), null)
  assert.deepEqual(readPendingPackage('completion_admin_1', storage), payload)
  clearPendingPackage('completion_admin_1', storage)
  assert.equal(readPendingPackage('completion_admin_1', storage), null)
  assert.equal(readPendingPackage('completion_admin_2', storage).completion_key, 'second-completion-key')
})

test('network failures server errors and conflicts never silently discard a possibly saved package operation', () => {
  for (const failure of [new Error('Connection lost'), { status: 500 }, { status: 503 }, { status: 409 }]) assert.equal(packageRequestMayHaveSaved(failure), true)
  for (const status of [400, 403, 404, 422]) assert.equal(packageRequestMayHaveSaved({ status }), false)
})
