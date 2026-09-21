/**
 * Album message — kirim beberapa gambar/video sebagai satu album.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink) ke arsitektur Hoshino.
 * WhatsApp menggabungkan media menjadi album lewat dua bagian:
 *   1. pesan pembuka `albumMessage` berisi jumlah gambar & video yang diharapkan
 *   2. tiap media dikirim menyusul dengan `messageAssociation` menunjuk pesan pembuka
 */

import { randomBytes } from 'node:crypto'

import type { Proto } from '@proto'

/** Jenis asosiasi pesan: 1 = anggota album. */
export const MESSAGE_ASSOCIATION_ALBUM = 1

export interface AlbumOpenerInput {
    /** jumlah gambar yang akan menyusul */
    imageCount: number
    /** jumlah video yang akan menyusul */
    videoCount?: number
    /** messageSecret custom, default 32 byte acak */
    messageSecret?: Uint8Array
}

/**
 * Bangun isi pesan pembuka album.
 *
 * Kirim hasilnya lebih dulu, lalu kirim tiap media memakai
 * {@link buildAlbumChildContextInfo} yang menunjuk key pesan pembuka ini.
 */
export const buildAlbumOpener = (input: AlbumOpenerInput): Proto.IMessage => {
    const { imageCount, videoCount = 0, messageSecret } = input

    if (!Number.isInteger(imageCount) || imageCount < 0) {
        throw new TypeError('imageCount harus bilangan bulat >= 0')
    }
    if (!Number.isInteger(videoCount) || videoCount < 0) {
        throw new TypeError('videoCount harus bilangan bulat >= 0')
    }
    if (imageCount + videoCount < 1) {
        throw new TypeError('album butuh minimal satu media')
    }

    return {
        messageContextInfo: {
            messageSecret: messageSecret ?? new Uint8Array(randomBytes(32))
        },
        albumMessage: {
            expectedImageCount: imageCount,
            expectedVideoCount: videoCount
        }
    } as Proto.IMessage
}

/**
 * Bangun messageContextInfo untuk tiap media anggota album.
 *
 * @param parentMessageKey key pesan pembuka album
 * @param messageSecret messageSecret custom, default 32 byte acak
 */
export const buildAlbumChildContextInfo = (
    parentMessageKey: Proto.IMessageKey,
    messageSecret?: Uint8Array
): Proto.IMessageContextInfo => {
    if (!parentMessageKey?.id) {
        throw new TypeError('parentMessageKey harus berisi key pesan pembuka album')
    }

    return {
        messageSecret: messageSecret ?? new Uint8Array(randomBytes(32)),
        messageAssociation: {
            associationType: MESSAGE_ASSOCIATION_ALBUM,
            parentMessageKey
        }
    } as Proto.IMessageContextInfo
}
