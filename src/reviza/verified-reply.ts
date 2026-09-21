/**
 * Verified reply — kutipan bercentang biru.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink) ke arsitektur Hoshino.
 * Dibangun di atas protokol WhatsApp: contextInfo.forwardedNewsletterMessageInfo
 * dan kartu kontak berisi baris TEL;waid=.
 *
 * Lencana centang dan avatar berasal dari dua mekanisme terpisah:
 *   - lencana centang -> key.participant = '0@s.whatsapp.net'
 *   - avatar bulat    -> baris item1.TEL;waid=<nomor> di dalam vCard
 */

import { randomBytes } from 'node:crypto'

import type { Proto } from '@proto'
import { STORIES_JID } from '@reviza/constants'

/** Tipe konten yang ditampilkan pada label kutipan saluran. */
export const VerifiedContentType = {
    UPDATE: 1,
    UPDATE_CARD: 2,
    LINK_CARD: 3
} as const

export type VerifiedContentTypeValue = (typeof VerifiedContentType)[keyof typeof VerifiedContentType]

/** Preset identitas terverifikasi bawaan. */
export const VERIFIED_PRESETS: Record<string, { name: string; jid: string }> = {
    whatsapp: { name: 'WhatsApp', jid: '120363024512399490@newsletter' },
    meta: { name: 'Meta AI', jid: '120363286858032117@newsletter' },
    metaai: { name: 'Meta AI', jid: '120363286858032117@newsletter' }
}

/**
 * JID sistem WhatsApp. Klien menggambar lencana terverifikasi untuk JID ini
 * dari daftar bawaan aplikasi, bukan dari pengecekan sertifikat ke server.
 */
export const OFFICIAL_QUOTE_JID = '0@s.whatsapp.net'


const randomServerMessageId = (): number => Math.floor(Math.random() * 1_000_000) + 1

const randomStanzaId = (): string => randomBytes(16).toString('hex').toUpperCase()

export interface VerifiedNewsletterOptions {
    /** nama preset bawaan: whatsapp | meta | metaai */
    preset?: string
    /** nama yang tampil, menimpa preset */
    name?: string
    /** JID saluran, menimpa preset */
    jid?: string
    /** id pesan pada saluran */
    serverMessageId?: number
    /** lihat VerifiedContentType */
    contentType?: VerifiedContentTypeValue
}

/** Susun objek forwardedNewsletterMessageInfo. */
export const buildVerifiedNewsletterInfo = (options: VerifiedNewsletterOptions = {}) => {
    const { preset = 'whatsapp', name, jid, serverMessageId, contentType = VerifiedContentType.UPDATE } = options

    const base = VERIFIED_PRESETS[String(preset).toLowerCase()] ?? VERIFIED_PRESETS.whatsapp!
    const resolvedJid = jid ?? base.jid
    const resolvedName = name ?? base.name

    if (typeof resolvedJid !== 'string' || !resolvedJid.endsWith('@newsletter')) {
        throw new TypeError('jid saluran harus string dan berakhiran @newsletter')
    }

    return {
        newsletterJid: resolvedJid,
        newsletterName: resolvedName,
        serverMessageId: serverMessageId ?? randomServerMessageId(),
        contentType
    }
}

export interface VerifiedContextOptions extends VerifiedNewsletterOptions {
    /** isi pesan yang seolah dikutip */
    text?: string
    /** pengirim kutipan */
    participant?: string
    /** pesan kutipan custom, menimpa text */
    quotedMessage?: Proto.IMessage
    stanzaId?: string
    /** contextInfo tambahan yang digabungkan */
    contextInfo?: Proto.IContextInfo
}

/** Bangun contextInfo lengkap berisi kutipan bercentang biru. */
export const buildVerifiedContextInfo = (options: VerifiedContextOptions = {}): Proto.IContextInfo => {
    const {
        text = '',
        participant = OFFICIAL_QUOTE_JID,
        quotedMessage,
        stanzaId,
        contextInfo = {},
        ...rest
    } = options

    const info = buildVerifiedNewsletterInfo(rest)

    return {
        ...contextInfo,
        stanzaId: stanzaId ?? randomStanzaId(),
        participant,
        remoteJid: info.newsletterJid,
        quotedMessage: quotedMessage ?? { conversation: text || info.newsletterName },
        forwardedNewsletterMessageInfo: info,
        isForwarded: contextInfo.isForwarded ?? false
    }
}

/** Bungkus isi pesan agar dikirim dengan kutipan bercentang biru. */
export const withVerifiedReply = <T extends Record<string, unknown>>(
    content: T,
    options: VerifiedContextOptions = {}
): T & { contextInfo: Proto.IContextInfo } => {
    if (!content || typeof content !== 'object') {
        throw new TypeError('content harus berupa object isi pesan')
    }

    return {
        ...content,
        contextInfo: buildVerifiedContextInfo({
            ...options,
            contextInfo: {
                ...((content as { contextInfo?: Proto.IContextInfo }).contextInfo ?? {}),
                ...(options.contextInfo ?? {})
            }
        })
    }
}

export interface OfficialQuoteOptions {
    /** nama/caption yang tampil pada kutipan */
    name?: string
    /** nomor pemilik foto profil untuk avatar kutipan (non-digit diabaikan) */
    waid?: string
    /** gambar kutipan, memakai imageMessage */
    thumbnail?: Uint8Array
    /** teks kutipan bila tanpa gambar dan tanpa kontak */
    text?: string
    /** tampilkan sebagai kartu kontak (default true) */
    contact?: boolean
    /** JID pengirim kutipan */
    participant?: string
    /** contextInfo tambahan */
    contextInfo?: Proto.IContextInfo
}

