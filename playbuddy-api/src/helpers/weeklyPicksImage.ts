import axios from 'axios';
import sharp from 'sharp';
import moment from 'moment-timezone';
import { supabaseClient } from '../connections/supabaseClient.js';
import { ACTIVE_EVENT_TYPES } from '../commonTypes.js';

const TZ = 'America/New_York';
const BASE_WIDTH = 390;
const DETAILS_PANEL_HEIGHT = 92;
const isActiveEventType = (value?: string | null) =>
    !!value && ACTIVE_EVENT_TYPES.includes(value as (typeof ACTIVE_EVENT_TYPES)[number]);

const THEME = {
    gradients: {
        welcome: ['#5A1D8A', '#7E39C8', '#F38AB2', '#FFC7A1'],
    },
    colors: {
        white: '#FFFFFF',
        black: '#111111',
        textPrimary: '#333333',
        textMuted: '#555555',
        textDisabled: '#CCCCCC',
        textSlate: '#6B7280',
        textDeep: '#2C2C34',
        textOnDarkStrong: 'rgba(255,255,255,0.9)',
        textOnDarkMuted: 'rgba(255,255,255,0.8)',
        textOnDarkSubtle: 'rgba(255,255,255,0.5)',
        brandViolet: '#6A1B9A',
        brandPink: '#FF2675',
        brandDeep: '#2C0B63',
        brandBlue: '#1976D2',
        brandPurpleDark: '#5A43B5',
        brandPlum: '#2D005F',
        brandInk: '#3B2F74',
        surfaceWhiteStrong: 'rgba(255,255,255,0.8)',
        surfaceWhiteFrosted: 'rgba(255,255,255,0.92)',
        surfaceLavenderLight: '#F7F5FF',
        surfaceLavenderStrong: '#E7DEFF',
        surfaceLavenderAlt: '#F3EEFF',
        surfaceLavenderWarm: '#F4E1FF',
        surfaceGoldLight: '#FFFAF0',
        surfaceGoldWarm: '#FFF8D6',
        surfaceMuted: '#F6F7F9',
        surfaceMutedAlt: '#ECECF3',
        surfaceSubtle: '#D1D5DB',
        surfaceInfo: '#F3F7FF',
        surfaceInfoStrong: '#DCE5FF',
        surfaceRoseSoft: '#FFF1F2',
        surfaceRose: '#FFF5F6',
        borderLight: '#E9E9E9',
        borderLavenderSoft: '#E6E0F5',
        borderOnDarkSoft: 'rgba(255,255,255,0.2)',
        borderOnDarkStrong: 'rgba(255,255,255,0.8)',
        borderMuted: '#DADAE6',
        borderMutedLight: '#E2E0EA',
        gold: '#FFD700',
        warning: '#D97706',
        danger: '#FF3B30',
        success: '#2E7D32',
        textGold: '#B08A00',
        shadowPlum: '#2b145a',
        brandGlowTop: 'rgba(255,255,255,0.18)',
        brandGlowMid: 'rgba(255,193,230,0.2)',
        brandGlowWarm: 'rgba(255,188,143,0.2)',
        overlayNone: 'rgba(0,0,0,0)',
        overlayStrong: 'rgba(0,0,0,0.5)',
        overlayDeep: 'rgba(0,0,0,0.75)',
        discountBadge: 'rgba(255,215,0,0.8)',
    },
};

const IMAGE_THEMES: Record<
    string,
    { label: string; colors: string[]; textColor: string }
> = {
    event: {
        label: 'Event',
        colors: [THEME.colors.surfaceLavenderLight, THEME.colors.surfaceLavenderStrong],
        textColor: THEME.colors.brandViolet,
    },
    munch: {
        label: 'Munch',
        colors: [THEME.colors.surfaceGoldLight, THEME.colors.surfaceGoldWarm],
        textColor: THEME.colors.textGold,
    },
    play_party: {
        label: 'Play Party',
        colors: [THEME.colors.surfaceLavenderAlt, THEME.colors.surfaceLavenderStrong],
        textColor: THEME.colors.brandPurpleDark,
    },
    retreat: {
        label: 'Retreat',
        colors: [THEME.colors.surfaceMuted, THEME.colors.surfaceLavenderLight],
        textColor: THEME.colors.success,
    },
    festival: {
        label: 'Festival',
        colors: [THEME.colors.surfaceInfo, THEME.colors.surfaceInfoStrong],
        textColor: THEME.colors.brandBlue,
    },
    conference: {
        label: 'Conference',
        colors: [THEME.colors.surfaceInfo, THEME.colors.surfaceInfoStrong],
        textColor: THEME.colors.brandBlue,
    },
    workshop: {
        label: 'Workshop',
        colors: [THEME.colors.surfaceRoseSoft, THEME.colors.surfaceRose],
        textColor: THEME.colors.warning,
    },
};

const TYPE_LABEL_MAP: Record<string, string> = {
    play_party: 'Play Party',
    munch: 'Munch',
    retreat: 'Retreat',
    festival: 'Festival',
    conference: 'Conference',
    workshop: 'Workshop',
};

const TYPE_TAG_COLORS: Record<string, { background: string; text: string; border: string }> = {
    'play party': { background: '#EFE9FF', text: '#5A43B5', border: '#DED7FF' },
    munch: { background: '#FFE2B6', text: '#8A5200', border: '#F1C07A' },
    retreat: { background: '#EAF6EE', text: '#2E6B4D', border: '#D6EBDC' },
    festival: { background: '#E8F1FF', text: '#2F5DA8', border: '#D6E4FB' },
    conference: { background: '#E8F1FF', text: '#2F5DA8', border: '#D6E4FB' },
    workshop: { background: '#FDEBEC', text: '#9A3D42', border: '#F6D7DA' },
    rope: { background: '#E8F5F8', text: '#2D5E6F', border: '#D3E7EE' },
    vetted: { background: '#E9F8EF', text: '#2F6E4A', border: '#D7F0E1' },
};
type WeeklyPickItem = {
    dateKey: string;
    dayOfWeek: string;
    dateLabel: string;
    title: string;
    organizer: string;
    image: string;
    promoCodeDiscount: string | null;
    eventId: number;
    typeKey: string;
    timeLabel: string;
    locationLabel: string;
    priceLabel: string;
    typeTagLabel: string;
    typeTagColors: { background: string; text: string; border: string };
};

type WeeklyPicksImageOptions = {
    weekOffset?: number;
    width?: number;
    scale?: number;
    limit?: number;
    partCount?: number;
};

type WeeklyPicksImagePart = {
    jpg: Buffer;
    height: number;
};

type WeeklyPicksImageResult = {
    png: Buffer;
    parts: WeeklyPicksImagePart[];
    splitAt: number;
    width: number;
    height: number;
    weekOffset: number;
    weekLabel: string;
};

type DayLayout = {
    dateKey: string;
    startY: number;
    endY: number;
};

