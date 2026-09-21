/**
 * Layer 1 – credential/store type wrapper.
 *
 * Re-exports the auth and store types from @revizahoshii/hoshino so the fixture layer can
 * seed a registered session without importing @revizahoshii/hoshino directly.
 */

export type { WaAuthCredentials, WaMobileTransportDeviceInfo } from '@revizahoshii/hoshino/auth'
export type { WaStore } from '@revizahoshii/hoshino/store'
