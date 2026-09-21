/**
 * AI Rich message — tabel, blok kode berwarna, gambar, dan teks kaya.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink) ke arsitektur Hoshino.
 *
 * Catatan hasil pengujian lapangan:
 *   - `messageSecret` WAJIB ada, dipakai WhatsApp untuk integritas pesan bot.
 *   - `verificationMetadata` berisi sertifikat acak justru membuat WhatsApp
 *     menahan konten, maka TIDAK dikirim kecuali `fakeVerification: true`.
 *   - `unifiedResponse.data` berisi JSON layout; tanpa itu klien tidak punya
 *     bahan untuk merender tabel/kode.
 */

import { randomBytes, randomUUID } from 'node:crypto'

import type { Proto } from '@proto'
import { LANGUAGE_KEYWORDS, LEXER_REGEX } from '@reviza/language-keywords'

/** Jenis submessage pada AI Rich response. Nilai harus sama persis dengan WhatsApp. */
export const RichSubMessageType = {
    UNKNOWN: 0,
    GRID_IMAGE: 1,
    TEXT: 2,
    INLINE_IMAGE: 3,
    TABLE: 4,
    CODE: 5,
    DYNAMIC: 6,
    MAP: 7,
    LATEX: 8,
    CONTENT_ITEMS: 9
} as const

/** Jenis pewarnaan token pada blok kode. */
export const CodeHighlightType = {
    DEFAULT: 0,
    KEYWORD: 1,
    METHOD: 2,
    STRING: 3,
    NUMBER: 4,
    COMMENT: 5
} as const

const CODE_HIGHLIGHT_NAME: Record<number, string> = {
    0: 'DEFAULT',
    1: 'KEYWORD',
    2: 'METHOD',
    3: 'STRING',
    4: 'NUMBER',
    5: 'COMMENT'
}

const AI_RICH_RESPONSE_TYPE_STANDARD = 1
const EMPTY_KEYWORDS = new Set<string>()

export interface CodeBlockToken {
    highlightType: number
    codeContent: string
}

/**
 * Pecah kode menjadi token berwarna.
 *
 * Mendukung 25 bahasa: javascript, typescript, python, go, rust, c, cpp,
 * csharp, bash, powershell, css, html, dan alias-aliasnya.
 *
 * ```ts
 * tokenizeCode('const x = 1 // catatan', 'javascript')
 * // [{ highlightType: 1, codeContent: 'const' }, ...]
 * ```
 */
export const tokenizeCode = (code: string, language = 'javascript'): CodeBlockToken[] => {
    const keywords = LANGUAGE_KEYWORDS[language] ?? EMPTY_KEYWORDS
    const blocks: CodeBlockToken[] = []

    LEXER_REGEX.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = LEXER_REGEX.exec(code)) !== null) {
        if (match[1]) {
            blocks.push({ highlightType: CodeHighlightType.COMMENT, codeContent: match[1] })
        } else if (match[2]) {
            blocks.push({ highlightType: CodeHighlightType.STRING, codeContent: match[2] })
        } else if (match[3]) {
            blocks.push({
                highlightType: keywords.has(match[3]) ? CodeHighlightType.KEYWORD : CodeHighlightType.METHOD,
                codeContent: match[3]
            })
        } else if (match[4]) {
            blocks.push({
                highlightType: keywords.has(match[4]) ? CodeHighlightType.KEYWORD : CodeHighlightType.DEFAULT,
                codeContent: match[4]
            })
        } else if (match[5]) {
            blocks.push({ highlightType: CodeHighlightType.NUMBER, codeContent: match[5] })
        } else {
            blocks.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: match[6]! })
        }
    }

    return blocks
}

export interface RichSubmessage {
    messageType: number
    messageText?: string
    codeMetadata?: { codeLanguage: string; codeBlocks: CodeBlockToken[] }
    tableMetadata?: { title?: string; rows: { isHeading: boolean; items: string[] }[] }
    gridImageMetadata?: Record<string, unknown>
    [key: string]: unknown
}

/**
 * Ubah daftar submessage menjadi payload `unifiedResponse`.
 * Ini yang dibaca klien WhatsApp untuk menggambar tabel dan blok kode.
 */
