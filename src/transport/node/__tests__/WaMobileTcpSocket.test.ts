import assert from 'node:assert/strict'
import { Agent } from 'node:http'
import { createServer, type Socket as NetSocket } from 'node:net'
import test, { type TestContext } from 'node:test'

import { WA_READY_STATES } from '@protocol/constants'
import { WaMobileTcpSocket, WaMobileTcpSocketCtor } from '@transport/node/WaMobileTcpSocket'

test('WaMobileTcpSocketCtor exposes the class identity for RawWebSocketConstructor wiring', () => {
    assert.equal(WaMobileTcpSocketCtor, WaMobileTcpSocket)
})

test('WaMobileTcpSocket starts in CONNECTING and marks binaryType=arraybuffer', () => {
    const socket = new WaMobileTcpSocket('tcp://127.0.0.1:1')
    assert.equal(socket.readyState, WA_READY_STATES.CONNECTING)
    assert.equal(socket.binaryType, 'arraybuffer')
    socket.close()
})

test('WaMobileTcpSocket.send throws when readyState is not OPEN', () => {
    const socket = new WaMobileTcpSocket('tcp://127.0.0.1:1')
    assert.throws(() => socket.send(new Uint8Array([0])), /non-OPEN/)
    assert.throws(() => socket.send('hello'), /non-OPEN/)
    socket.close()
})

test('WaMobileTcpSocket rejects malformed port in url', () => {
    assert.throws(() => new WaMobileTcpSocket('tcp://127.0.0.1:notaport'), /invalid port/)
    assert.throws(() => new WaMobileTcpSocket('tcp://127.0.0.1:123abc'), /invalid port/)
    assert.throws(() => new WaMobileTcpSocket('tcp://127.0.0.1:-1'), /invalid port/)
    assert.throws(() => new WaMobileTcpSocket('tcp://127.0.0.1:0'), /port out of range/)
    assert.throws(() => new WaMobileTcpSocket('tcp://127.0.0.1:70000'), /port out of range/)
})

test('WaMobileTcpSocket rejects empty host', () => {
    assert.throws(() => new WaMobileTcpSocket('tcp://:443'), /invalid host/)
    assert.throws(() => new WaMobileTcpSocket('tcp://'), /invalid host/)
})

test('WaMobileTcpSocket accepts tcp:// scheme, bare host:port, trailing slash and query string', () => {
    const unreachable = (url: string): void => {
        const sock = new WaMobileTcpSocket(url)
        sock.onerror = () => undefined
        sock.close()
    }
    unreachable('tcp://127.0.0.1:1')
    unreachable('127.0.0.1:1')
    unreachable('tcp://127.0.0.1:1/ignored')
    unreachable('tcp://127.0.0.1:1?ED=CAUIAggS')
})

test('WaMobileTcpSocket.close is idempotent when already CLOSED', () => {
    const socket = new WaMobileTcpSocket('tcp://127.0.0.1:1')
    socket.onerror = () => undefined
    socket.close()
    socket.close()
    assert.ok(
        socket.readyState === WA_READY_STATES.CLOSING ||
            socket.readyState === WA_READY_STATES.CLOSED
    )
})

interface FakeProxy {
    readonly port: number
    /** CONNECT request line + headers received from the client, latin1-decoded. */
    readonly request: () => string
    readonly close: () => void
}

/**
 * Minimal HTTP CONNECT proxy. Buffers the request head, hands control to
 * `onConnect` so the test writes whatever response it needs, then forwards
 * every later chunk to `onTunneled` (echo by default).
 */
