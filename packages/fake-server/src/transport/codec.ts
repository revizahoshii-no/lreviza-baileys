/**
 * Layer 1 – binary stanza codec wrapper.
 *
 * Re-exports the bit-exact WhatsApp WAP token encoder/decoder from @revizahoshii/hoshino.
 * This file is the only sanctioned import path for binary node serialization
 * inside the fake server.
 */

export {
    decodeBinaryNode,
    decodeBinaryNodeStanza,
    encodeBinaryNode,
    encodeBinaryNodeStanza,
    verifyNoiseCertificateChain
} from '@revizahoshii/hoshino/transport'
export type { BinaryNode, WaNoiseRootCa } from '@revizahoshii/hoshino/transport'