type WeeklyPickEventRow = {
    id: number;
    name: string | null;
    start_date: string | null;
    end_date?: string | null;
    image_url: string | null;
    short_description: string | null;
    short_price?: string | null;
    weekly_pick: boolean | null;
    type?: string | null;
    is_munch?: boolean | null;
    play_party?: boolean | null;
    approval_status?: string | null;
    facilitator_only?: boolean | null;
    non_ny?: boolean | null;
    location?: string | null;
    city?: string | null;
    region?: string | null;
    neighborhood?: string | null;
    tags?: string[] | null;
    classification?: { tags?: string[] | null } | null;
    location_area?: { name?: string | null } | null;
    organizer?: {
        id?: number | null;
        name?: string | null;
        hidden?: boolean | null;
        promo_codes?: { discount?: number | null; discount_type?: string | null; scope?: string | null }[] | null;
    } | null;
    promo_code_event?: { promo_codes?: { discount?: number | null; discount_type?: string | null; scope?: string | null } | null }[] | null;
};

const fontDisplay = `'AvenirNext-DemiBold','Avenir Next','AvenirNext','Helvetica Neue',Helvetica,Arial,sans-serif`;
const fontBody = `'AvenirNext-Regular','Avenir Next','AvenirNext','Helvetica Neue',Helvetica,Arial,sans-serif`;

const escapeXml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const sanitizeText = (value?: string | null) =>
    (value || '').replace(/\s+/g, ' ').trim();

const wrapText = (value: string, maxChars: number, maxLines: number) => {
    const cleaned = sanitizeText(value);
    if (!cleaned) return [];
    const words = cleaned.split(' ');
    const lines: string[] = [];
    let line = '';

    for (let i = 0; i < words.length; i += 1) {
        const word = words[i];
        const next = line ? `${line} ${word}` : word;
        if (next.length <= maxChars) {
            line = next;
            continue;
        }

        const isLastLine = lines.length + 1 >= maxLines;
        if (isLastLine) {
            const remaining = Math.max(0, maxChars - line.length - (line ? 1 : 0));
            const suffix = '...';
            if (remaining > suffix.length) {
                const take = Math.max(0, remaining - suffix.length);
                const chunk = word.slice(0, take);
                line = line ? `${line} ${chunk}` : chunk;
            } else if (!line) {
                line = word.slice(0, Math.max(0, maxChars - suffix.length));
            }
            line = line.trimEnd();
            lines.push((line ? line : '').replace(/\s+$/, '') + suffix);
            return lines;
        }

        if (line) {
            lines.push(line);
            line = word;
        } else {
            lines.push(word.slice(0, Math.max(1, maxChars - 3)) + '...');
            return lines;
        }
    }

    if (line && lines.length < maxLines) lines.push(line);

    return lines;
};

const normalizePartCount = (value?: number) => {
    if (!Number.isFinite(value)) return 2;
    return Math.round(value) === 1 ? 1 : 2;
};

const truncateText = (value: string, maxChars: number) => {
    const cleaned = sanitizeText(value);
    if (cleaned.length <= maxChars) return cleaned;
    if (maxChars <= 3) return cleaned.slice(0, maxChars);
    return cleaned.slice(0, Math.max(1, maxChars - 3)).trimEnd() + '...';
};

type PlaceholderIconKind = 'event' | 'munch' | 'party';

