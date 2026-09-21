/**
 * Tambahan fitur Reviza untuk Hoshino.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink). Hanya berisi fitur yang
 * belum ada di Zapo; bagian yang sudah didukung Zapo tidak diduplikasi.
 */

export {
    bindVerifiedReply,
    buildVerifiedContextInfo,
    buildVerifiedNewsletterInfo,
    createOfficialQuote,
    createVerifiedQuote,
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
    VerifiedNewsletterOptions,
    VerifiedReplyTarget
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

export {
    botMetadataCertificate,
    botMetadataSignature,
    buildAiRichMessage,
    buildCodeMessage,
    buildTableMessage,
    CodeHighlightType,
    RichSubMessageType,
    tokenizeCode,
    toUnified,
    wrapToBotForwardedMessage
} from '@reviza/ai-rich'
export type {
    AiRichInput,
    CodeBlockToken,
    RichCodeInput,
    RichSubmessage,
    RichTableInput,
    WrapBotForwardedOptions
} from '@reviza/ai-rich'

export {
    AssociationType,
    BIZ_BOT_SUPPORT_PAYLOAD,
    ButtonHeaderType,
    ButtonType,
    CarouselCardType,
    LIBRARY_NAME,
    ListType,
    META_AI_JID,
    OFFICIAL_BIZ_JID,
    STORIES_JID
} from '@reviza/constants'

export {
    hasValidAlbumMedia,
    hasValidCarouselHeader,
    hasValidInteractiveHeader,
    isJidBot,
    isJidMetaAI,
    isMetaAiAccount
} from '@reviza/helpers'

export { LANGUAGE_KEYWORDS, LEXER_REGEX } from '@reviza/language-keywords'