/**
 * Buat objek quoted bercentang biru bergaya Status akun resmi.
 *
 * Avatar bulat diambil WhatsApp dari foto profil nomor pada baris TEL;waid=
 * di dalam vCard, bukan dari participant.
 */
export const createOfficialQuote = (options: OfficialQuoteOptions = {}) => {
    const { name = 'WhatsApp', waid, thumbnail, text = '', contact = true, participant = OFFICIAL_QUOTE_JID } = options

    let quotedMessage: Proto.IMessage

    if (thumbnail) {
        quotedMessage = {
            imageMessage: {
                mimetype: 'image/jpeg',
                caption: name,
                jpegThumbnail: thumbnail,
                fileLength: thumbnail.length,
                height: 640,
                width: 640
            }
        }
    } else if (contact) {
        const nomor = String(waid ?? '').replace(/[^0-9]/g, '')
        const tel = nomor ? `\nitem1.TEL;waid=${nomor}:+${nomor}\nitem1.X-ABLabel:Mobile` : ''
        quotedMessage = {
            contactMessage: {
                displayName: name,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${name};;;\nFN:${name}${tel}\nEND:VCARD`
            }
        }
    } else {
        quotedMessage = { conversation: text || name }
    }

    return {
        key: {
            fromMe: false,
            id: randomStanzaId(),
            remoteJid: STORIES_JID,
            participant
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'WhatsApp',
        broadcast: true,
        status: 2,
        verifiedBizName: 'WhatsApp',
        message: quotedMessage
    }
}

/**
 * Bungkus isi pesan agar dibalas dengan kutipan bercentang biru resmi,
 * sekaligus mempertahankan tombol saluran dan externalAdReply yang sudah ada.
 */
export const withOfficialQuote = <T extends Record<string, unknown>>(
    content: T,
    options: OfficialQuoteOptions = {}
): T & { contextInfo: Proto.IContextInfo } => {
    if (!content || typeof content !== 'object') {
        throw new TypeError('content harus berupa object isi pesan')
    }

    const quote = createOfficialQuote(options)

    return {
        ...content,
        contextInfo: {
            ...((content as { contextInfo?: Proto.IContextInfo }).contextInfo ?? {}),
            ...(options.contextInfo ?? {}),
            stanzaId: quote.key.id,
            participant: quote.key.participant,
            remoteJid: quote.key.remoteJid,
            quotedMessage: quote.message
        }
    }
}

/**
 * Buat objek `quoted` bergaya saluran terverifikasi.
 *
 * Berbeda dari {@link createOfficialQuote} yang meniru Status akun resmi,
 * fungsi ini meniru kutipan dari sebuah saluran (newsletter) bercentang.
 *
 * ```ts
 * const quoted = createVerifiedQuote({ preset: 'meta' })
 * await client.messages.send(jid, { conversation: 'Halo' }, { quoted })
 * ```
 */
export const createVerifiedQuote = (options: VerifiedContextOptions = {}) => {
    const { text = '', participant = OFFICIAL_QUOTE_JID, quotedMessage, ...rest } = options
    const info = buildVerifiedNewsletterInfo(rest)

    return {
        key: {
            fromMe: false,
            id: randomStanzaId(),
            remoteJid: info.newsletterJid,
            participant
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: info.newsletterName,
        message: quotedMessage ?? { conversation: text || info.newsletterName },
        verifiedBizName: info.newsletterName
    }
}

/**
 * Ambil foto profil sebuah JID sebagai bytes, untuk dipakai jadi thumbnail kutipan.
 * Mengembalikan null bila tidak punya foto profil atau gagal diunduh.
 */
export const fetchProfileThumbnail = async (
    client: { profilePictureUrl?: (jid: string, type?: string) => Promise<string | undefined> },
    jid: string,
    timeoutMs = 7000
): Promise<Uint8Array | null> => {
    try {
        const url = await client.profilePictureUrl?.(jid, 'image')
        if (!url) return null

        const ac = new AbortController()
        const timer = setTimeout(() => ac.abort(), timeoutMs)
        try {
            const res = await fetch(url, { signal: ac.signal })
            if (!res.ok) return null
            return new Uint8Array(await res.arrayBuffer())
        } finally {
            clearTimeout(timer)
        }
    } catch {
        return null
    }
}

export interface VerifiedReplyTarget {
    sendMessage?: (jid: string, content: unknown, options?: unknown) => Promise<unknown>
    sendVerifiedReply?: unknown
    sendOfficialReply?: unknown
}

/**
 * Pasang helper `sendVerifiedReply` dan `sendOfficialReply` pada client.
 *
 * Setelah dipanggil sekali, kedua method bisa dipakai langsung:
 *
 * ```ts
 * bindVerifiedReply(client)
 * await client.sendOfficialReply(jid, { text: 'Halo' }, { name: 'REVIZA', waid: '6283134978318' })
 * ```
 *
 * Aman dipanggil berulang: bila sudah terpasang, fungsi langsung keluar.
 */
export const bindVerifiedReply = <T extends VerifiedReplyTarget>(client: T): T => {
    if (!client || typeof client.sendMessage !== 'function' || client.sendVerifiedReply) {
        return client
    }

    Object.assign(client, {
        sendVerifiedReply: async (
            jid: string,
            content: Record<string, unknown>,
            options: VerifiedContextOptions = {},
            sendOptions: unknown = {}
        ) => client.sendMessage!(jid, withVerifiedReply(content, options), sendOptions),

        sendOfficialReply: async (
            jid: string,
            content: Record<string, unknown>,
            options: OfficialQuoteOptions = {},
            sendOptions: unknown = {}
        ) => client.sendMessage!(jid, withOfficialQuote(content, options), sendOptions)
    })

    return client
}
