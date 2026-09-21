import type { WaProxyAgent, WaProxyDispatcher, WaProxyTransport } from '@transport/types'
import { bytesToBase64, TEXT_ENCODER } from '@util/bytes'

/** Type guard for an undici-style proxy dispatcher (has `dispatch` method). */
export function isProxyDispatcher(value: unknown): value is WaProxyDispatcher {
    return (
        typeof value === 'object' &&
        value !== null &&
        'dispatch' in value &&
        typeof (value as { readonly dispatch?: unknown }).dispatch === 'function'
    )
}

/** Type guard for a Node http.Agent-style proxy (has `addRequest` method). */
export function isProxyAgent(value: unknown): value is WaProxyAgent {
    return (
        typeof value === 'object' &&
        value !== null &&
        'addRequest' in value &&
        typeof (value as { readonly addRequest?: unknown }).addRequest === 'function'
    )
}

/** Type guard accepting either {@link isProxyDispatcher} or {@link isProxyAgent} shapes. */
export function isProxyTransport(value: unknown): value is WaProxyTransport {
    return isProxyDispatcher(value) || isProxyAgent(value)
}

/** Narrows `proxy` to {@link WaProxyDispatcher} or returns `undefined`. */
export function toProxyDispatcher(
    proxy: WaProxyTransport | undefined
): WaProxyDispatcher | undefined {
    if (!proxy || !isProxyDispatcher(proxy)) {
        return undefined
    }
    return proxy
}

/** Narrows `proxy` to {@link WaProxyAgent} or returns `undefined`. */
export function toProxyAgent(proxy: WaProxyTransport | undefined): WaProxyAgent | undefined {
    if (!proxy || !isProxyAgent(proxy)) {
        return undefined
    }
    return proxy
}

/**
 * HTTP CONNECT endpoint a raw TCP transport dials to reach its destination.
 *
 * @sensitive Contains proxy credentials (`authorization`). Never log, serialize
 * via `JSON.stringify`, or transmit unencrypted. Persist with encryption-at-rest.
 */
export interface WaTcpProxyEndpoint {
    readonly hostname: string
    readonly port: number
    /** Ready-to-send `Proxy-Authorization` value when the proxy url carries credentials. */
    readonly authorization?: string
}

const TCP_PROXY_HINT =
    'socketOptions.proxy.ws must hold an http.Agent-style proxy pointing at an http: url (e.g. new HttpProxyAgent("http://host:port")) to tunnel raw TCP'

/**
 * Resolves the proxy endpoint a raw TCP transport tunnels through with HTTP
 * CONNECT.
 *
 * Returns `undefined` only when no proxy is configured. Proxy shapes the tunnel
 * cannot honour throw instead of resolving to `undefined`, because dropping one
 * silently would dial the destination directly – the opposite of what a
 * deployment that pins its egress to a proxy asked for.
 */
export function toTcpProxyEndpoint(
    proxy: WaProxyTransport | undefined
): WaTcpProxyEndpoint | undefined {
    if (!proxy) {
        return undefined
    }
    if (!isProxyAgent(proxy)) {
        if (isProxyDispatcher(proxy)) {
            throw new Error(
                `undici-style proxy dispatchers cannot tunnel raw TCP – ${TCP_PROXY_HINT}`
            )
        }
        throw new Error(`unsupported proxy transport – ${TCP_PROXY_HINT}`)
    }
    const url = readAgentProxyUrl(proxy)
    if (url.protocol !== 'http:') {
        throw new Error(
            `proxy protocol ${url.protocol} is not supported by the raw TCP tunnel – ${TCP_PROXY_HINT}`
        )
    }
    const username = decodeProxyUserInfo(url.username, 'username')
    const password = decodeProxyUserInfo(url.password, 'password')
    return {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 80,
        authorization:
            username || password
                ? `Basic ${bytesToBase64(TEXT_ENCODER.encode(`${username}:${password}`))}`
                : undefined
    }
}

/** Throws when {@link toTcpProxyEndpoint} cannot honour `proxy`. */
export function assertTcpProxySupported(proxy: WaProxyTransport | undefined): void {
    toTcpProxyEndpoint(proxy)
}

/**
 * Decodes one userinfo component of a proxy url. `new URL()` keeps invalid
 * percent escapes verbatim, so a credential holding a literal `%` would reach
 * `decodeURIComponent` and throw a bare `URIError`. The value never reaches the
 * message – only the field name does.
 */
function decodeProxyUserInfo(value: string, field: 'username' | 'password'): string {
    try {
        return decodeURIComponent(value)
    } catch {
        throw new Error(`proxy url ${field} contains a malformed percent escape`)
    }
}

/**
 * Reads the proxy url an `http.Agent`-style proxy exposes. Every `*-proxy-agent`
 * package keeps it on `.proxy`, but only the http/https ones store a `URL`
 * there – `socks-proxy-agent` stores a parsed `{ host, port, type }` endpoint.
 */
function readAgentProxyUrl(agent: WaProxyAgent): URL {
    const value = (agent as { readonly proxy?: unknown }).proxy
    if (value instanceof URL) {
        return value
    }
    if (typeof value === 'string') {
        try {
            return new URL(value)
        } catch {
            throw new Error(`proxy agent exposes an unparseable proxy url ${JSON.stringify(value)}`)
        }
    }
    if (isSocksProxyEndpoint(value)) {
        throw new Error(`socks proxy agents cannot tunnel raw TCP – ${TCP_PROXY_HINT}`)
    }
    throw new Error(`proxy agent exposes no proxy url – ${TCP_PROXY_HINT}`)
}

/** Matches the `{ host, port, type }` endpoint `socks-proxy-agent` keeps on `.proxy`. */
function isSocksProxyEndpoint(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { readonly host?: unknown }).host === 'string' &&
        typeof (value as { readonly port?: unknown }).port === 'number'
    )
}
