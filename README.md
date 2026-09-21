# @revizahoshii/hoshino

Library WhatsApp Web berbasis TypeScript — fork dari [Zapo](https://github.com/vinikjkkj/zapo)
dengan tambahan fitur dari [@revizahoshii/baileys](https://github.com/revizahoshii-no/reviza-baileys).

Tujuan fork: mempertahankan performa dan kestabilan Zapo, sambil menambah fitur
estetika dan kemudahan yang sebelumnya hanya ada di reviza-baileys.

```bash
npm install @revizahoshii/hoshino
```

Node.js >= 22 untuk membangun dari source. Untuk memakai paket jadi, Node >= 20 cukup.

## Daftar isi

- [Mulai cepat](#mulai-cepat)
- [Pairing code](#pairing-code-tanpa-qr)
- [Tombol interaktif](#1-tombol-interaktif--buttonbuilder)
- [AI Rich: tabel & blok kode](#2-ai-rich--tabel--blok-kode-berwarna)
- [Kutipan bercentang biru](#3-kutipan-bercentang-biru)
- [Album](#4-album)
- [Auto-follow saluran](#5-auto-follow-saluran)
- [Validator & helper](#6-validator--helper)
- [Konstanta & enum](#7-konstanta--enum)
- [Referensi lengkap](#referensi-lengkap)
- [Kredit](#kredit)

---

## Mulai cepat

```ts
import { WaClient, createStore, createPinoLogger } from '@revizahoshii/hoshino'

const client = new WaClient({
    sessionId: 'namasesi',        // WAJIB, tidak boleh kosong
    store: createStore(),          // memory-only: kredensial hilang saat restart
    logger: createPinoLogger({ level: 'info' })
})

client.on('auth_qr', ({ qr }) => console.log(qr))
client.on('message', async (msg) => console.log('pesan masuk:', msg))

await client.connect()
```

> **Untuk produksi, jangan pakai `createStore()` polos.** Store bawaan bersifat
> memory-only — kredensial hilang setiap restart dan bot minta pairing ulang.
> Pakai store persisten:

```bash
npm install @revizahoshii/hoshino-store-sqlite better-sqlite3
```

```ts
import { createSqliteStore } from '@revizahoshii/hoshino-store-sqlite'

const backend = await createSqliteStore({ path: './sesi.db' })

const store = createStore({
    backends: { sqlite: backend },
    providers: {
        auth: 'sqlite', preKey: 'sqlite', session: 'sqlite', identity: 'sqlite',
        senderKey: 'sqlite', signal: 'sqlite', appState: 'sqlite',
        privacyToken: 'sqlite', messages: 'sqlite', threads: 'sqlite', contacts: 'sqlite'
    }
})

const client = new WaClient({ sessionId: 'namasesi', store, logger })
```

Catatan: parameternya `path` (bukan `filename`). Bila `backends` diisi, **semua**
domain di `providers` wajib diisi — melewatkan satu membuat `createStore` melempar
error yang menyebut domain mana yang kurang. File database dibuat lazy saat
penulisan pertama.

### Pairing code (tanpa QR)

```ts
client.once('auth_pairing_required', async () => {
    // argumen ke-3 = kode custom 8 karakter (opsional)
    const code = await client.auth.requestPairingCode('6283134978318', true, 'REVIZA01')
    console.log('masukkan kode:', code.match(/.{1,4}/g)!.join('-'))
})

await client.connect()
```

---

## 1. Tombol interaktif — `ButtonBuilder`

Zapo mendukung `interactiveMessage` di lapisan protokol tetapi tidak punya
builder. `ButtonBuilder` mengisi bagian itu.

### Cara kerja

Setiap `add*` mendorong satu entri `nativeFlowMessage.buttons` berisi
`buttonParamsJson`. Saat `build()` dipanggil, semuanya dibungkus jadi
`interactiveMessage` lengkap dengan body, footer, header, dan contextInfo.

### Contoh

```ts
import { ButtonBuilder } from '@revizahoshii/hoshino'

const pesan = new ButtonBuilder()
    .setTitle('AI HOSHINO')
    .setSubtitle('MENU UTAMA')
    .setBody('Silakan pilih menu di bawah ini')
    .setFooter('Powered By Reviza D Kink')
    .addQuickReply('Menu', '.menu')
    .addQuickReply('Cara Pakai', '.carabot')
    .addUrl('Website', 'https://revizayowa.biz.id/')
    .addCopy('Salin Kode', 'REVIZA2026')
    .addCall('Hubungi Owner', '+6283134978318')
    .build()

await client.messages.send(jid, pesan)
```

### Daftar pilihan

```ts
const pesan = new ButtonBuilder()
    .setBody('Pilih kategori')
    .addList('Buka Daftar', [
        {
            title: 'Kategori',
            highlightLabel: 'Baru',
            rows: [
                { title: 'Sticker', description: 'Menu sticker', id: '.stickermenu' },
                { title: 'Downloader', description: 'Menu unduh', id: '.dlmenu' }
            ]
        }
    ])
    .build()
```

### Dengan mention dan tombol saluran

```ts
const pesan = new ButtonBuilder()
    .setBody('Halo @user')
    .setContextInfo({
        mentionedJid: ['6283134978318@s.whatsapp.net'],
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363426118421279@newsletter',
            serverMessageId: 143,
            newsletterName: 'Komunitas Reviza D Kink'
        }
    })
    .addQuickReply('Menu', '.menu')
    .build()
```

### Daftar method

| Method | Kegunaan |
|---|---|
| `setTitle(teks)` | judul kartu |
| `setSubtitle(teks)` | sub judul |
| `setBody(teks)` | isi utama |
| `setFooter(teks)` | footer |
| `setHeader(header)` | header media hasil upload |
| `setContextInfo(ctx)` | mention, saluran, externalAdReply |
| `addQuickReply(teks, id)` | tombol balasan cepat — menekan mengirim `id` |
| `addUrl(teks, url, merchantUrl?)` | tombol buka tautan |
| `addCopy(teks, kode)` | tombol salin ke papan klip |
| `addCall(teks, nomor)` | tombol panggil |
| `addList(judul, sections)` | daftar pilihan |
| `addRaw(name, params)` | native flow mentah |
| `build()` | hasilkan objek pesan |

Pintasan fungsional:

```ts
import { buildInteractiveMessage } from '@revizahoshii/hoshino'

const pesan = buildInteractiveMessage((b) =>
    b.setBody('Halo').addQuickReply('Menu', '.menu')
)
```

---

## 2. AI Rich — tabel & blok kode berwarna

### Cara kerja

Pesan AI Rich punya **dua lapis** yang harus cocok:

1. `submessages` — struktur proto yang dibaca WhatsApp
2. `unifiedResponse.data` — JSON layout yang dipakai klien untuk menggambar

Kalau keduanya tidak sinkron, tabel dan kode tidak muncul. `buildAiRichMessage`
mengurus keduanya sekaligus, termasuk `response_id` yang harus sama antara
`unifiedResponse` dan `botMetadata.botResponseId`.

### Tabel

```ts
import { buildTableMessage } from '@revizahoshii/hoshino'

await client.messages.send(jid, buildTableMessage(
    {
        title: 'Status Sistem',
        rows: [
            ['Komponen', 'Nilai'],     // baris pertama jadi heading
            ['Library', 'hoshino'],
            ['Uptime', '3 jam 12 menit']
        ]
    },
    { headerText: 'AI HOSHINO', footerText: 'Powered By Reviza D Kink' }
))
```

Tanpa heading: tambahkan `noHeading: true`.

### Blok kode berwarna

```ts
import { buildCodeMessage } from '@revizahoshii/hoshino'

await client.messages.send(jid, buildCodeMessage({
    language: 'javascript',
    code: `const halo = (nama) => {
  return \`Halo \${nama}\`   // komentar
}`
}))
```

Kode diwarnai otomatis lewat `tokenizeCode`. Mendukung **25 bahasa**:

`javascript` `js` `typescript` `ts` `python` `py` `go` `golang` `rust` `rs`
`c` `h` `cpp` `c++` `csharp` `cs` `bash` `sh` `zsh` `cmd` `bat` `powershell`
`ps1` `css` `html`

### Gabungan

```ts
import { buildAiRichMessage } from '@revizahoshii/hoshino'

await client.messages.send(jid, buildAiRichMessage({
    headerText: 'Laporan Harian',
    contentText: 'Ringkasan aktivitas bot hari ini.',
    table: { rows: [['Metrik', 'Nilai'], ['Pesan', '1.204']] },
    code: { language: 'bash', code: 'pm2 restart bot' },
    footerText: 'Selesai',
    disclaimerText: 'AI HOSHINO'
}))
```

### Opsi

| Opsi | Arti |
|---|---|
| `headerText` | teks pembuka |
| `contentText` | isi utama |
| `table` | `{ title?, rows, noHeading? }` |
| `code` | `{ language?, code }` |
| `footerText` | teks penutup |
| `disclaimerText` | teks kecil di atas kartu |
| `submessages` | daftar submessage mentah (kontrol penuh) |
| `messageSecret` | 32 byte custom; default acak |
| `fakeVerification` | kirim sertifikat acak — **umumnya jangan** |

### Catatan penting

- `messageSecret` **selalu** disertakan — WhatsApp memakainya untuk integritas
  pesan bot. Tanpa ini pesan bisa ditolak.
- `verificationMetadata` berisi sertifikat acak justru membuat WhatsApp
  **menahan konten**. Karena itu tidak dikirim kecuali `fakeVerification: true`.
- Peringatan *"WhatsApp tidak bisa memverifikasi keamanan media ini"* tidak bisa
  dihilangkan sepenuhnya tanpa sertifikat resmi dari Meta. Ini batas protokol,
  bukan bug library.

### Tingkat rendah

```ts
import { tokenizeCode, toUnified, wrapToBotForwardedMessage } from '@revizahoshii/hoshino'

const blocks = tokenizeCode('const x = 1', 'javascript')
// [{ highlightType: 1, codeContent: 'const' }, ...]

const submessages = [{ messageType: 2, messageText: 'Halo' }]
const unified = toUnified(submessages)          // payload JSON layout
const pesan = wrapToBotForwardedMessage({ submessages, unifiedResponse: { data: Buffer.from(JSON.stringify(unified)) } })
```

---

## 3. Kutipan bercentang biru

### Cara kerja

Lencana centang dan avatar berasal dari **dua mekanisme terpisah**:

| Bagian | Sumber |
|---|---|
| Lencana centang | `key.participant = '0@s.whatsapp.net'` |
| Avatar bulat | baris `item1.TEL;waid=<nomor>` di dalam vCard |

WhatsApp menggambar lencana untuk JID sistem dari daftar bawaan aplikasi, bukan
dari pengecekan sertifikat ke server. Avatar diambil dari foto profil nomor yang
ditulis pada `waid`, bukan dari `participant`.

vCard minimal yang bekerja:

```
BEGIN:VCARD
VERSION:3.0
N:;REVIZA;;;
FN:REVIZA
item1.TEL;waid=6283134978318:+6283134978318
item1.X-ABLabel:Mobile
END:VCARD
```

### Pemakaian

```ts
import { withOfficialQuote } from '@revizahoshii/hoshino'

// avatar mengikuti foto profil nomor pada waid
await client.messages.send(jid, withOfficialQuote(
    { text: 'Halo, ini balasan resmi' },
    { name: 'REVIZA DELUXE', waid: '6283134978318' }
))
```

Nomor otomatis dibersihkan: `'+62 831-3497-8318'` → `6283134978318`.

### Sebagai objek quoted terpisah

```ts
import { createOfficialQuote } from '@revizahoshii/hoshino'

const quoted = createOfficialQuote({ name: 'WhatsApp', waid: '6283134978318' })
await client.messages.send(jid, { conversation: 'Halo' }, { quoted })
```

### Pasang sebagai method client

```ts
import { bindVerifiedReply } from '@revizahoshii/hoshino'

bindVerifiedReply(client)

await client.sendOfficialReply(jid, { text: 'Halo' }, { name: 'REVIZA', waid: '6283134978318' })
await client.sendVerifiedReply(jid, { text: 'Halo' }, { preset: 'meta' })
```

### Kutipan bergaya saluran terverifikasi

```ts
import { withVerifiedReply, createVerifiedQuote } from '@revizahoshii/hoshino'

await client.messages.send(jid, withVerifiedReply(
    { text: 'Halo!' },
    { preset: 'meta' }          // preset: whatsapp | meta | metaai
))

const quoted = createVerifiedQuote({ preset: 'whatsapp', text: 'Pesan resmi' })
```

### Avatar dari foto profil pengirim

```ts
import { fetchProfileThumbnail, withOfficialQuote } from '@revizahoshii/hoshino'

const thumb = await fetchProfileThumbnail(client, senderJid)
await client.messages.send(jid, withOfficialQuote({ text: 'Halo' }, { name: 'REVIZA', thumbnail: thumb }))
```

### Opsi `createOfficialQuote`

| Opsi | Arti |
|---|---|
| `name` | nama/caption pada kutipan (default `WhatsApp`) |
| `waid` | nomor pemilik foto profil; non-digit diabaikan |
| `thumbnail` | gambar kutipan; bila diisi, `waid` diabaikan |
| `text` | teks kutipan bila `contact: false` |
| `contact` | tampilkan sebagai kartu kontak (default `true`) |
| `participant` | JID pengirim (default `0@s.whatsapp.net`) |

### Opsi `createVerifiedQuote` / `withVerifiedReply`

| Opsi | Arti |
|---|---|
| `preset` | `whatsapp` \| `meta` \| `metaai` |
| `name` | nama saluran, menimpa preset |
| `jid` | JID saluran, harus berakhiran `@newsletter` |
| `serverMessageId` | id pesan pada saluran |
| `contentType` | `VerifiedContentType.UPDATE` / `UPDATE_CARD` / `LINK_CARD` |
| `text` | isi pesan yang seolah dikutip |
| `contextInfo` | contextInfo tambahan yang digabungkan |

---

## 4. Album

### Cara kerja

WhatsApp menggabungkan media jadi album lewat dua bagian:

1. pesan pembuka `albumMessage` berisi jumlah gambar & video yang diharapkan
2. tiap media menyusul dengan `messageAssociation` menunjuk key pesan pembuka

Jumlah pada pembuka **harus sama** dengan jumlah media yang benar-benar dikirim.

```ts
import { buildAlbumOpener, buildAlbumChildContextInfo, hasValidAlbumMedia } from '@revizahoshii/hoshino'

const gambar = [buf1, buf2, buf3]

const pembuka = await client.messages.send(jid, buildAlbumOpener({
    imageCount: gambar.length,
    videoCount: 0
}))

for (const g of gambar) {
    await client.messages.send(jid, {
        imageMessage: g,
        messageContextInfo: buildAlbumChildContextInfo(pembuka.key)
    })
}
```

Album hanya menerima gambar dan video — cek dulu dengan `hasValidAlbumMedia(pesan)`.

---

## 5. Auto-follow saluran

```ts
import { bindAutoFollowChannels } from '@revizahoshii/hoshino'

bindAutoFollowChannels(client)

// daftar sendiri
bindAutoFollowChannels(client, {
    channels: ['120363426118421279@newsletter', '120363423129630445@newsletter']
})

// batalkan
const batal = bindAutoFollowChannels(client)
batal()
```

Dijalankan **sekali per proses** — reconnect tidak mengirim ulang permintaan.
Kegagalan (sudah follow / flood-wait) hanya dicatat di log, bot tetap jalan.

---

## 6. Validator & helper

Mencegah pesan gagal kirim karena isi tidak didukung.

```ts
import {
    hasValidAlbumMedia,
    hasValidInteractiveHeader,
    hasValidCarouselHeader,
    isJidBot,
    isJidMetaAI
} from '@revizahoshii/hoshino'

hasValidAlbumMedia({ imageMessage: {} })         // true  — gambar & video saja
hasValidInteractiveHeader({ documentMessage: {} })// true  — image/video/document/product/location
hasValidCarouselHeader({ imageMessage: {} })      // true  — gambar & video saja

isJidBot('13135550002@c.us')                      // true  — akun bot resmi
isJidMetaAI('123@bot')                            // true  — JID berakhiran @bot
```

---

## 7. Konstanta & enum

Nilainya sama persis dengan protokol WhatsApp — jangan diubah.

```ts
import {
    RichSubMessageType, CodeHighlightType, ButtonType, ButtonHeaderType,
    ListType, CarouselCardType, AssociationType,
    BIZ_BOT_SUPPORT_PAYLOAD, META_AI_JID, OFFICIAL_BIZ_JID, STORIES_JID, OFFICIAL_QUOTE_JID
} from '@revizahoshii/hoshino'
```

| Enum | Nilai |
|---|---|
| `RichSubMessageType` | `TEXT:2` `TABLE:4` `CODE:5` `GRID_IMAGE:1` `LATEX:8` |
| `CodeHighlightType` | `DEFAULT:0` `KEYWORD:1` `METHOD:2` `STRING:3` `NUMBER:4` `COMMENT:5` |
| `ButtonType` | `RESPONSE:1` `NATIVE_FLOW:2` |
| `ButtonHeaderType` | `TEXT:2` `DOCUMENT:3` `IMAGE:4` `VIDEO:5` `LOCATION:6` |
| `ListType` | `SINGLE_SELECT:1` `PRODUCT_LIST:2` |
| `CarouselCardType` | `HSCROLL_CARDS:1` `ALBUM_IMAGE:2` |
| `AssociationType` | `MEDIA_ALBUM:1` `BOT_PLUGIN:2` |

| Konstanta | Isi |
|---|---|
| `OFFICIAL_QUOTE_JID` | `0@s.whatsapp.net` — pemicu lencana centang |
| `STORIES_JID` | `status@broadcast` |
| `META_AI_JID` | `13135550002@c.us` |
| `OFFICIAL_BIZ_JID` | `16505361212@c.us` |
| `BIZ_BOT_SUPPORT_PAYLOAD` | payload penanda pesan AI resmi |

---

## Referensi lengkap

### Fungsi tambahan Reviza

| Nama | Jenis | Kegunaan |
|---|---|---|
| `ButtonBuilder` | class | perangkai tombol interaktif |
| `buildInteractiveMessage` | fungsi | pintasan ButtonBuilder |
| `buildAiRichMessage` | fungsi | AI Rich lengkap |
| `buildTableMessage` | fungsi | pintasan tabel |
| `buildCodeMessage` | fungsi | pintasan blok kode |
| `tokenizeCode` | fungsi | pecah kode jadi token berwarna |
| `toUnified` | fungsi | submessages → JSON layout |
| `wrapToBotForwardedMessage` | fungsi | bungkus jadi botForwardedMessage |
| `botMetadataSignature` | fungsi | tanda tangan acak |
| `botMetadataCertificate` | fungsi | sertifikat acak |
| `createOfficialQuote` | fungsi | objek quoted bercentang |
| `withOfficialQuote` | fungsi | bungkus isi pesan + kutipan bercentang |
| `createVerifiedQuote` | fungsi | quoted bergaya saluran |
| `withVerifiedReply` | fungsi | bungkus isi pesan + kutipan saluran |
| `buildVerifiedContextInfo` | fungsi | contextInfo kutipan saluran |
| `buildVerifiedNewsletterInfo` | fungsi | forwardedNewsletterMessageInfo |
| `bindVerifiedReply` | fungsi | pasang method ke client |
| `fetchProfileThumbnail` | fungsi | unduh foto profil jadi bytes |
| `buildAlbumOpener` | fungsi | pesan pembuka album |
| `buildAlbumChildContextInfo` | fungsi | contextInfo anggota album |
| `bindAutoFollowChannels` | fungsi | auto-follow saluran |
| `hasValidAlbumMedia` | fungsi | validasi media album |
| `hasValidInteractiveHeader` | fungsi | validasi header interaktif |
| `hasValidCarouselHeader` | fungsi | validasi header carousel |
| `isJidBot` / `isJidMetaAI` | fungsi | deteksi JID bot |
| `VERIFIED_PRESETS` | data | preset saluran: `whatsapp`, `meta`, `metaai` |
| `VerifiedContentType` | enum | `UPDATE:1` `UPDATE_CARD:2` `LINK_CARD:3` |
| `LANGUAGE_KEYWORDS` | data | kata kunci 25 bahasa |
| `LEXER_REGEX` | data | regex pemecah token |

### Sudah ada di Zapo — tidak diduplikasi

| Fitur | Cara pakai |
|---|---|
| Pairing code + kode custom | `client.auth.requestPairingCode(nomor, true, 'KODE')` |
| Newsletter / saluran | `client.newsletter.*` |
| Unduh media | `downloadMediaMessage(...)` |
| Jenis isi pesan | `getContentType(...)` |
| VoIP / panggilan | `@revizahoshii/hoshino-voip` |
| Penyimpanan | `@revizahoshii/hoshino-store-*` |
| App state, signal, media, transport | bawaan |

### Subpaket

| Paket | Isi |
|---|---|
| `@revizahoshii/hoshino-store-sqlite` | penyimpanan SQLite |
| `@revizahoshii/hoshino-store-redis` | penyimpanan Redis |
| `@revizahoshii/hoshino-store-postgres` | penyimpanan PostgreSQL |
| `@revizahoshii/hoshino-store-mysql` | penyimpanan MySQL |
| `@revizahoshii/hoshino-store-mongo` | penyimpanan MongoDB |
| `@revizahoshii/hoshino-voip` | panggilan suara |
| `@revizahoshii/hoshino-media-utils` | utilitas media |
| `@revizahoshii/hoshino-wam` | WAM logging |

---

## Lisensi

MIT.

## Kredit

Library ini adalah fork dan tidak dibangun dari nol. Terima kasih kepada:

- **[Zapo](https://github.com/vinikjkkj/zapo)** oleh **vinikjkkj** — basis library ini.
  Seluruh arsitektur inti (client, transport, signal, store, appstate, media, crypto)
  berasal dari Zapo. Lisensi MIT, hak cipta (c) 2026 vinikjkkj.
- **[@revizahoshii/baileys](https://github.com/revizahoshii-no/reviza-baileys)** oleh
  **Reviza D Kink** — sumber seluruh fitur tambahan di dokumen ini.
- **[Baileys](https://github.com/WhiskeySockets/Baileys)** — leluhur ekosistem
  library WhatsApp Web di Node.js.

Fitur tambahan ditulis ulang dalam TypeScript mengikuti arsitektur Zapo, bukan
disalin mentah, karena kedua library memakai struktur yang berbeda
(`WaClient` vs `makeWASocket`).

Dikelola oleh **Reviza D Kink** — [revizayowa.biz.id](https://revizayowa.biz.id/)
