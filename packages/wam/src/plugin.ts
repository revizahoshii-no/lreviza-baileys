import { defineWaClientPlugin } from '@revizahoshii/hoshino'

import { WaWamCoordinator, type WaWamCoordinatorOptions } from './WaWamCoordinator.js'

export interface WamPluginOptions extends WaWamCoordinatorOptions {}

/**
 * WaClient plugin that emits WhatsApp Web WAM (`w:stats`) telemetry, exposing
 * {@link WaWamCoordinator} at `client.wam`. Sending the telemetry a real WA Web
 * client sends improves parity; batch globals derive from the client's own
 * device identity so they agree with the pairing `ClientPayload`.
 *
 * @example
 * ```ts
 * import { WaClient } from '@revizahoshii/hoshino'
 * import { wamPlugin } from '@revizahoshii/hoshino-wam'
 *
 * const client = new WaClient({
 *   store,
 *   sessionId: 'main',
 *   plugins: [wamPlugin()]
 * })
 *
 * client.wam.commit('UiAction', { uiActionType: 'CHAT_OPEN' })
 * ```
 */
export function wamPlugin(options: WamPluginOptions = {}) {
    return defineWaClientPlugin<'wam', WaWamCoordinator>({
        id: '@revizahoshii/hoshino-wam',
        exposeAs: 'wam',
        setup(ctx) {
            return new WaWamCoordinator(ctx, options)
        },
        async dispose(coordinator) {
            await coordinator.dispose()
        }
    })
}
