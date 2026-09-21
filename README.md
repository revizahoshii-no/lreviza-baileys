# @revizahoshii/hoshino

Library WhatsApp Web berbasis TypeScript — fork dari [Zapo](https://github.com/vinikjkkj/zapo)
dengan tambahan fitur dari [@revizahoshii/baileys](https://github.com/revizahoshii-no/reviza-baileys).

Tujuan fork ini: mempertahankan performa dan kestabilan Zapo, sambil menambah
fitur praktis yang sebelumnya hanya ada di reviza-baileys — tombol interaktif,
AI Rich, album, kutipan bercentang biru, dan auto-follow saluran.

```bash
npm install @revizahoshii/hoshino
```

Butuh Node.js >= 22.

---

## Mulai cepat

```ts
import { WaClient, createStore, createPinoLogger } from '@revizahoshii/hoshino'

const client = new WaClient({
    store: createStore(),
    logger: createPinoLogger({ level: 'info' })
})

client.on('auth_qr', ({ qr }) => console.log(qr))
client.on('message', async (msg) => {
    console.log('pesan masuk:', msg)
})

await client.connect()
```

### Pairing code (tanpa QR)

```ts
client.once('auth_pairing_required', async () => {
    // parameter ketiga = kode custom 8 karakter, opsional
    const code = await client.auth.requestPairingCode('6283134978318', true, 'REVIZA01')
    console.log('masukkan kode ini di HP:', code)
})

await client.connect()
```

---

## Fitur tambahan Reviza

Semua fungsi di bawah diekspor langsung dari paket utama.

### 1. Tombol interaktif — `ButtonBuilder`

Zapo mendukung `interactiveMessage` di lapisan protokol tetapi tidak menyediakan
builder. `ButtonBuilder` mengisi bagian itu dengan API berantai.

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

Daftar pilihan:

```ts
const pesan = new ButtonBuilder()
    .setBody('Pilih kategori')
    .addList('Buka Daftar', [
        {
            title: 'Kategori',
            rows: [
                { title: 'Sticker', description: 'Menu sticker', id: '.stickermenu' },
                { title: 'Downloader', description: 'Menu unduh', id: '.dlmenu' }
            ]
        }
    ])
    .build()
```

| Method | Kegunaan |
|---|---|
| `setTitle` / `setSubtitle` / `setBody` / `setFooter` | teks kartu |
| `setHeader(header)` | header media hasil upload |
| `setContextInfo(ctx)` | mention, saluran, externalAdReply |
| `addQuickReply(teks, id)` | tombol balasan cepat |
| `addUrl(teks, url, merchantUrl?)` | tombol buka tautan |
| `addCopy(teks, kode)` | tombol salin |
| `addCall(teks, nomor)` | tombol telepon |
| `addList(judul, sections)` | daftar pilihan |
| `addRaw(name, params)` | native flow mentah |
| `build()` | hasilkan objek pesan |

### 2. AI Rich — tabel & blok kode

```ts
import { buildAiRichMessage, buildTableMessage, buildCodeMessage } from '@revizahoshii/hoshino'

// tabel
await client.messages.send(jid, buildTableMessage(
    {
        title: 'Status Sistem',
        rows: [
            ['Komponen', 'Nilai'],
            ['Library', '@revizahoshii/hoshino'],
            ['Uptime', '3 jam 12 menit']
        ]
    },
    { headerText: 'AI HOSHINO', footerText: 'Powered By Reviza D Kink' }
))

// blok kode
await client.messages.send(jid, buildCodeMessage({
    language: 'javascript',
    code: "const halo = (nama) => `Halo ${nama}`"
}))

// gabungan
await client.messages.send(jid, buildAiRichMessage({
    headerText: 'Laporan',
    contentText: 'Ringkasan hari ini.',
    table: { rows: [['Metrik', 'Nilai'], ['Pesan', '1.204']] },
    code: { language: 'bash', code: 'pm2 restart bot' },
    footerText: 'Selesai',
    disclaimerText: 'AI HOSHINO'
}))
```

Catatan hasil pengujian lapangan:

- `messageSecret` selalu disertakan — dipakai WhatsApp untuk integritas pesan bot.
- `verificationMetadata` berisi sertifikat acak **tidak** dikirim, karena justru
  membuat WhatsApp menahan konten. Aktifkan hanya bila perlu lewat
  `fakeVerification: true`.

### 3. Kutipan bercentang biru

Dua mekanisme terpisah:

| Bagian | Sumber |
|---|---|
| Lencana centang | `key.participant = '0@s.whatsapp.net'` |
| Avatar bulat | baris `item1.TEL;waid=<nomor>` di dalam vCard |

```ts
import { withOfficialQuote, createOfficialQuote } from '@revizahoshii/hoshino'

// avatar mengikuti foto profil nomor pada waid
await client.messages.send(jid, withOfficialQuote(
    { text: 'Halo, ini balasan resmi' },
    { name: 'REVIZA DELUXE', waid: '6283134978318' }
))

// atau buat objek quoted terpisah
const quoted = createOfficialQuote({ name: 'WhatsApp', waid: '6283134978318' })
```

Kutipan bergaya saluran terverifikasi:

```ts
import { withVerifiedReply } from '@revizahoshii/hoshino'

await client.messages.send(jid, withVerifiedReply(
    { text: 'Halo!' },
    { preset: 'meta', text: 'Meta AI' }   // preset: whatsapp | meta | metaai
))
```

| Opsi `createOfficialQuote` | Arti |
|---|---|
| `name` | nama/caption pada kutipan |
| `waid` | nomor pemilik foto profil (non-digit diabaikan) |
| `thumbnail` | gambar kutipan, memakai `imageMessage` |
| `contact` | tampilkan sebagai kartu kontak (default `true`) |
| `participant` | JID pengirim (default `0@s.whatsapp.net`) |

### 4. Album

```ts
import { buildAlbumOpener, buildAlbumChildContextInfo } from '@revizahoshii/hoshino'

const pembuka = await client.messages.send(jid, buildAlbumOpener({ imageCount: 3 }))

for (const gambar of daftarGambar) {
    await client.messages.send(jid, {
        imageMessage: gambar,
        messageContextInfo: buildAlbumChildContextInfo(pembuka.key)
    })
}
```

### 5. Auto-follow saluran

```ts
import { bindAutoFollowChannels } from '@revizahoshii/hoshino'

bindAutoFollowChannels(client)

// atau dengan daftar sendiri
bindAutoFollowChannels(client, {
    channels: ['120363426118421279@newsletter']
})
```

Hanya dijalankan sekali per proses; reconnect tidak mengirim ulang permintaan.

---

## Yang sudah ada di Zapo

Fitur berikut tidak diport karena Zapo sudah memilikinya:

| Fitur | Cara pakai |
|---|---|
| Pairing code + kode custom | `client.auth.requestPairingCode(nomor, true, 'KODE')` |
| Newsletter / saluran | `client.newsletter.*` |
| VoIP / panggilan | `@revizahoshii/hoshino-voip` |
| Store: SQLite, Redis, Postgres, MySQL, Mongo | `@revizahoshii/hoshino-store-*` |
| App state, signal, media | bawaan |

## Subpaket

| Paket | Isi |
|---|---|
| `@revizahoshii/hoshino-store-sqlite` | penyimpanan SQLite |
| `@revizahoshii/hoshino-store-redis` | penyimpanan Redis |
| `@revizahoshii/hoshino-store-postgres` | penyimpanan PostgreSQL |
| `@revizahoshii/hoshino-store-mysql` | penyimpanan MySQL |
| `@revizahoshii/hoshino-store-mongo` | penyimpanan MongoDB |
| `@revizahoshii/hoshino-voip` | panggilan suara |
| `@revizahoshii/hoshino-media-utils` | utilitas media |
| `@revizahoshii/hoshino-native` | backend kripto native/WASM |
| `@revizahoshii/hoshino-wam` | WAM logging |

---

## Lisensi

MIT.

## Kredit

Library ini adalah fork dan tidak dibangun dari nol. Terima kasih kepada:

- **[Zapo](https://github.com/vinikjkkj/zapo)** oleh **vinikjkkj** — basis library ini.
  Seluruh arsitektur inti (client, transport, signal, store, appstate, media)
  berasal dari Zapo. Lisensi MIT, hak cipta (c) 2026 vinikjkkj.
- **[@revizahoshii/baileys](https://github.com/revizahoshii-no/reviza-baileys)** oleh
  **Reviza D Kink** — sumber fitur tambahan yang diport ke sini.
- **[Baileys](https://github.com/WhiskeySockets/Baileys)** — leluhur ekosistem
  library WhatsApp Web di Node.js.

Fitur tambahan ditulis ulang dalam TypeScript mengikuti arsitektur Zapo, bukan
disalin mentah, karena kedua library memakai struktur yang berbeda.

Dikelola oleh **Reviza D Kink** — [revizayowa.biz.id](https://revizayowa.biz.id/)
