import assert from 'node:assert/strict'
import process from 'node:process'
import { test } from 'node:test'
import { todayISO } from './utils.js'

test('date defaults use the local calendar day before 8am in the Philippines', (context) => {
  const previousTimezone = process.env.TZ
  process.env.TZ = 'Asia/Manila'
  context.after(() => {
    if (previousTimezone === undefined) delete process.env.TZ
    else process.env.TZ = previousTimezone
  })
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-19T17:00:00Z') })
  assert.equal(todayISO(), '2026-10-20')
  context.mock.timers.tick(24 * 60 * 60 * 1000)
  assert.equal(todayISO(), '2026-10-21')
})
