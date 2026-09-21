/**
 * Auto-follow saluran (newsletter) saat koneksi terbuka.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink) ke arsitektur Hoshino.
 * Hanya dijalankan sekali per proses: reconnect tidak mengirim ulang permintaan.
 */

/** Saluran WhatsApp bawaan yang ikut diikuti. Ganti lewat opsi bila perlu. */
export const DEFAULT_AUTO_FOLLOW_CHANNELS = [
    '120363426118421279@newsletter',
    '120363423129630445@newsletter'
] as const

export interface AutoFollowTarget {
    on?: (event: string, listener: (...args: unknown[]) => void) => unknown
    once?: (event: string, listener: (...args: unknown[]) => void) => unknown
    newsletterFollow?: (jid: string) => Promise<unknown> | unknown
    logger?: { info?: (obj: unknown, msg?: string) => void }
}

export interface AutoFollowOptions {
    /** daftar JID saluran; default DEFAULT_AUTO_FOLLOW_CHANNELS */
    channels?: readonly string[]
    /** nama event koneksi terbuka pada client */
    event?: string
}

/**
 * Pasang auto-follow saluran pada sebuah client.
 *
 * Aman dipanggil pada client yang belum punya `newsletterFollow`:
 * fungsi langsung keluar tanpa efek samping.
 *
 * @returns fungsi untuk membatalkan pemasangan
 */
export const bindAutoFollowChannels = (
    client: AutoFollowTarget,
    options: AutoFollowOptions = {}
): (() => void) => {
    const { channels = DEFAULT_AUTO_FOLLOW_CHANNELS, event = 'connection' } = options

    if (typeof client?.on !== 'function' || typeof client.newsletterFollow !== 'function') {
        return () => {}
    }

    let sudahDijalankan = false
    let dibatalkan = false

    const jalankan = () => {
        if (sudahDijalankan || dibatalkan) return
        sudahDijalankan = true

        for (const jid of channels) {
            Promise.resolve(client.newsletterFollow?.(jid))
                .then(() => {
                    client.logger?.info?.({ jid }, 'sukses follow saluran')
                })
                .catch((error: unknown) => {
                    // umumnya hanya "sudah follow" atau flood-wait; bot tetap jalan normal
                    const alasan =
                        (error as { message?: string })?.message ?? 'tidak diketahui'
                    client.logger?.info?.({ jid, alasan }, 'follow saluran dilewati')
                })
        }
    }

    client.on(event, (payload: unknown) => {
        const status = (payload as { connection?: string; state?: string } | undefined)
        if (!status || status.connection === 'open' || status.state === 'open' || payload === 'open') {
            jalankan()
        }
    })

    return () => {
        dibatalkan = true
    }
}
