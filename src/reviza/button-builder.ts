/**
 * Builder tombol interaktif — ButtonV2 & native flow.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink) ke arsitektur Hoshino.
 *
 * Zapo sudah mendukung interactiveMessage di lapisan protokol, tetapi belum
 * menyediakan builder siap pakai. Modul ini mengisi bagian itu: rangkai tombol
 * dengan API berantai, hasilnya objek pesan biasa yang bisa langsung dikirim.
 */

import type { Proto } from '@proto'

export interface QuickReplyButton {
    displayText: string
    id: string
}

export interface UrlButton {
    displayText: string
    url: string
    merchantUrl?: string
}

export interface CopyButton {
    displayText: string
    copyCode: string
}

export interface CallButton {
    displayText: string
    phoneNumber: string
}

export interface ListRow {
    header?: string
    title: string
    description?: string
    id: string
}

export interface ListSection {
    title: string
    highlightLabel?: string
    rows: ListRow[]
}

type NativeFlowButton = { name: string; buttonParamsJson: string }

/**
 * Perangkai pesan interaktif.
 *
 * ```ts
 * const msg = new ButtonBuilder()
 *     .setTitle('AI HOSHINO')
 *     .setBody('Pilih menu di bawah')
 *     .setFooter('Powered By Reviza D Kink')
 *     .addQuickReply('Menu', '.menu')
 *     .addUrl('Website', 'https://revizayowa.biz.id/')
 *     .build()
 *
 * await client.messages.send(jid, msg)
 * ```
 */
export class ButtonBuilder {
    private title = ''
    private subtitle = ''
    private body = ''
    private footer = ''
    private buttons: NativeFlowButton[] = []
    private contextInfo: Proto.IContextInfo = {}
    private header: Proto.Message.InteractiveMessage.IHeader | undefined

    setTitle(value: string): this {
        this.title = String(value ?? '')
        return this
    }

    setSubtitle(value: string): this {
        this.subtitle = String(value ?? '')
        return this
    }

    setBody(value: string): this {
        this.body = String(value ?? '')
        return this
    }

    setFooter(value: string): this {
        this.footer = String(value ?? '')
        return this
    }

    /** Pasang header media (hasil upload) atau teks. */
    setHeader(header: Proto.Message.InteractiveMessage.IHeader): this {
        this.header = header
        return this
    }

    setContextInfo(value: Proto.IContextInfo): this {
        this.contextInfo = { ...this.contextInfo, ...value }
        return this
    }

    /** Tombol balasan cepat: menekan tombol mengirim `id` sebagai pesan. */
    addQuickReply(displayText: string, id: string): this {
        this.buttons.push({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: displayText, id })
        })
        return this
    }

    /** Tombol yang membuka URL. */
    addUrl(displayText: string, url: string, merchantUrl?: string): this {
        this.buttons.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: displayText,
                url,
                merchant_url: merchantUrl ?? url
            })
        })
        return this
    }

    /** Tombol salin teks ke papan klip. */
    addCopy(displayText: string, copyCode: string): this {
        this.buttons.push({
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({ display_text: displayText, copy_code: copyCode })
        })
        return this
    }

    /** Tombol panggilan telepon. */
    addCall(displayText: string, phoneNumber: string): this {
        this.buttons.push({
            name: 'cta_call',
            buttonParamsJson: JSON.stringify({ display_text: displayText, phone_number: phoneNumber })
        })
        return this
    }

    /** Daftar pilihan (single select). */
    addList(title: string, sections: ListSection[]): this {
        this.buttons.push({
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
                title,
                sections: sections.map((section) => ({
                    title: section.title,
                    highlight_label: section.highlightLabel ?? '',
                    rows: section.rows.map((row) => ({
                        header: row.header ?? '',
                        title: row.title,
                        description: row.description ?? '',
                        id: row.id
                    }))
                }))
            })
        })
        return this
    }

    /** Tombol mentah bila butuh native flow yang belum dibungkus method di atas. */
    addRaw(name: string, params: Record<string, unknown>): this {
        this.buttons.push({ name, buttonParamsJson: JSON.stringify(params) })
        return this
    }

    /** Hasilkan objek pesan siap kirim. */
    build(): Proto.IMessage {
        if (this.buttons.length < 1) {
            throw new Error('butuh minimal satu tombol')
        }

        const interactiveMessage: Proto.Message.IInteractiveMessage = {
            body: { text: this.body },
            footer: { text: this.footer },
            header: this.header ?? {
                title: this.title,
                subtitle: this.subtitle,
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: this.buttons,
                messageParamsJson: ''
            },
            contextInfo: this.contextInfo
        }

        return { interactiveMessage } as Proto.IMessage
    }
}

/** Pintasan fungsional bila tidak ingin memakai class. */
export const buildInteractiveMessage = (
    configure: (builder: ButtonBuilder) => ButtonBuilder
): Proto.IMessage => configure(new ButtonBuilder()).build()