async function startFakeProxy(
    t: TestContext,
    handlers: {
        readonly onConnect: (peer: NetSocket, remaining: Buffer) => void
        readonly onTunneled?: (peer: NetSocket, chunk: Buffer) => void
    }
): Promise<FakeProxy> {
    const forward = handlers.onTunneled ?? ((peer: NetSocket, chunk: Buffer) => peer.write(chunk))
    let request = ''
    const server = createServer((peer) => {
        let pending = Buffer.alloc(0)
        peer.on('error', () => undefined)
        peer.on('data', (chunk) => {
            if (request) {
                forward(peer, chunk)
                return
            }
            pending = Buffer.concat([pending, chunk])
            const end = pending.indexOf('\r\n\r\n')
            if (end === -1) return
            request = pending.subarray(0, end).toString('latin1')
            handlers.onConnect(peer, pending.subarray(end + 4))
        })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    t.after(() => server.close())
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    return {
        port: address.port,
        request: () => request,
        close: () => server.close()
    }
}

/** Agent shaped like `http-proxy-agent`, which keeps its endpoint in a `URL`. */
function proxyAgent(url: string): Agent {
    return Object.assign(new Agent(), { proxy: new URL(url) })
}

function waitFor<T>(label: string, register: (done: (value: T) => void) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timeout`)), 2_000)
        register((value) => {
            clearTimeout(timer)
            resolve(value)
        })
    })
}

test('WaMobileTcpSocket tunnels mobile TCP through an authenticated HTTP CONNECT proxy', async (t) => {
    const proxy = await startFakeProxy(t, {
        onConnect: (peer) => {
            peer.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        }
    })
    const socket = new WaMobileTcpSocket('tcp://g.whatsapp.net:443', undefined, {
        agent: proxyAgent(`http://proxy-user:proxy-pass@127.0.0.1:${proxy.port}`)
    })
    t.after(() => socket.close())
    let socketError: string | undefined
    socket.onerror = (event) => {
        socketError ??= event.reason ?? 'unknown'
    }

    await waitFor<void>('proxy open', (done) => {
        socket.onopen = () => done()
    })
    assert.equal(socketError, undefined)
    assert.match(proxy.request(), /^CONNECT g\.whatsapp\.net:443 HTTP\/1\.1/m)
    assert.match(proxy.request(), /Proxy-Authorization: Basic cHJveHktdXNlcjpwcm94eS1wYXNz/i)

    const echoed = waitFor<Uint8Array>('proxy echo', (done) => {
        socket.onmessage = (event) => done(event.data as Uint8Array)
    })
    socket.send(new Uint8Array([1, 2, 3]))
    assert.deepEqual(await echoed, new Uint8Array([1, 2, 3]))
    assert.equal(socketError, undefined)
})

test('WaMobileTcpSocket keeps tunneled bytes that share the packet with the CONNECT response', async (t) => {
    const proxy = await startFakeProxy(t, {
        onConnect: (peer) => {
            peer.write(
                Buffer.concat([
                    Buffer.from('HTTP/1.1 200 Connection Established\r\n\r\n', 'latin1'),
                    Buffer.from([9, 8, 7])
                ])
            )
        }
    })
    const socket = new WaMobileTcpSocket('tcp://g.whatsapp.net:443', undefined, {
        agent: proxyAgent(`http://127.0.0.1:${proxy.port}`)
    })
    t.after(() => socket.close())
    socket.onerror = () => undefined

    const tunneled = waitFor<Uint8Array>('tunneled payload', (done) => {
        socket.onopen = () => {
            socket.onmessage = (event) => done(event.data as Uint8Array)
        }
    })
    assert.deepEqual(await tunneled, new Uint8Array([9, 8, 7]))
})

test('WaMobileTcpSocket fails the tunnel when the proxy rejects CONNECT', async (t) => {
    const proxy = await startFakeProxy(t, {
        onConnect: (peer) => {
            peer.write(
                'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic\r\n\r\n'
            )
        }
    })
    const socket = new WaMobileTcpSocket('tcp://g.whatsapp.net:443', undefined, {
        agent: proxyAgent(`http://127.0.0.1:${proxy.port}`)
    })
    t.after(() => socket.close())
    socket.onopen = () => assert.fail('tunnel opened on a rejected CONNECT')

    const reason = await waitFor<string>('proxy rejection', (done) => {
        socket.onerror = (event) => done(event.reason ?? '')
    })
    assert.match(reason, /proxy CONNECT failed \(HTTP\/1\.1 407/)
    assert.notEqual(socket.readyState, WA_READY_STATES.OPEN)
})

test('WaMobileTcpSocket rejects CONNECT headers larger than the buffer cap', async (t) => {
    const proxy = await startFakeProxy(t, {
        onConnect: (peer) => {
            const head = Buffer.from('HTTP/1.1 200 Connection Established\r\nX-Pad: ', 'latin1')
            peer.write(Buffer.concat([head, Buffer.alloc(65_536 - head.byteLength, 0x61)]))
            peer.write(Buffer.from(`${'a'.repeat(100)}\r\n\r\n`, 'latin1'))
        }
    })
    const socket = new WaMobileTcpSocket('tcp://g.whatsapp.net:443', undefined, {
        agent: proxyAgent(`http://127.0.0.1:${proxy.port}`)
    })
    t.after(() => socket.close())
    socket.onopen = () => assert.fail('tunnel opened on an oversized CONNECT response')

    const reason = await waitFor<string>('oversized header rejection', (done) => {
        socket.onerror = (event) => done(event.reason ?? '')
    })
    assert.match(reason, /proxy response headers too large/)
    assert.notEqual(socket.readyState, WA_READY_STATES.OPEN)
})
