import assert from 'node:assert/strict'
import test from 'node:test'

import * as appstate from '@appstate'
import * as auth from '@auth'
import * as client from '@client'
import * as crypto from '@crypto'
import * as media from '@media'
import * as message from '@message'
import * as protocol from '@protocol'
import * as retry from '@retry'
import * as signal from '@signal'
import * as store from '@store'
import * as transport from '@transport'

test('module barrels expose stable public symbols', () => {
    assert.equal(typeof appstate.WaAppStateSyncClient, 'function')
    assert.equal(typeof auth.WaAuthClient, 'function')
    assert.equal(typeof client.WaClient, 'function')
    assert.equal(typeof crypto.hkdf, 'function')
    assert.equal(typeof media.WaMediaTransferClient, 'function')
    assert.equal(typeof message.WaMessageClient, 'function')
    assert.equal(typeof protocol.WA_NODE_TAGS, 'object')
    assert.equal(typeof retry.WaRetryReplayService, 'function')
    assert.equal(typeof signal.SignalProtocol, 'function')
    assert.equal(typeof store.createStore, 'function')
    assert.equal(typeof transport.WaComms, 'function')
})
