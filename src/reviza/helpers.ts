/**
 * Helper JID dan validator isi pesan.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink) ke arsitektur Hoshino.
 */

import { META_AI_JID } from '@reviza/constants'

const BOT_REGEXP = /^1313555\d{4}$|^131655500\d{2}$/

/** Apakah JID milik bot AI (berakhiran @bot). */
export const isJidMetaAI = (jid?: string | null): boolean => !!jid?.endsWith('@bot')

/** Apakah JID milik akun bot resmi WhatsApp/Meta. */
export const isJidBot = (jid?: string | null): boolean =>
    !!jid && BOT_REGEXP.test(jid.split('@')[0]!) && jid.endsWith('@c.us')

/** Apakah JID adalah akun Meta AI utama. */
export const isMetaAiAccount = (jid?: string | null): boolean => jid === META_AI_JID

type MessageLike = Record<string, unknown>

/**
 * Cek apakah isi pesan layak jadi anggota album.
 * Album hanya menerima gambar dan video.
 */
export const hasValidAlbumMedia = (message: MessageLike): boolean =>
    !!(message?.imageMessage || message?.videoMessage)

/**
 * Cek apakah isi pesan layak jadi header interactiveMessage.
 * Mencegah pesan gagal kirim karena header tidak didukung.
 */
export const hasValidInteractiveHeader = (message: MessageLike): boolean =>
    !!(
        message?.imageMessage ||
        message?.videoMessage ||
        message?.documentMessage ||
        message?.productMessage ||
        message?.locationMessage
    )

/**
 * Cek apakah isi pesan layak jadi header kartu carousel.
 * Carousel hanya menerima gambar dan video.
 */
export const hasValidCarouselHeader = (message: MessageLike): boolean =>
    !!(message?.imageMessage || message?.videoMessage)
