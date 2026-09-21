/**
 * Konstanta dan enum pesan interaktif.
 *
 * Diport dari @revizahoshii/baileys (Reviza D Kink). Nilai harus sama persis
 * dengan protokol WhatsApp — jangan diubah.
 */

/** Jenis tombol pada buttonsMessage. */
export const ButtonType = {
    UNKNOWN: 0,
    RESPONSE: 1,
    NATIVE_FLOW: 2
} as const

/** Jenis header pada buttonsMessage / interactiveMessage. */
export const ButtonHeaderType = {
    UNKNOWN: 0,
    EMPTY: 1,
    TEXT: 2,
    DOCUMENT: 3,
    IMAGE: 4,
    VIDEO: 5,
    LOCATION: 6
} as const

/** Jenis daftar pada listMessage. */
export const ListType = {
    UNKNOWN: 0,
    SINGLE_SELECT: 1,
    PRODUCT_LIST: 2
} as const

/** Jenis kartu carousel. */
export const CarouselCardType = {
    UNKNOWN: 0,
    HSCROLL_CARDS: 1,
    ALBUM_IMAGE: 2
} as const

/** Jenis asosiasi antar pesan. MEDIA_ALBUM dipakai untuk album. */
export const AssociationType = {
    UNKNOWN: 0,
    MEDIA_ALBUM: 1,
    BOT_PLUGIN: 2,
    EVENT_COVER_IMAGE: 3,
    STATUS_POLL: 4,
    HD_VIDEO_DUAL_UPLOAD: 5,
    STATUS_EXTERNAL_RESHARE: 6,
    MEDIA_POLL: 7,
    STATUS_ADD_YOURS: 8,
    STATUS_NOTIFICATION: 9,
    HD_IMAGE_DUAL_UPLOAD: 10,
    STICKER_ANNOTATION: 11,
    MOTION_PHOTO: 12,
    STATUS_LINK_ACTION: 13,
    VIEW_ALL_REPLIES: 14,
    POLL_ADD_OPTION: 20
} as const

/** Payload penanda pesan AI resmi. Dipakai pada messageContextInfo.supportPayload. */
export const BIZ_BOT_SUPPORT_PAYLOAD =
    '{"version":1,"is_ai_message":true,"should_upload_client_logs":false,' +
    '"should_show_system_message":false,"ticket_id":"7004947587700716",' +
    '"citation_items":[],"ticket_locale":"us"}'

/** JID akun Meta AI. */
export const META_AI_JID = '13135550002@c.us'

/** JID akun sistem WhatsApp Business. */
export const OFFICIAL_BIZ_JID = '16505361212@c.us'

/** JID status/story broadcast. */
export const STORIES_JID = 'status@broadcast'

/** Nama library. */
export const LIBRARY_NAME = '@revizahoshii/hoshino'
