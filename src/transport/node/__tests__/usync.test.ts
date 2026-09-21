import assert from 'node:assert/strict'
import test from 'node:test'

import { createUsyncSidGenerator } from '@transport/node/usync'

interface ParsedUsyncSid {
    readonly left: number
    readonly right: number
    readonly counter: number
}

function parseUsyncSid(sid: string): ParsedUsyncSid {
    const [seed, counterRaw] = sid.split('-')
    const [leftRaw, rightRaw] = seed.split('.')

    const left = Number.parseInt(leftRaw ?? '', 10)
    const right = Number.parseInt(rightRaw ?? '', 10)
    const counter = Number.parseInt(counterRaw ?? '', 10)
    if (
        !Number.isSafeInteger(left) ||
        !Number.isSafeInteger(right) ||
        !Number.isSafeInteger(counter)
    ) {
        throw new Error(`invalid usync sid format: ${sid}`)
    }

    return {
        left,
        right,
        counter
    }
}

test('usync sid generators keep independent counters per instance', async () => {
    const sessionA = createUsyncSidGenerator()
    const sessionB = createUsyncSidGenerator()

    const a1 = parseUsyncSid(await sessionA())
    const a2 = parseUsyncSid(await sessionA())
    const b1 = parseUsyncSid(await sessionB())
    const b2 = parseUsyncSid(await sessionB())

    assert.ok(a1.left >= 0 && a1.left <= 65_535)
    assert.ok(a1.right >= 0 && a1.right <= 65_535)
    assert.ok(b1.left >= 0 && b1.left <= 65_535)
    assert.ok(b1.right >= 0 && b1.right <= 65_535)

    assert.equal(a2.left, a1.left)
    assert.equal(a2.right, a1.right)
    assert.equal(a2.counter, a1.counter + 1)

    assert.equal(b2.left, b1.left)
    assert.equal(b2.right, b1.right)
    assert.equal(b2.counter, b1.counter + 1)
})