export const toUnified = (submessages: RichSubmessage[], uuid?: string) => ({
    response_id: uuid ?? randomUUID(),
    sections: submessages.map((submessage) => {
        switch (submessage.messageType) {
            case RichSubMessageType.CODE: {
                const meta = submessage.codeMetadata!
                return {
                    view_model: {
                        primitive: {
                            language: meta.codeLanguage,
                            code_blocks: meta.codeBlocks.map((block) => ({
                                content: block.codeContent,
                                type: CODE_HIGHLIGHT_NAME[block.highlightType] ?? 'DEFAULT'
                            })),
                            __typename: 'GenAICodeUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                }
            }
            case RichSubMessageType.TABLE: {
                const meta = submessage.tableMetadata!
                return {
                    view_model: {
                        primitive: {
                            title: meta.title ?? '',
                            rows: meta.rows.map((row) => ({ is_header: row.isHeading, cells: row.items })),
                            __typename: 'GenATableUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                }
            }
            case RichSubMessageType.TEXT:
                return {
                    view_model: {
                        primitive: {
                            text: submessage.messageText ?? '',
                            __typename: 'GenAIMarkdownTextUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                }
            default:
                return {}
        }
    })
})

/** Tanda tangan acak untuk verificationMetadata (hanya dipakai bila fakeVerification). */
export const botMetadataSignature = (): Uint8Array => new Uint8Array(randomBytes(64))

/** Sertifikat acak untuk verificationMetadata (hanya dipakai bila fakeVerification). */
export const botMetadataCertificate = (length = 685): Uint8Array => {
    const certificate = new Uint8Array(randomBytes(length))
    certificate[0] = 48
    certificate[1] = 130
    return certificate
}

export interface WrapBotForwardedOptions {
    /** kirim verificationMetadata acak (perilaku lama, umumnya TIDAK disarankan) */
    fakeVerification?: boolean
    /** messageSecret custom, default 32 byte acak */
    messageSecret?: Uint8Array
    /** teks disclaimer kecil di atas kartu */
    disclaimerText?: string
    /** id respons, harus sama dengan response_id di unifiedResponse */
    botResponseId?: string
}

/** Bungkus richResponseMessage ke dalam botForwardedMessage lengkap dengan metadata. */
export const wrapToBotForwardedMessage = (
    richResponseMessage: Record<string, unknown>,
    options: WrapBotForwardedOptions = {}
): Proto.IMessage => {
    const { fakeVerification = false, messageSecret, disclaimerText, botResponseId } = options

    const botMetadata: Record<string, unknown> = {}
    if (botResponseId) botMetadata.botResponseId = botResponseId
    if (disclaimerText) botMetadata.messageDisclaimerText = disclaimerText

    if (fakeVerification) {
        botMetadata.verificationMetadata = {
            proofs: [
                {
                    certificateChain: [botMetadataCertificate(), botMetadataCertificate(892)],
                    version: 1,
                    useCase: 1,
                    signature: botMetadataSignature()
                }
            ]
        }
    }

    return {
        messageContextInfo: {
            messageSecret: messageSecret ?? new Uint8Array(randomBytes(32)),
            botMetadata
        },
        botForwardedMessage: { message: { richResponseMessage } }
    } as unknown as Proto.IMessage
}

export interface RichTableInput {
    /** judul tabel */
    title?: string
    /** baris tabel; baris pertama jadi heading kecuali noHeading = true */
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

export interface AiRichInput extends WrapBotForwardedOptions {
    /** teks pembuka */
    headerText?: string
    /** isi utama */
    contentText?: string
    /** tabel */
    table?: RichTableInput
    /** blok kode berwarna */
    code?: RichCodeInput
    /** teks penutup */
    footerText?: string
    /** daftar submessage mentah bila ingin kontrol penuh */
    submessages?: RichSubmessage[]
}

const buildSubmessages = (input: AiRichInput): RichSubmessage[] => {
    if (input.submessages?.length) return input.submessages

    const list: RichSubmessage[] = []

    if (input.headerText) {
        list.push({ messageType: RichSubMessageType.TEXT, messageText: input.headerText })
    }
    if (input.contentText) {
        list.push({ messageType: RichSubMessageType.TEXT, messageText: input.contentText })
    }
    if (input.code) {
        const language = input.code.language ?? 'javascript'
        list.push({
            messageType: RichSubMessageType.CODE,
            codeMetadata: { codeLanguage: language, codeBlocks: tokenizeCode(input.code.code, language) }
        })
    }
    if (input.table) {
        list.push({
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
        list.push({ messageType: RichSubMessageType.TEXT, messageText: input.footerText })
    }

    return list
}

/**
 * Bangun pesan AI Rich siap kirim.
 *
 * ```ts
 * const msg = buildAiRichMessage({
 *     headerText: 'AI HOSHINO',
 *     table: { title: 'Status', rows: [['Komponen', 'Nilai'], ['Uptime', '3 jam']] },
 *     code: { language: 'javascript', code: 'const x = 1' },
 *     footerText: 'Powered By Reviza D Kink'
 * })
 * await client.messages.send(jid, msg)
 * ```
 */
export const buildAiRichMessage = (input: AiRichInput): Proto.IMessage => {
    const submessages = buildSubmessages(input)
    if (submessages.length < 1) {
        throw new TypeError('AI Rich butuh minimal satu bagian isi')
    }

    const responseId = input.botResponseId ?? randomUUID()
    const unified = toUnified(submessages, responseId)

    return wrapToBotForwardedMessage(
        {
            submessages,
            messageType: AI_RICH_RESPONSE_TYPE_STANDARD,
            unifiedResponse: { data: Buffer.from(JSON.stringify(unified)) },
            contextInfo: { isForwarded: true, forwardingScore: 1, forwardOrigin: 4 }
        },
        { ...input, botResponseId: responseId }
    )
}

/** Pintasan: kirim tabel saja. */
export const buildTableMessage = (table: RichTableInput, extra: Omit<AiRichInput, 'table'> = {}) =>
    buildAiRichMessage({ ...extra, table })

/** Pintasan: kirim blok kode berwarna saja. */
export const buildCodeMessage = (code: RichCodeInput, extra: Omit<AiRichInput, 'code'> = {}) =>
    buildAiRichMessage({ ...extra, code })
