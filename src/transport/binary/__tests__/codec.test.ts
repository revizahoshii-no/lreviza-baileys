import assert from 'node:assert/strict'
import test from 'node:test'
import { gzipSync } from 'node:zlib'

import {
    decodeBinaryNode,
    decodeBinaryNodeStanza,
    encodeBinaryNode,
    encodeBinaryNodeStanza
} from '@transport/binary'
import { STREAM_END } from '@transport/binary/constants'
import type { BinaryNode } from '@transport/types'

test('binary encoder/decoder round-trip for nested node with binary payload', () => {
    const source: BinaryNode = {
        tag: 'iq',
        attrs: {
            id: '123',
            type: 'set',
            xmlns: 'w:test'
        },
        content: [
            {
                tag: 'sync',
                attrs: {},
                content: [
                    {
                        tag: 'collection',
                        attrs: { name: 'regular' },
                        content: new Uint8Array([1, 2, 3, 4])
                    }
                ]
            }
        ]
    }

    const encoded = encodeBinaryNode(source)
    const decoded = decodeBinaryNode(encoded)

    assert.equal(decoded.tag, source.tag)
    assert.equal(decoded.attrs.id, '123')
    const sync = Array.isArray(decoded.content) ? decoded.content[0] : null
    assert.ok(sync)
    const collection = Array.isArray(sync.content) ? sync.content[0] : null
    assert.ok(collection)
    assert.deepEqual(collection.content, new Uint8Array([1, 2, 3, 4]))
})

test('binary stanza codec prepends frame byte and decodes back', async () => {
    const node: BinaryNode = {
        tag: 'presence',
        attrs: { type: 'available' }
    }
    const stanza = encodeBinaryNodeStanza(node)

    assert.equal(stanza[0], 0)
    const decoded = await decodeBinaryNodeStanza(stanza)
    assert.equal(decoded.tag, 'presence')
    assert.equal(decoded.attrs.type, 'available')
})

test('decodeBinaryNodeStanza handles compressed payload', async () => {
    const node: BinaryNode = {
        tag: 'message',
        attrs: { id: 'm1', to: '123@s.whatsapp.net' },
        content: [{ tag: 'body', attrs: {}, content: new Uint8Array([9, 8, 7]) }]
    }
    const compressed = gzipSync(encodeBinaryNode(node))
    const stanza = new Uint8Array(1 + compressed.length)
    stanza[0] = 0x02
    stanza.set(compressed, 1)

    const decoded = await decodeBinaryNodeStanza(stanza)
    assert.equal(decoded.tag, 'message')
    assert.equal(decoded.attrs.id, 'm1')
})

test('decodeBinaryNodeStanza rejects stream end marker', async () => {
    await assert.rejects(
        () => decodeBinaryNodeStanza(new Uint8Array([STREAM_END])),
        /stream end stanza is not a binary node/
    )
})
