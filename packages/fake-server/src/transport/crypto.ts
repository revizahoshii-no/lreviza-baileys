/**
 * Layer 1 – crypto primitives wrapper.
 *
 * Re-exports bit-exact cryptographic primitives from @revizahoshii/hoshino. No protocol
 * interpretation, so reusing them does not create a test-vs-impl tautology.
 */

export {
    aesCbcDecrypt,
    aesCbcEncrypt,
    aesGcmDecrypt,
    aesGcmEncrypt,
    Ed25519,
    hkdf,
    hkdfSplit,
    hmacSha256Sign,
    hmacSha512Sign,
    prependVersion,
    randomBytesAsync,
    randomIntAsync,
    readVersionedContent,
    sha256,
    sha512,
    toRawPubKey,
    toSerializedPubKey,
    X25519,
    xeddsaSign,
    xeddsaVerify
} from '@revizahoshii/hoshino/crypto'
export type { SignalKeyPair } from '@revizahoshii/hoshino/crypto'
export { WaMediaCrypto } from '@revizahoshii/hoshino/media'