const buildPlaceholderIconSvg = ({
    kind,
    centerX,
    centerY,
    size,
    stroke,
    strokeWidth,
}: {
    kind: PlaceholderIconKind;
    centerX: number;
    centerY: number;
    size: number;
    stroke: string;
    strokeWidth: number;
}) => {
    const half = size / 2;
    const x = centerX - half;
    const y = centerY - half;
    const iconProps = `stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

    if (kind === 'munch') {
        const topY = centerY - size * 0.38;
        const bottomY = centerY + size * 0.38;
        const forkX = centerX - size * 0.12;
        const knifeX = centerX + size * 0.18;
        const prongOffset = size * 0.08;
        const prongHeight = size * 0.18;
        return `
    <g ${iconProps}>
      <line x1="${forkX}" y1="${topY + prongHeight}" x2="${forkX}" y2="${bottomY}" />
      <line x1="${forkX - prongOffset}" y1="${topY}" x2="${forkX - prongOffset}" y2="${topY + prongHeight}" />
      <line x1="${forkX}" y1="${topY}" x2="${forkX}" y2="${topY + prongHeight}" />
      <line x1="${forkX + prongOffset}" y1="${topY}" x2="${forkX + prongOffset}" y2="${topY + prongHeight}" />
      <line x1="${knifeX}" y1="${topY}" x2="${knifeX}" y2="${bottomY}" />
    </g>`;
    }

    if (kind === 'party') {
        const ballRadius = size * 0.22;
        const ballCenterY = centerY + size * 0.08;
        const ballTop = ballCenterY - ballRadius;
        const ballBottom = ballCenterY + ballRadius;
        const capHeight = size * 0.07;
        const capWidth = size * 0.18;
        const capX = centerX - capWidth / 2;
        const capY = ballTop - capHeight;
        const chainTopY = capY - size * 0.08;
        const bandWidth = ballRadius * 0.6;
        const bandTopY = ballCenterY - ballRadius * 0.45;
        const bandBottomY = ballCenterY + ballRadius * 0.45;
        return `
    <g ${iconProps}>
      <line x1="${centerX}" y1="${chainTopY}" x2="${centerX}" y2="${capY}" />
      <rect x="${capX}" y="${capY}" width="${capWidth}" height="${capHeight}" rx="${capHeight * 0.4}" ry="${capHeight * 0.4}" />
      <circle cx="${centerX}" cy="${ballCenterY}" r="${ballRadius}" />
      <line x1="${centerX - bandWidth}" y1="${bandTopY}" x2="${centerX + bandWidth}" y2="${bandTopY}" />
      <line x1="${centerX - bandWidth}" y1="${ballCenterY}" x2="${centerX + bandWidth}" y2="${ballCenterY}" />
      <line x1="${centerX - bandWidth}" y1="${bandBottomY}" x2="${centerX + bandWidth}" y2="${bandBottomY}" />
      <line x1="${centerX}" y1="${ballTop}" x2="${centerX}" y2="${ballBottom}" />
    </g>`;
    }

    const radius = size * 0.18;
    const headerY = y + size * 0.32;
    const ringOffset = size * 0.25;
    return `
    <g ${iconProps}>
      <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" ry="${radius}" />
      <line x1="${x}" y1="${headerY}" x2="${x + size}" y2="${headerY}" />
      <line x1="${x + ringOffset}" y1="${y}" x2="${x + ringOffset}" y2="${headerY - size * 0.06}" />
      <line x1="${x + size - ringOffset}" y1="${y}" x2="${x + size - ringOffset}" y2="${headerY - size * 0.06}" />
    </g>`;
};

const normalizeType = (value?: string | null) =>
    value?.toLowerCase().replace(/[\s-]+/g, '_').trim();

const resolveTypeKey = (event: WeeklyPickEventRow) => {
    if (event?.is_munch) return 'munch';
    if (event?.play_party) return 'play_party';
    const typeValue = normalizeType(event?.type);
    if (typeValue && isActiveEventType(typeValue)) return typeValue;
    return 'event';
};

const resolvePrimaryTypeLabel = (event: WeeklyPickEventRow) => {
    if (event?.play_party) return 'Play Party';
    if (event?.is_munch) return 'Munch';
    const typeValue = normalizeType(event?.type);
    if (typeValue && isActiveEventType(typeValue)) {
        return TYPE_LABEL_MAP[typeValue] || typeValue.replace(/_/g, ' ');
    }
    return 'Event';
};

const resolveTypeTagInfo = (event: WeeklyPickEventRow) => {
    const primaryLabel = resolvePrimaryTypeLabel(event);
    const normalizedTypeLabel = primaryLabel.trim().toLowerCase();
    const extraTags = [
        ...(event?.classification?.tags || []),
        ...(event?.tags || []),
    ]
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean);
    const primaryTag = extraTags.find((tag) => tag.toLowerCase() !== normalizedTypeLabel) || '';
    const displayTypeLabel = primaryLabel === 'Event' ? '' : primaryLabel;
    const typeTagLabel = displayTypeLabel
        ? (primaryTag ? `${displayTypeLabel} | ${primaryTag}` : displayTypeLabel)
        : primaryTag;
    const typeKey = (displayTypeLabel || primaryLabel).trim().toLowerCase();
    const typeTagColors = TYPE_TAG_COLORS[typeKey] || {
        background: 'rgba(0,0,0,0.8)',
        text: THEME.colors.textOnDarkStrong,
        border: 'transparent',
    };
    return { typeTagLabel, typeTagColors };
};

const formatPrimaryMetaLabel = (event: WeeklyPickEventRow) => {
    const start = event.start_date ? moment.tz(event.start_date, TZ) : null;
    const end = event.end_date ? moment.tz(event.end_date, TZ) : null;
    if (!start || !start.isValid()) return 'Time TBA';

    if (event.type === 'retreat') {
        if (end && end.isValid()) {
            return `${start.format('MMM D')} - ${end.format('MMM D YYYY')}`;
        }
        return `${start.format('MMM D YYYY')}`;
    }

    const startFormat = start.minutes() === 0 ? 'hA' : 'h:mmA';
    const startLabel = start.format(startFormat);
    if (end && end.isValid() && end.isAfter(start)) {
        const endFormat = end.minutes() === 0 ? 'hA' : 'h:mmA';
        return `${startLabel} - ${end.format(endFormat)}`;
    }
    return startLabel;
};

const formatLocationLabel = (event: WeeklyPickEventRow) =>
    event?.neighborhood ? event.neighborhood.trim() : '';

const formatPriceLabel = (event: WeeklyPickEventRow) =>
    event?.short_price ? event.short_price.trim() : '';

const resolvePromoDiscount = (event: WeeklyPickEventRow) => {
    const organizerPromo = event?.organizer?.promo_codes?.find((code) => code?.scope === 'organizer');
    const eventPromo = event?.promo_code_event
        ?.map((entry) => entry?.promo_codes)
        .find((code) => code?.scope === 'event');
    const promo = eventPromo || organizerPromo;
    if (!promo || promo.discount == null) return null;
    const discountValue = typeof promo.discount === 'number' ? promo.discount : Number(promo.discount);
    if (!Number.isFinite(discountValue)) return null;
    if (promo.discount_type === 'percent' || !promo.discount_type) {
        return `${discountValue}% off`;
    }
    return `$${discountValue} off`;
};

const getWeekRangeLabel = (start: moment.Moment) => {
    const end = start.clone().add(6, 'days');
    return `${start.format('MMM D')} - ${end.format('MMM D')}`;
};

const estimateMaxChars = (availableWidth: number, fontSize: number, charWidthFactor = 0.62) => {
    const avgCharWidth = fontSize * charWidthFactor;
    return Math.max(4, Math.floor(availableWidth / avgCharWidth));
};

const estimateTextWidth = (text: string, fontSize: number, letterSpacing: number) => {
    if (!text) return 0;
    const avgCharWidth = fontSize * 0.6;
    return text.length * avgCharWidth + Math.max(0, text.length - 1) * letterSpacing;
};

const SUPABASE_PUBLIC_PATH = '/storage/v1/object/public/';
const SUPABASE_RENDER_PATH = '/storage/v1/render/image/public/';

const buildSupabaseImageUrl = (url: string, width: number, height: number) => {
    try {
        const parsed = new URL(url);
        if (!parsed.pathname.startsWith(SUPABASE_PUBLIC_PATH)) {
            return null;
        }
        const path = parsed.pathname.slice(SUPABASE_PUBLIC_PATH.length);
        const params = new URLSearchParams({
            width: String(Math.round(width)),
            height: String(Math.round(height)),
            resize: 'cover',
            quality: '60',
        });
        parsed.pathname = `${SUPABASE_RENDER_PATH}${path}`;
        parsed.search = params.toString();
        return parsed.toString();
    } catch (error) {
        return null;
    }
};

const fetchImageDataUri = async (
    url: string | null,
    width: number,
    height: number,
    context: { eventId?: number; index?: number; total?: number } = {}
) => {
    if (!url) return null;
    const label = [
        context.eventId ? `id=${context.eventId}` : null,
        context.index && context.total ? `(${context.index}/${context.total})` : null,
    ]
        .filter(Boolean)
        .join(' ');
    const startTime = Date.now();
    console.log(`[weekly-picks] Image fetch start ${label}`.trim());
    try {
        const transformedUrl = buildSupabaseImageUrl(url, width, height);
        if (transformedUrl) {
            const transformedStart = Date.now();
            try {
                const response = await axios.get(transformedUrl, { responseType: 'arraybuffer', timeout: 15000 });
                const contentType = response.headers?.['content-type'] || 'image/jpeg';
                const durationMs = Date.now() - transformedStart;
                const sizeBytes = Buffer.byteLength(response.data || []);
                console.log(
                    `[weekly-picks] Image fetch transformed ok ${label} ms=${durationMs} bytes=${sizeBytes} type=${contentType}`.trim()
                );
                return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
            } catch (error) {
                const durationMs = Date.now() - transformedStart;
                console.warn(
                    `[weekly-picks] Image fetch transformed failed ${label} ms=${durationMs} url=${url}`.trim()
                );
            }
        } else {
            console.log(`[weekly-picks] Image not transformable ${label} url=${url}`.trim());
        }

        const fetchStart = Date.now();
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        const fetchMs = Date.now() - fetchStart;
        const rawBytes = Buffer.byteLength(response.data || []);
        console.log(
            `[weekly-picks] Image fetch raw ok ${label} ms=${fetchMs} bytes=${rawBytes}`.trim()
        );
        const resizeStart = Date.now();
        const resized = await sharp(response.data)
            .resize(width, height, { fit: 'cover', fastShrinkOnLoad: true })
            .jpeg({ quality: 60 })
            .toBuffer();
        const resizeMs = Date.now() - resizeStart;
        console.log(
            `[weekly-picks] Image resize ok ${label} ms=${resizeMs} outBytes=${resized.length}`.trim()
        );
        const totalMs = Date.now() - startTime;
        console.log(`[weekly-picks] Image fetch done ${label} totalMs=${totalMs}`.trim());
        return `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch (error) {
        const totalMs = Date.now() - startTime;
        console.warn(`[weekly-picks] Image fetch failed ${label} totalMs=${totalMs} url=${url}`.trim());
        return null;
    }
};

