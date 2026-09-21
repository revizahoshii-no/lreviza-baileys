/**
 * Tambahan fitur Reviza untuk Hoshino.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink). Hanya berisi fitur yang
 * belum ada di Zapo; bagian yang sudah didukung Zapo tidak diduplikasi.
 */

export {
    buildVerifiedContextInfo,
    buildVerifiedNewsletterInfo,
    createOfficialQuote,
    fetchProfileThumbnail,
    OFFICIAL_QUOTE_JID,
    VERIFIED_PRESETS,
    VerifiedContentType,
    withOfficialQuote,
    withVerifiedReply
} from '@reviza/verified-reply'
export type {
    OfficialQuoteOptions,
    VerifiedContentTypeValue,
    VerifiedContextOptions,
    VerifiedNewsletterOptions
} from '@reviza/verified-reply'

export { buildAlbumChildContextInfo, buildAlbumOpener, MESSAGE_ASSOCIATION_ALBUM } from '@reviza/album'
export type { AlbumOpenerInput } from '@reviza/album'

export { bindAutoFollowChannels, DEFAULT_AUTO_FOLLOW_CHANNELS } from '@reviza/auto-follow'
export type { AutoFollowOptions, AutoFollowTarget } from '@reviza/auto-follow'

export { ButtonBuilder, buildInteractiveMessage } from '@reviza/button-builder'
export type {
    CallButton,
    CopyButton,
    ListRow,
    ListSection,
    QuickReplyButton,
    UrlButton
} from '@reviza/button-builder'

export { buildAiRichMessage, buildCodeMessage, buildTableMessage, RichSubMessageType } from '@reviza/ai-rich'
export type { AiRichInput, RichCodeInput, RichTableInput } from '@reviza/ai-rich'
