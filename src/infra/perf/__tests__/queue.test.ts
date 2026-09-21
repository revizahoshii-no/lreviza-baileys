import assert from 'node:assert/strict'
import test from 'node:test'

import { BoundedTaskQueue, BoundedTaskQueueFullError } from '@infra/perf/BoundedTaskQueue'

test('bounded task queue enforces queue size and concurrency', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] })

    const queue = new BoundedTaskQueue(2, 1)
    const order: string[] = []

    const a = queue.enqueue(async () => {
        order.push('a:start')
        await new Promise((resolve) => setTimeout(resolve, 5))
        order.push('a:end')
        return 'a'
    })
    const b = queue.enqueue(async () => {
        order.push('b')
        return 'b'
    })
    const c = queue.enqueue(async () => {
        order.push('c')
        return 'c'
    })

    await assert.rejects(
        () => queue.enqueue(async () => 'overflow'),
        (error) => error instanceof BoundedTaskQueueFullError
    )

    t.mock.timers.tick(5)
    await Promise.resolve()
    await Promise.resolve()

    assert.equal(await a, 'a')
    assert.equal(await b, 'b')
    assert.equal(await c, 'c')
    assert.deepEqual(order, ['a:start', 'a:end', 'b', 'c'])
})

test('bounded task queue validates constructor params', () => {
    assert.throws(() => new BoundedTaskQueue(0, 1), /maxQueueSize must be > 0/)
    assert.throws(() => new BoundedTaskQueue(1, 0), /maxConcurrency must be > 0/)
})
