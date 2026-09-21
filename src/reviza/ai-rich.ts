/**
 * AI Rich message — tabel, blok kode, dan teks kaya bergaya balasan AI.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink) ke arsitektur Hoshino.
 *
 * Catatan penting hasil pengujian lapangan:
 *   - `messageSecret` WAJIB ada, dipakai WhatsApp untuk integritas pesan bot.
 *   - `verificationMetadata` berisi sertifikat acak justru membuat WhatsApp
 *     menahan konten, maka TIDAK dikirim kecuali diminta lewat `fakeVerification`.
 *   - `unifiedResponse.data` harus berisi JSON layout; tanpa itu klien tidak
 *     punya bahan untuk merender tabel/kode.
 */

import { randomBytes, randomUUID } from 'node:crypto'

import type { Proto } from '@proto'

/** Jenis submessage pada AI Rich response. */
export const RichSubMessageType = {
    GRID_IMAGE: 1,
    TEXT: 2,
    CODE: 3,
    TABLE: 4,
    LATEX: 5,
    CONTENT_ITEMS: 6,
    INLINE_IMAGE: 7
} as const

const AI_RICH_RESPONSE_TYPE_STANDARD = 1

export interface RichTableInput {
    /** judul tabel */
    title?: string
    /** baris tabel; baris pertama dianggap heading kecuali noHeading = true */
    rows: string[][]
    /** jangan jadikan baris pertama sebagai heading */
    noHeading?: boolean
}

export interface RichCodeInput {
    /** bahasa pemrograman, default javascript */
    language?: string
    /** isi kode */
    code: string
}

export interface AiRichInput {
    /** teks pembuka */
    headerText?: string
    /** isi utama */
    contentText?: string
    /** tabel */
    table?: RichTableInput
    /** blok kode */
    code?: RichCodeInput
    /** teks penutup */
    footerText?: string
    /** teks disclaimer kecil di atas kartu */
    disclaimerText?: string
    /** kirim verificationMetadata acak (perilaku lama, umumnya TIDAK disarankan) */
    fakeVerification?: boolean
    /** messageSecret custom, default 32 byte acak */
    messageSecret?: Uint8Array
}

type Submessage = Record<string, unknown>

const buildSections = (input: AiRichInput): Record<string, unknown>[] => {
    const sections: Record<string, unknown>[] = []

    const pushText = (text: string) => {
        sections.push({
            view_model: {
                primitive: { text, __typename: 'GenAIMarkdownTextUXPrimitive' },
                __typename: 'GenAISingleLayoutViewModel'
            }
        })
    }

    if (input.headerText) pushText(input.headerText)
    if (input.contentText) pushText(input.contentText)

    if (input.code) {
        sections.push({
            view_model: {
                primitive: {
                    language: input.code.language ?? 'javascript',
                    code_blocks: [{ content: input.code.code, type: 'PLAIN' }],
                    __typename: 'GenAICodeUXPrimitive'
                },
                __typename: 'GenAISingleLayoutViewModel'
            }
        })
    }

    if (input.table) {
        sections.push({
            view_model: {
                primitive: {
                    title: input.table.title ?? '',
                    rows: input.table.rows.map((items, index) => ({
                        is_header: !input.table!.noHeading && index === 0,
                        cells: items
                    })),
                    __typename: 'GenATableUXPrimitive'
                },
                __typename: 'GenAISingleLayoutViewModel'
            }
        })
    }

    if (input.footerText) pushText(input.footerText)

    return sections
}

const buildSubmessages = (input: AiRichInput): Submessage[] => {
    const submessages: Submessage[] = []

    if (input.headerText) {
        submessages.push({ messageType: RichSubMessageType.TEXT, messageText: input.headerText })
    }
    if (input.contentText) {
        submessages.push({ messageType: RichSubMessageType.TEXT, messageText: input.contentText })
    }
    if (input.code) {
        submessages.push({
            messageType: RichSubMessageType.CODE,
            codeMetadata: {
                codeLanguage: input.code.language ?? 'javascript',
                codeBlocks: [{ codeContent: input.code.code, highlightType: 0 }]
            }
        })
    }
    if (input.table) {
        submessages.push({
            messageType: RichSubMessageType.TABLE,
            tableMetadata: {
                title: input.table.title ?? '',
                rows: input.table.rows.map((items, index) => ({
                    isHeading: !input.table!.noHeading && index === 0,
                    items
                }))
            }
        })
    }
    if (input.footerText) {
        submessages.push({ messageType: RichSubMessageType.TEXT, messageText: input.footerText })
    }

    return submessages
}

/**
 * Bangun pesan AI Rich siap kirim.
 *
 * ```ts
 * const msg = buildAiRichMessage({
 *     headerText: 'AI HOSHINO',
 *     table: { title: 'Status', rows: [['Komponen', 'Nilai'], ['Uptime', '3 jam']] },
 *     footerText: 'Powered By Reviza D Kink'
 * })
 * await client.messages.send(jid, msg)
 * ```
 */
export const buildAiRichMessage = (input: AiRichInput): Proto.IMessage => {
    const responseId = randomUUID()
    const submessages = buildSubmessages(input)

    if (submessages.length < 1) {
        throw new TypeError('AI Rich butuh minimal satu bagian isi')
    }

    const unified = { response_id: responseId, sections: buildSections(input) }

    const botMetadata: Record<string, unknown> = {
        botResponseId: responseId
    }

    if (input.disclaimerText) {
        botMetadata.messageDisclaimerText = input.disclaimerText
    }

    if (input.fakeVerification) {
        const certificate = (length: number) => {
            const buf = new Uint8Array(length)
            buf.set(randomBytes(length))
            buf[0] = 48
            buf[1] = 130
            return buf
        }
        botMetadata.verificationMetadata = {
            proofs: [
                {
                    certificateChain: [certificate(685), certificate(892)],
                    version: 1,
                    useCase: 1,
                    signature: new Uint8Array(randomBytes(64))
                }
            ]
        }
    }

    return {
        messageContextInfo: {
            messageSecret: input.messageSecret ?? new Uint8Array(randomBytes(32)),
            botMetadata
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    submessages,
                    messageType: AI_RICH_RESPONSE_TYPE_STANDARD,
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify(unified))
                    },
                    contextInfo: {
                        isForwarded: true,
                        forwardingScore: 1,
                        forwardOrigin: 4
                    }
                }
            }
        }
    } as unknown as Proto.IMessage
}

/** Pintasan: kirim tabel saja. */
export const buildTableMessage = (table: RichTableInput, extra: Omit<AiRichInput, 'table'> = {}) =>
    buildAiRichMessage({ ...extra, table })

/** Pintasan: kirim blok kode saja. */
export const buildCodeMessage = (code: RichCodeInput, extra: Omit<AiRichInput, 'code'> = {}) =>
    buildAiRichMessage({ ...extra, code })