const buildSvg = ({
    width,
    height,
    scale,
    weekLabel,
    isFirstWeek,
    isLastWeek,
    days,
    imagesById,
}: {
    width: number;
    height: number;
    scale: number;
    weekLabel: string;
    isFirstWeek: boolean;
    isLastWeek: boolean;
    days: Array<{ dateKey: string; dayLabel: string; dateLabel: string; items: WeeklyPickItem[] }>;
    imagesById: Map<number, string | null>;
}): { svg: string; height: number; dayLayouts: DayLayout[] } => {
    const s = (value: number) => value * scale;

    const paddingX = s(16);
    const paddingTop = s(20);
    const paddingBottom = s(20);
    const eventsPaddingBottom = s(24);

    const weekSelectorPaddingX = s(16);
    const weekSelectorPaddingY = s(18);
    const weekNavSize = s(44);
    const weekSelectorRadius = s(24);
    const weekSelectorMarginBottom = s(16);

    const weekKickerFont = s(11.5);
    const weekTextFont = s(28);
    const weekKickerLine = s(14);
    const weekTextLine = s(34);
    const weekTextBlockHeight = weekKickerLine + weekTextLine;
    const weekSelectorHeight = Math.max(weekNavSize, weekTextBlockHeight) + weekSelectorPaddingY * 2;

    const dayOfWeekFont = s(24);
    const dayOfWeekLine = s(28);
    const dateLabelFont = s(13);
    const dateLabelLine = s(16);
    const dayHeaderHeight = dayOfWeekLine + dateLabelLine;
    const dayHeaderMarginBottom = s(12);
    const daySectionMarginBottom = s(20);
    const dayRuleMarginLeft = s(12);
    const dayRuleMarginBottom = s(4);

    const cardWidth = width - paddingX * 2;
    const cardRadius = s(16);
    const cardMarginBottom = s(16);
    const detailsPanelHeight = s(DETAILS_PANEL_HEIGHT);
    const imageHeight = Math.round(cardWidth / 2);
    const cardHeight = imageHeight + detailsPanelHeight;
    const detailsHeight = cardHeight - imageHeight;
    const typeIconBubbleSize = Math.max(s(32), Math.round(Math.min(imageHeight * 0.5, s(48))));
    const typeIconSize = Math.round(typeIconBubbleSize * 0.5);
    const typeIconStroke = Math.max(1, s(2));
    const typeIconBorder = Math.max(1, s(1));
    const showMissingImageIcon = false;

    const detailsPaddingTop = s(10);
    const detailsPaddingBottom = s(10);
    const detailsPaddingX = s(14);
    const titleFont = s(16);
    const titleLine = s(20);
    const organizerFont = s(12);
    const organizerLineHeight = s(16);
    const organizerMarginBottom = s(2);
    const titleMarginTop = s(6);
    const metaFont = s(12);
    const metaLineHeight = s(16);
    const metaMarginTop = s(2);
    const actionButtonSize = Math.max(s(30), Math.round(Math.min(detailsHeight * 0.45, s(40))));
    const actionButtonSpacing = s(12);
    const actionButtonInset = s(4);
    const actionButtonRight = s(4);
    const actionButtonLabel = 'Save';
    const actionButtonLabelMax = 'Saved';
    const actionButtonFont = Math.round(actionButtonSize * 0.36);
    const actionButtonIconSize = Math.round(actionButtonSize * 0.42);
    const actionButtonPaddingX = Math.round(actionButtonSize * 0.4);
    const actionButtonGap = Math.max(s(4), Math.round(actionButtonSize * 0.18));
    const actionButtonTextWidth = estimateTextWidth(actionButtonLabelMax, actionButtonFont, 0);
    const actionButtonWidth = Math.round(
        actionButtonPaddingX * 2 + actionButtonIconSize + actionButtonGap + actionButtonTextWidth
    );
    const actionButtonRadius = Math.round(actionButtonSize / 2);
    const actionButtonStroke = Math.max(1, Math.round(actionButtonSize * 0.05));
    const actionButtonIconStroke = Math.max(2, Math.round(actionButtonSize * 0.1));
    const actionButtonLabelWidth = estimateTextWidth(actionButtonLabel, actionButtonFont, 0);
    const actionButtonContentWidth = actionButtonIconSize + actionButtonGap + actionButtonLabelWidth;
    const actionButtonContentOffsetX = (actionButtonWidth - actionButtonContentWidth) / 2;

    const typeTagPaddingX = s(14);
    const typeTagPaddingY = s(4);
    const typeTagFont = s(13);
    const typeTagRadius = s(16);

    const discountPaddingX = s(10);
    const discountPaddingY = s(6);
    const discountRadius = s(16);
    const discountOffset = s(0);
    const discountFont = s(13);

    const glowTopSize = s(240);
    const glowMidSize = s(220);
    const glowBottomSize = s(300);

    let cursorY = paddingTop;

    const showEmpty = days.length === 0;
    if (!showEmpty) {
        cursorY += weekSelectorHeight + weekSelectorMarginBottom;
        for (const day of days) {
            cursorY += dayHeaderHeight + dayHeaderMarginBottom;
            for (const item of day.items) {
                cursorY += cardHeight + cardMarginBottom;
            }
            cursorY += daySectionMarginBottom;
        }
        cursorY += eventsPaddingBottom;
    } else {
        const emptyTextLine = s(20);
        const emptyCardPaddingY = s(20);
        cursorY += emptyCardPaddingY * 2 + emptyTextLine;
    }

    cursorY += paddingBottom;

    const finalHeight = Math.max(height, Math.ceil(cursorY));

    const brandShadowDy = s(10);
    const brandShadowBlur = s(18);
    const cardShadowDy = s(3);
    const cardShadowBlur = s(8);
    const discountShadowDy = s(1);
    const discountShadowBlur = s(3);

    const defs: string[] = [];

    defs.push(`
    <linearGradient id="bgGradient" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="${THEME.gradients.welcome[0]}" />
      <stop offset="45%" stop-color="${THEME.gradients.welcome[1]}" />
      <stop offset="78%" stop-color="${THEME.gradients.welcome[2]}" />
      <stop offset="100%" stop-color="${THEME.gradients.welcome[3]}" />
    </linearGradient>`);

    defs.push(`
    <linearGradient id="posterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="25%" stop-color="${THEME.colors.overlayNone}" />
      <stop offset="100%" stop-color="${THEME.colors.overlayDeep}" />
    </linearGradient>`);
    defs.push(`
    <linearGradient id="textPanelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(0,0,0,1)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.5)" />
    </linearGradient>`);
    defs.push(`
    <linearGradient id="glassPanel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${THEME.colors.white}" />
      <stop offset="100%" stop-color="${THEME.colors.surfaceLavenderLight}" />
    </linearGradient>`);

    defs.push(`
    <filter id="brandCardShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="${brandShadowDy}" stdDeviation="${brandShadowBlur}" flood-color="${THEME.colors.shadowPlum}" flood-opacity="0.18" />
    </filter>`);
    defs.push(`
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="${cardShadowDy}" stdDeviation="${cardShadowBlur}" flood-color="${THEME.colors.black}" flood-opacity="0.08" />
    </filter>`);
    defs.push(`
    <filter id="discountShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="${discountShadowDy}" stdDeviation="${discountShadowBlur}" flood-color="${THEME.colors.black}" flood-opacity="0.2" />
    </filter>`);
    defs.push(`
    <filter id="iconShadow" x="-40%" y="-40%" width="180%" height="200%">
      <feDropShadow dx="0" dy="${Math.max(1, s(2))}" stdDeviation="${Math.max(1, s(2.5))}" flood-color="${THEME.colors.black}" flood-opacity="0.25" />
    </filter>`);

    Object.entries(IMAGE_THEMES).forEach(([key, value]) => {
        defs.push(`
    <linearGradient id="fallback_${key}" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="${value.colors[0]}" />
      <stop offset="100%" stop-color="${value.colors[1]}" />
    </linearGradient>`);
    });

    const glowTopX = width - s(90) - glowTopSize;
    const glowTopY = -s(80);
    const glowMidX = -s(110);
    const glowMidY = s(120);
    const glowBottomX = -s(90);
    const glowBottomY = finalHeight + s(80) - glowBottomSize;

    const content: string[] = [];

    content.push(`
    <rect width="${width}" height="${finalHeight}" fill="url(#bgGradient)" />
    <circle cx="${glowTopX + glowTopSize / 2}" cy="${glowTopY + glowTopSize / 2}" r="${glowTopSize / 2}" fill="${THEME.colors.brandGlowTop}" />
    <circle cx="${glowMidX + glowMidSize / 2}" cy="${glowMidY + glowMidSize / 2}" r="${glowMidSize / 2}" fill="${THEME.colors.brandGlowMid}" />
    <circle cx="${glowBottomX + glowBottomSize / 2}" cy="${glowBottomY + glowBottomSize / 2}" r="${glowBottomSize / 2}" fill="${THEME.colors.brandGlowWarm}" />`);

    const dayLayouts: DayLayout[] = [];

    if (showEmpty) {
        const emptyCardX = paddingX;
        const emptyCardY = paddingTop;
        const emptyCardWidth = width - paddingX * 2;
        const emptyCardPaddingY = s(20);
        const emptyTextLine = s(20);
        const emptyCardHeight = emptyCardPaddingY * 2 + emptyTextLine;

        content.push(`
    <g filter="url(#brandCardShadow)">
      <rect x="${emptyCardX}" y="${emptyCardY}" width="${emptyCardWidth}" height="${emptyCardHeight}" rx="${s(24)}" ry="${s(24)}"
            fill="url(#glassPanel)" stroke="${THEME.colors.borderLavenderSoft}" stroke-width="${s(1)}" />
    </g>
    <text x="${emptyCardX + emptyCardWidth / 2}" y="${emptyCardY + emptyCardPaddingY + emptyTextLine / 2}"
          font-family="${fontBody}" font-size="${s(15)}" fill="${THEME.colors.textPrimary}"
          dominant-baseline="middle" text-anchor="middle">No events available for the next few weeks.</text>`);
    } else {
        const weekSelectorX = paddingX;
        const weekSelectorY = paddingTop;
        const weekSelectorWidth = width - paddingX * 2;

        content.push(`
    <g filter="url(#brandCardShadow)">
      <rect x="${weekSelectorX}" y="${weekSelectorY}" width="${weekSelectorWidth}" height="${weekSelectorHeight}" rx="${weekSelectorRadius}" ry="${weekSelectorRadius}"
            fill="url(#glassPanel)" stroke="${THEME.colors.borderLavenderSoft}" stroke-width="${s(1)}" />
    </g>`);

        const weekTextCenterX = weekSelectorX + weekSelectorWidth / 2;
        const weekTextTop = weekSelectorY + (weekSelectorHeight - weekTextBlockHeight) / 2;

        content.push(`
    <text x="${weekTextCenterX}" y="${weekTextTop}" font-size="${weekKickerFont}" fill="${THEME.colors.textMuted}"
          font-family="${fontBody}" letter-spacing="${s(1.6)}" dominant-baseline="hanging" text-anchor="middle">WEEK OF</text>
    <text x="${weekTextCenterX}" y="${weekTextTop + weekKickerLine}" font-size="${weekTextFont}" fill="${THEME.colors.brandDeep}"
          font-family="${fontDisplay}" font-weight="700" letter-spacing="${s(0.4)}" dominant-baseline="hanging" text-anchor="middle">${escapeXml(weekLabel)}</text>`);

        let y = weekSelectorY + weekSelectorHeight + weekSelectorMarginBottom;

        days.forEach((day) => {
            const dayHeaderY = y;
            const dayStartY = y;
            const dayLabel = day.dayLabel.toUpperCase();
            const dateLabel = day.dateLabel.toUpperCase();
            const dayLabelWidth = estimateTextWidth(dayLabel, dayOfWeekFont, s(1.8));
            const dateLabelWidth = estimateTextWidth(dateLabel, dateLabelFont, s(1.2));
            const headerTextWidth = Math.max(dayLabelWidth, dateLabelWidth);
            const ruleX = paddingX + headerTextWidth + dayRuleMarginLeft;
            const ruleWidth = Math.max(0, cardWidth - headerTextWidth - dayRuleMarginLeft);

            content.push(`
    <text x="${paddingX}" y="${dayHeaderY}" font-size="${dayOfWeekFont}" font-family="${fontDisplay}"
          font-weight="700" fill="${THEME.colors.white}" letter-spacing="${s(1.8)}" dominant-baseline="hanging">${escapeXml(dayLabel)}</text>
    <text x="${paddingX}" y="${dayHeaderY + dayOfWeekLine}" font-size="${dateLabelFont}" font-family="${fontBody}"
          fill="${THEME.colors.textOnDarkMuted}" letter-spacing="${s(1.2)}" dominant-baseline="hanging">${escapeXml(dateLabel)}</text>
    <rect x="${ruleX}" y="${dayHeaderY + dayHeaderHeight - dayRuleMarginBottom - s(1)}" width="${ruleWidth}"
          height="${s(1)}" fill="${THEME.colors.white}" opacity="0.4" />`);

            y += dayHeaderHeight + dayHeaderMarginBottom;

            day.items.forEach((item, index) => {
                const cardY = y;
                const clipId = `cardClip_${day.dateKey}_${index}`;
                const imageData = imagesById.get(item.eventId) || null;
                const fallbackGradientId = item.typeKey in IMAGE_THEMES ? `fallback_${item.typeKey}` : 'fallback_event';
                const detailsY = cardY + imageHeight;
                const detailsFullWidth = Math.max(0, cardWidth - detailsPaddingX * 2);
                const detailsTrimmedWidth = Math.max(
                    0,
                    detailsFullWidth - actionButtonWidth - actionButtonSpacing
                );
                const maxTitleChars = Math.max(8, estimateMaxChars(detailsFullWidth, titleFont, 0.53));
                const maxOrganizerChars = estimateMaxChars(detailsFullWidth, organizerFont, 0.6);
                const maxMetaChars = estimateMaxChars(detailsTrimmedWidth, metaFont, 0.6);

                const titleLines = wrapText(item.title, maxTitleChars, 2);
                const organizerText = truncateText(item.organizer, maxOrganizerChars);
                const metaLine = truncateText(
                    [item.timeLabel, item.locationLabel, item.priceLabel].filter(Boolean).join(' - '),
                    maxMetaChars
                );

                const hasOrganizer = organizerText.length > 0;
                const hasMeta = metaLine.length > 0;

                content.push(`
    <defs>
      <clipPath id="${clipId}">
        <rect x="${paddingX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${cardRadius}" ry="${cardRadius}" />
      </clipPath>
    </defs>
    <g filter="url(#cardShadow)">
      <rect x="${paddingX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${cardRadius}" ry="${cardRadius}"
            fill="url(#glassPanel)" stroke="${THEME.colors.borderLavenderSoft}" stroke-width="${s(1)}" />
    </g>`);

                content.push(`
    <rect x="${paddingX}" y="${cardY}" width="${cardWidth}" height="${imageHeight}" fill="url(#${fallbackGradientId})"
          clip-path="url(#${clipId})" />`);

                if (imageData) {
                    content.push(`
    <image x="${paddingX}" y="${cardY}" width="${cardWidth}" height="${imageHeight}" href="${imageData}"
           preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />`);
                }

                if (!imageData && showMissingImageIcon) {
                    const placeholderKind: PlaceholderIconKind = item.typeKey === 'munch'
                        ? 'munch'
                        : item.typeKey === 'play_party'
                            ? 'party'
                            : 'event';
                    const typeIconCenterX = paddingX + cardWidth / 2;
                    const typeIconCenterY = cardY + imageHeight / 2;
                    content.push(`
    <circle cx="${typeIconCenterX}" cy="${typeIconCenterY}" r="${typeIconBubbleSize / 2}"
            fill="${THEME.colors.surfaceMutedAlt}" stroke="${THEME.colors.borderMutedLight}" stroke-width="${typeIconBorder}" />`);
                    content.push(buildPlaceholderIconSvg({
                        kind: placeholderKind,
                        centerX: typeIconCenterX,
                        centerY: typeIconCenterY,
                        size: typeIconSize,
                        stroke: THEME.colors.textSlate,
                        strokeWidth: typeIconStroke,
                    }));
                }

                let textY = detailsY + detailsPaddingTop;
                if (hasOrganizer) {
                    content.push(`
    <text x="${paddingX + detailsPaddingX}" y="${textY}" font-size="${organizerFont}" font-family="${fontBody}"
          fill="${THEME.colors.textMuted}" dominant-baseline="hanging">${escapeXml(organizerText)}</text>`);
                    textY += organizerLineHeight + organizerMarginBottom;
                }

                textY += titleMarginTop;
                titleLines.forEach((line) => {
                    content.push(`
    <text x="${paddingX + detailsPaddingX}" y="${textY}" font-size="${titleFont}" font-family="${fontDisplay}"
          font-weight="700" fill="${THEME.colors.textDeep}" dominant-baseline="hanging">${escapeXml(line)}</text>`);
                    textY += titleLine;
                });

                if (hasMeta) {
                    textY += metaMarginTop;
                    content.push(`
    <text x="${paddingX + detailsPaddingX}" y="${textY}" font-size="${metaFont}" font-family="${fontBody}"
          fill="${THEME.colors.textSlate}" dominant-baseline="hanging">${escapeXml(metaLine)}</text>`);
                    textY += metaLineHeight;
                }

                const actionButtonX = paddingX + cardWidth - actionButtonRight - actionButtonWidth;
                const actionButtonY = detailsY + detailsHeight - detailsPaddingBottom - actionButtonInset - actionButtonSize;
                const actionButtonCenterY = actionButtonY + actionButtonSize / 2;
                const actionButtonContentX = actionButtonX + actionButtonContentOffsetX;
                const actionButtonIconCenterX = actionButtonContentX + actionButtonIconSize / 2;
                const actionButtonIconHalf = actionButtonIconSize / 2;
                const actionButtonTextX = actionButtonContentX + actionButtonIconSize + actionButtonGap;
                const actionButtonTextY = actionButtonCenterY;

                content.push(`
    <g filter="url(#iconShadow)">
      <rect x="${actionButtonX}" y="${actionButtonY}" width="${actionButtonWidth}" height="${actionButtonSize}"
            rx="${actionButtonRadius}" ry="${actionButtonRadius}" fill="${THEME.colors.surfaceWhiteFrosted}"
            stroke="${THEME.colors.brandPink}" stroke-width="${actionButtonStroke}" />
    </g>
    <line x1="${actionButtonIconCenterX - actionButtonIconHalf}" y1="${actionButtonCenterY}"
          x2="${actionButtonIconCenterX + actionButtonIconHalf}" y2="${actionButtonCenterY}"
          stroke="${THEME.colors.brandPink}" stroke-width="${actionButtonIconStroke}" stroke-linecap="round" />
    <line x1="${actionButtonIconCenterX}" y1="${actionButtonCenterY - actionButtonIconHalf}"
          x2="${actionButtonIconCenterX}" y2="${actionButtonCenterY + actionButtonIconHalf}"
          stroke="${THEME.colors.brandPink}" stroke-width="${actionButtonIconStroke}" stroke-linecap="round" />
    <text x="${actionButtonTextX}" y="${actionButtonTextY}" font-size="${actionButtonFont}" font-family="${fontBody}"
          font-weight="700" fill="${THEME.colors.brandPink}" dominant-baseline="middle">${actionButtonLabel}</text>`);

                if (item.typeTagLabel) {
                    const maxTagChars = estimateMaxChars(cardWidth - typeTagPaddingX * 2, typeTagFont, 0.6);
                    const tagText = truncateText(item.typeTagLabel, maxTagChars);
                    const tagTextWidth = estimateTextWidth(tagText, typeTagFont, 0);
                    const tagWidth = tagTextWidth + typeTagPaddingX * 2;
                    const tagHeight = typeTagFont + typeTagPaddingY * 2;
                    const tagX = paddingX + cardWidth - tagWidth;
                    const tagY = cardY;
                    const tagRadius = Math.min(typeTagRadius, tagHeight, tagWidth);
                    const tagRight = tagX + tagWidth;
                    const tagBottom = tagY + tagHeight;
                    const tagPath = [
                        `M ${tagX} ${tagY}`,
                        `H ${tagRight - tagRadius}`,
                        `A ${tagRadius} ${tagRadius} 0 0 1 ${tagRight} ${tagY + tagRadius}`,
                        `V ${tagBottom}`,
                        `H ${tagX}`,
                        'Z',
                    ].join(' ');
                    content.push(`
    <path d="${tagPath}" fill="${item.typeTagColors.background}" stroke="${item.typeTagColors.border}" stroke-width="${s(1)}" />
    <text x="${tagX + tagWidth / 2}" y="${tagY + tagHeight / 2}" font-size="${typeTagFont}" font-family="${fontBody}"
          font-weight="700" fill="${item.typeTagColors.text}" dominant-baseline="middle" text-anchor="middle">${escapeXml(tagText)}</text>`);
                }

                if (item.promoCodeDiscount) {
                    const discountText = sanitizeText(item.promoCodeDiscount);
                    const textWidthEstimate = discountText.length * discountFont * 0.6;
                    const bubbleWidth = textWidthEstimate + discountPaddingX * 2;
                    const bubbleHeight = discountFont + discountPaddingY * 2;
                    const bubbleX = paddingX + discountOffset;
                    const bubbleY = cardY + discountOffset;
                    const bubbleRight = bubbleX + bubbleWidth;
                    const bubbleBottom = bubbleY + bubbleHeight;
                    const topRadius = Math.min(discountRadius, bubbleHeight, bubbleWidth / 2);
                    const bottomRadius = Math.min(bubbleHeight / 2, bubbleWidth / 2);
                    const bubblePath = [
                        `M ${bubbleX + topRadius} ${bubbleY}`,
                        `H ${bubbleRight}`,
                        `V ${bubbleBottom - bottomRadius}`,
                        `A ${bottomRadius} ${bottomRadius} 0 0 1 ${bubbleRight - bottomRadius} ${bubbleBottom}`,
                        `H ${bubbleX}`,
                        `V ${bubbleY + topRadius}`,
                        `A ${topRadius} ${topRadius} 0 0 1 ${bubbleX + topRadius} ${bubbleY}`,
                        'Z',
                    ].join(' ');
                    content.push(`
    <g filter="url(#discountShadow)">
      <path d="${bubblePath}" fill="${THEME.colors.discountBadge}" />
    </g>
    <text x="${bubbleX + bubbleWidth / 2}" y="${bubbleY + bubbleHeight / 2}"
          font-size="${discountFont}" font-family="${fontBody}" font-weight="700" fill="${THEME.colors.black}"
          dominant-baseline="middle" text-anchor="middle">${escapeXml(discountText)}</text>`);
                }

                y += cardHeight + cardMarginBottom;
            });

            y += daySectionMarginBottom;
            dayLayouts.push({ dateKey: day.dateKey, startY: dayStartY, endY: y });
        });
    }

    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${finalHeight}" viewBox="0 0 ${width} ${finalHeight}">
    <defs>
      ${defs.join('\n')}
    </defs>
    ${content.join('\n')}
  </svg>`;
    return { svg, height: finalHeight, dayLayouts };
};

const selectSplitAt = (totalHeight: number, dayLayouts: DayLayout[]) => {
    const target = totalHeight / 2;
    const candidates = dayLayouts.slice(1).map((layout) => Math.round(layout.startY));
    if (candidates.length === 0) {
        return { splitAt: Math.round(totalHeight / 2), usedFallback: true };
    }
    let best = candidates[0];
    let bestDiff = Math.abs(best - target);
    for (let i = 1; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        const diff = Math.abs(candidate - target);
        if (diff < bestDiff) {
            best = candidate;
            bestDiff = diff;
        }
    }
    return { splitAt: best, usedFallback: false };
};

const fetchWeeklyPickEvents = async (rangeStart: moment.Moment, rangeEnd: moment.Moment) => {
    const { data, error } = await supabaseClient
        .from('events')
        .select(`
            id,
            name,
            start_date,
            end_date,
            image_url,
            short_description,
            short_price,
            weekly_pick,
            type,
            is_munch,
            play_party,
            approval_status,
            facilitator_only,
            non_ny,
            location,
            city,
            region,
            neighborhood,
            tags,
            location_area:location_areas(
                name
            ),
            classification:classifications(
                tags
            ),
            organizer:organizers(
                id,
                name,
                hidden,
                promo_codes(
                    discount,
                    discount_type,
                    scope
                )
            ),
            promo_code_event(
                promo_codes(
                    discount,
                    discount_type,
                    scope
                )
            )
        `)
        .eq('weekly_pick', true)
        .eq('hidden', false)
        .eq('visibility', 'public')
        .gte('start_date', rangeStart.toISOString())
        .lte('start_date', rangeEnd.toISOString())
        .order('start_date', { ascending: true });

    if (error) {
        throw new Error(`Supabase error: ${error.message}`);
    }

    const rows = (data || []) as WeeklyPickEventRow[];
    return rows.filter((event) => {
        const approval = event.approval_status ?? null;
        if (approval && approval !== 'approved') return false;
        if (event.organizer?.hidden) return false;
        if (event.facilitator_only) return false;
        if (event.non_ny) return false;
        return true;
    });
};

export const generateWeeklyPicksImage = async (
    options: WeeklyPicksImageOptions = {}
): Promise<WeeklyPicksImageResult> => {
    const logPrefix = '[weekly-picks]';
    const requestedOffset = Number.isFinite(options.weekOffset)
        ? Number(options.weekOffset)
        : 0;
    const partCount = normalizePartCount(options.partCount);
    const requestedScale = Number.isFinite(options.scale) ? Number(options.scale) : undefined;
    const requestedWidth = Number.isFinite(options.width) ? Number(options.width) : undefined;
    const scale = requestedScale && requestedScale > 0
        ? requestedScale
        : requestedWidth && requestedWidth > 0
            ? requestedWidth / BASE_WIDTH
            : 3;
    const width = requestedWidth && requestedWidth > 0
        ? Math.round(requestedWidth)
        : Math.round(BASE_WIDTH * scale);

    console.log(
        `${logPrefix} Start generation weekOffset=${requestedOffset} width=${width} scale=${scale.toFixed(2)} limit=${options.limit ?? 'none'} parts=${partCount}`
    );

    const now = moment().tz(TZ);
    const baseStart = now.clone().startOf('isoWeek');
    const weekStarts = [0, 1, 2].map((offset) => baseStart.clone().add(offset, 'weeks'));
    const rangeStart = weekStarts[0].clone().startOf('day');
    const rangeEnd = weekStarts[2].clone().add(6, 'days').endOf('day');

    const fetchEventsStart = Date.now();
    const events = await fetchWeeklyPickEvents(rangeStart, rangeEnd);
    const fetchEventsMs = Date.now() - fetchEventsStart;
    console.log(
        `${logPrefix} Loaded ${events.length} events for range ${rangeStart.format('YYYY-MM-DD')}..${rangeEnd.format('YYYY-MM-DD')} in ${fetchEventsMs}ms`
    );

    const weekBuckets = new Map<string, WeeklyPickEventRow[]>();
    weekStarts.forEach((start) => weekBuckets.set(start.format('YYYY-MM-DD'), []));

    events.forEach((event) => {
        if (!event.start_date) return;
        const eventDate = moment.tz(event.start_date, TZ);
        const weekKey = eventDate.clone().startOf('isoWeek').format('YYYY-MM-DD');
        const bucket = weekBuckets.get(weekKey);
        if (bucket) bucket.push(event);
    });

    const visibleWeekOffsets = weekStarts
        .map((start, idx) => ({ idx, key: start.format('YYYY-MM-DD') }))
        .filter(({ key }) => (weekBuckets.get(key) || []).length > 0)
        .map(({ idx }) => idx);

    const selectedOffset = visibleWeekOffsets.includes(requestedOffset)
        ? requestedOffset
        : (visibleWeekOffsets[0] ?? 0);

    const selectedWeekStart = weekStarts[selectedOffset];
    const weekLabel = getWeekRangeLabel(selectedWeekStart);

    const selectedKey = selectedWeekStart.format('YYYY-MM-DD');
    const selectedEvents = (weekBuckets.get(selectedKey) || [])
        .filter((event) => {
            if (!event.start_date) return false;
            return moment.tz(event.start_date, TZ).isValid();
        })
        .sort((a, b) => {
            const aTime = new Date(a.start_date ?? '').getTime();
            const bTime = new Date(b.start_date ?? '').getTime();
            return aTime - bTime;
        })
        .slice(0, options.limit && options.limit > 0 ? options.limit : undefined);
    console.log(`${logPrefix} Selected ${selectedEvents.length} events for week ${weekLabel}`);

    const items: WeeklyPickItem[] = selectedEvents.map((event) => {
        const eventDate = moment.tz(event.start_date ?? '', TZ);
        return {
            dateKey: eventDate.format('YYYY-MM-DD'),
            dayOfWeek: eventDate.format('ddd'),
            dateLabel: eventDate.format('MMM D'),
            title: event.name ?? '',
            organizer: event.organizer?.name ?? '',
            image: event.image_url ?? '',
            promoCodeDiscount: resolvePromoDiscount(event),
            eventId: event.id,
            typeKey: resolveTypeKey(event),
            timeLabel: formatPrimaryMetaLabel(event),
            locationLabel: formatLocationLabel(event),
            priceLabel: formatPriceLabel(event),
            ...resolveTypeTagInfo(event),
        };
    });

    const grouped = items.reduce<Record<string, WeeklyPickItem[]>>((acc, item) => {
        (acc[item.dateKey] = acc[item.dateKey] || []).push(item);
        return acc;
    }, {});

    const days = Object.keys(grouped)
        .sort()
        .map((dateKey) => {
            const dayItems = grouped[dateKey];
            return {
                dateKey,
                dayLabel: dayItems[0]?.dayOfWeek ?? '',
                dateLabel: dayItems[0]?.dateLabel ?? '',
                items: dayItems,
            };
        });

    const cardWidth = Math.round(width - 2 * (16 * scale));
    const detailsPanelHeight = Math.round(DETAILS_PANEL_HEIGHT * scale);
    const imageHeight = Math.round(cardWidth / 2);
    const cardHeight = imageHeight + detailsPanelHeight;

    const imagesById = new Map<number, string | null>();
    const totalImages = items.length;
    if (totalImages === 0) {
        console.log(`${logPrefix} No images to fetch`);
    } else {
        console.log(`${logPrefix} Fetching ${totalImages} event images`);
    }
    let completedImages = 0;
    const progressStep = totalImages <= 5 ? 1 : Math.max(1, Math.floor(totalImages / 4));
    const imageFetchStart = Date.now();
    await Promise.all(
        items.map(async (item, index) => {
            const dataUri = await fetchImageDataUri(item.image, cardWidth, imageHeight, {
                eventId: item.eventId,
                index: index + 1,
                total: totalImages,
            });
            imagesById.set(item.eventId, dataUri);
            completedImages += 1;
            if (
                completedImages === totalImages ||
                (progressStep > 0 && completedImages % progressStep === 0)
            ) {
                console.log(`${logPrefix} Image fetch ${completedImages}/${totalImages}`);
            }
        })
    );
    const imageFetchMs = Date.now() - imageFetchStart;
    console.log(`${logPrefix} Image fetch total ${imageFetchMs}ms`);

    console.log(`${logPrefix} Rendering SVG`);
    const renderSvgStart = Date.now();
    const { svg, height: renderedHeight, dayLayouts } = buildSvg({
        width,
        height: Math.round(844 * scale),
        scale,
        weekLabel,
        isFirstWeek: visibleWeekOffsets.length > 0 && selectedOffset === visibleWeekOffsets[0],
        isLastWeek:
            visibleWeekOffsets.length > 0 &&
            selectedOffset === visibleWeekOffsets[visibleWeekOffsets.length - 1],
        days,
        imagesById,
    });
    const renderSvgMs = Date.now() - renderSvgStart;
    console.log(`${logPrefix} SVG rendered height=${renderedHeight} in ${renderSvgMs}ms`);

    console.log(`${logPrefix} Rasterizing PNG`);
    const rasterStart = Date.now();
    const png = await sharp(Buffer.from(svg))
        .png({ compressionLevel: 1, adaptiveFiltering: false })
        .toBuffer();
    const rasterMs = Date.now() - rasterStart;
    console.log(`${logPrefix} PNG ready (${png.length} bytes) in ${rasterMs}ms`);

    if (partCount === 1) {
        const jpg = await sharp(png)
            .jpeg({ quality: 90 })
            .toBuffer();
        return {
            png,
            parts: [
                {
                    jpg,
                    height: renderedHeight,
                },
            ],
            splitAt: renderedHeight,
            width,
            height: renderedHeight,
            weekOffset: selectedOffset,
            weekLabel,
        };
    }

    const { splitAt, usedFallback } = selectSplitAt(renderedHeight, dayLayouts);
    if (usedFallback) {
        console.log(`${logPrefix} Split fallback at y=${splitAt}`);
    }
    const clampedSplitAt = Math.min(Math.max(1, Math.round(splitAt)), renderedHeight - 1);
    const topHeight = clampedSplitAt;
    const bottomHeight = renderedHeight - clampedSplitAt;
    const [topJpg, bottomJpg] = await Promise.all([
        sharp(png)
            .extract({ left: 0, top: 0, width, height: topHeight })
            .jpeg({ quality: 90 })
            .toBuffer(),
        sharp(png)
            .extract({ left: 0, top: clampedSplitAt, width, height: bottomHeight })
            .jpeg({ quality: 90 })
            .toBuffer(),
    ]);
    const parts: WeeklyPicksImagePart[] = [
        {
            jpg: topJpg,
            height: topHeight,
        },
        {
            jpg: bottomJpg,
            height: bottomHeight,
        },
    ];

    return {
        png,
        parts,
        splitAt: clampedSplitAt,
        width,
        height: renderedHeight,
        weekOffset: selectedOffset,
        weekLabel,
    };
};

export type { WeeklyPicksImageOptions, WeeklyPicksImageResult };
