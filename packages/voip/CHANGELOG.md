# @revizahoshii/hoshino-voip

## 1.1.0

### Minor Changes

- cfd4b9d: Dial relays on the web client port. `connectRelays` pinned every relay
  connection to 3478, which WhatsApp Web names `FAUX_WEB_CLIENT_RELAY_PORT` and
  never dials: a relay reached there completes the handshake and accepts the
  uplink, but never forwards the peer's stream back, so the call is silently one
  way. The port is now `TRUE_WEB_CLIENT_RELAY_PORT` (3480), the value the package
  already carried as the fallback in `configureRelays`.

    New `useOriginalRelayPort` plugin option, default `false`, dials the port each
    endpoint advertises instead. WhatsApp Web gates the same choice behind
    `shouldUseOriginalRelayPort`; without it a relay is only ever reachable on one
    fixed port, however the `<te2>` block addresses it.

- b1aab5d: Add bidirectional WhatsApp video calls with H.264 RTP packetization, inbound frame assembly, RTCP feedback, and public video media events.

### Patch Changes

- a90a53e: Surface the caller phone JID (`caller_pn`) from incoming call offers on the emitted
  call state, so a caller identified by a LID can be matched to their phone number.
  Media derivation is unchanged: the peer SSRC and the SRTP keys stay on the LID device
  JID, which is what the peer derives from.
- f51d2d9: Increase the live audio buffer headroom to absorb upstream jitter without dropping recent speech.

## 1.0.0

### Major Changes

- Initial release: WhatsApp VOIP (calling) plugin for `@revizahoshii/hoshino`. Registers on
  `WaClient` via `voipPlugin()` and exposes the calling API at `client.voip`.
- MLow voice codec through `libmlow-wasm` (WASM, no native build step or bundled
  binaries).
- Full media stack: `<call>` signaling, RTP/SRTP, STUN, WebRTC/SCTP relay
  transport, and audio engine.
- Pre-recorded outbound audio (`loadAudio`) and live 16 kHz mono PCM
  (`feedLiveAudio`).
- Multi-call support with per-call `CallMediaSession` instances and
  `maxConcurrentCalls` (default `1`). Extra incoming offers wait with
  `canAccept: false` until a slot frees.
- Incoming `<call>`, call-class `<ack>`, and call `<receipt>` handlers are
  registered automatically (prepend, no double-ack).
- Requires `@revizahoshii/hoshino@^1.0.0` and `libmlow-wasm`. Optional peers: `@roamhq/wrtc`
  (SCTP relay for real calls), `fluent-ffmpeg` (file decode for `loadAudio`).
