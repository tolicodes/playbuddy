import { Platform, StyleSheet } from 'react-native';

export const LAVENDER_BACKGROUND = '#F3EBFF';          // Main screen background
export const ACCENT_PURPLE = '#9C6ADE';                // Primary action & selected states
export const HEADER_PURPLE = '#7E5BEF';
export const WHITE = '#FFFFFF';                         // Cards and selected text
export const DARK_GRAY = '#333333';                     // Primary unselected text
export const MEDIUM_GRAY = '#888888';                   // Secondary text, empty states
export const LIGHT_GRAY = '#CCCCCC';                    // Disabled titles
export const DISABLED_GRAY = '#D9D9D9';                 // Disabled dots & arrows
export const BORDER_LAVENDER = '#EAE0F8';               // Card borders

export const HORIZONTAL_PADDING = 16;

export const colors = {
    lavenderBackground: LAVENDER_BACKGROUND,
    accentPurple: ACCENT_PURPLE,
    headerPurple: HEADER_PURPLE,
    white: WHITE,
    black: '#111111',
    textPrimary: DARK_GRAY,
    textSecondary: MEDIUM_GRAY,
    textMuted: '#555555',
    textSubtle: '#B0B0B0',
    textSlate: '#6B7280',
    textDeep: '#2C2C34',
    textLavenderMuted: '#9B90B9',
    textBrown: '#4E342E',
    textDisabled: LIGHT_GRAY,
    textOnDarkStrong: 'rgba(255,255,255,0.9)',
    textOnDarkMuted: 'rgba(255,255,255,0.8)',
    textOnDarkSubtle: 'rgba(255,255,255,0.5)',
    textNight: '#E2E8F0',
    textNightMuted: '#CBD5E1',
    textNightSubtle: '#94A3B8',
    textGold: '#B08A00',
    textGoldMuted: '#8A6D2F',
    iconMuted: '#9CA3AF',
    disabled: DISABLED_GRAY,
    borderLavender: BORDER_LAVENDER,
    borderLight: '#E9E9E9',
    borderSubtle: '#F0F0F0',
    borderLavenderSoft: '#E6E0F5',
    borderLavenderStrong: '#E1DAF7',
    borderLavenderAlt: '#E2D9FF',
    borderLavenderActive: '#CFC2FF',
    borderMutedAlt: '#E0E0EA',
    borderMutedLight: '#E2E0EA',
    borderMutedDark: '#DCDCE6',
    borderRose: '#F2B8C0',
    borderGoldSoft: '#F1E2C6',
    borderGoldLight: '#F3E6CF',
    borderOnDarkSoft: 'rgba(255,255,255,0.2)',
    borderOnDark: 'rgba(255,255,255,0.35)',
    borderOnDarkMedium: 'rgba(255,255,255,0.55)',
    borderOnDarkStrong: 'rgba(255,255,255,0.8)',
    borderOnDarkBright: 'rgba(255,255,255,0.85)',
    borderNight: 'rgba(255,255,255,0.08)',
    borderNightMuted: 'rgba(148, 163, 184, 0.4)',
    surfaceMuted: '#F6F7F9',
    surfaceSubtle: '#F2F4F7',
    surfaceRose: '#FFF5F6',
    surfaceRoseSoft: '#FFF1F2',
    surfaceWarning: '#FFF9E8',
    surfaceInfo: '#F3F7FF',
    surfaceInfoStrong: '#DCE5FF',
    surfaceGoldLight: '#FFFAF0',
    surfaceGoldMuted: '#F7EFE1',
    surfaceGoldWarm: '#FFF8D6',
    surfaceLavenderLight: '#F7F5FF',
    surfaceLavender: '#F0ECFF',
    surfaceLavenderAlt: '#F3EEFF',
    surfaceLavenderStrong: '#E7DEFF',
    surfaceLavenderWarm: '#F4E1FF',
    surfaceMutedAlt: '#ECECF3',
    surfaceMutedLight: '#F6F4FA',
    surfaceNight: '#0F172A',
    surfaceNightOverlay: 'rgba(15, 23, 42, 0.8)',
    brandDeep: '#2C0B63',
    brandMid: '#5B1FB8',
    brandBright: '#6B46C1',
    brandPurpleDark: '#5A43B5',
    brandPurple: '#4B2ABF',
    brandInk: '#3B2F74',
    brandIndigo: '#6B57D0',
    brandMuted: '#9A8ED8',
    brandBlue: '#1976D2',
    brandViolet: '#6A1B9A',
    brandLavender: '#7055D3',
    brandPlum: '#2D005F',
    brandMagenta: '#9C27B0',
    heroDark: '#1F1B2E',
    heroDarkMuted: '#2A2438',
    gold: '#FFD700',
    borderAccent: '#C9B8FF',
    borderMuted: '#DADAE6',
    success: '#2E7D32',
    successBright: '#34C759',
    warning: '#D97706',
    danger: '#FF3B30',
    brandPink: '#FF2675',
    brandGlowTop: 'rgba(255,255,255,0.18)',
    brandGlowBottom: 'rgba(255,186,214,0.2)',
    brandGlowMid: 'rgba(255,193,230,0.2)',
    brandGlowWarm: 'rgba(255,188,143,0.2)',
    brandText: '#2C1A4A',
    brandTextMuted: '#7D6D9F',
    accentPurpleSoft: 'rgba(156,106,222,0.7)',
    accentSky: '#38BDF8',
    accentSkySoft: 'rgba(56, 189, 248, 0.12)',
    accentSkyDeep: '#0EA5E9',
    accentOrange: '#F97316',
    accentOrangeSoft: 'rgba(249, 115, 22, 0.12)',
    accentBlue: '#3B82F6',
    accentBlueSoft: 'rgba(59, 130, 246, 0.06)',
    accentBlueBorder: 'rgba(59, 130, 246, 0.25)',
    accentBlueLight: '#93C5FD',
    accentGreen: '#16A34A',
    accentElectric: '#6200EE',
    surfaceSoft: '#F8F5FF',
    surfaceWhiteSoft: 'rgba(255, 255, 255, 0.7)',
    surfaceWhiteStrong: 'rgba(255,255,255,0.8)',
    surfaceWhiteFrosted: 'rgba(255,255,255,0.92)',
    surfaceWhiteOpaque: 'rgba(255,255,255,0.96)',
    surfaceLavenderOpaque: 'rgba(247,242,255,0.96)',
    surfaceGlassSubtle: 'rgba(255,255,255,0.12)',
    surfaceGlass: 'rgba(255,255,255,0.18)',
    surfaceGlassStrong: 'rgba(255,255,255,0.28)',
    tintVioletSoft: 'rgba(106,27,154,0.10)',
    tintViolet: 'rgba(106,27,154,0.12)',
    tintWarning: 'rgba(255,176,0,0.25)',
    tintInfo: 'rgba(36,112,255,0.18)',
    badgeBackground: 'rgba(107,70,193,0.12)',
    badgeBorder: 'rgba(107,70,193,0.2)',
    badgeVetted: '#4CAF50',
    badgePlayParty: '#8F00FF',
    badgeMunch: '#FFC107',
    badgeTag: '#66BB6A',
    badgeAlert: '#EF4444',
    badgeSlate: '#455A64',
    badgeLocation: '#00796B',
    badgeAudience: '#F57C00',
    overlay: 'rgba(0, 0, 0, 0.35)',
    overlaySoft: 'rgba(0,0,0,0.05)',
    overlayLight: 'rgba(0,0,0,0.15)',
    overlayMedium: 'rgba(0,0,0,0.3)',
    overlayStrong: 'rgba(0, 0, 0, 0.5)',
    overlayHeavy: 'rgba(0,0,0,0.6)',
    overlayDeep: 'rgba(0,0,0,0.75)',
    overlayHero: 'rgba(0,0,0,0.68)',
    overlayNone: 'rgba(0,0,0,0.0)',
    backdropNight: 'rgba(8, 7, 20, 0.7)',
    shadowPlum: '#2b145a',
    shadowSoft: 'rgba(0, 0, 0, 0.06)',
    shadowLight: 'rgba(0, 0, 0, 0.15)',
    shadowMedium: 'rgba(0, 0, 0, 0.25)',
    linkBlue: '#007AFF',
    linkAccent: '#4A6EE0',
    promoBackground: '#F5ECFF',
    promoCircleA: '#F2E5FF',
    promoCircleB: '#E2D4FF',
    promoCircleC: '#F7EDFF',
    promoCodeBox: '#EEE1FF',
    promoCodeInner: '#EDE1FF',
    promoSurface: '#FDF6E3',
    promoBorder: '#E2C200',
};

export const spacing = {
    xxs: 2,
    xs: 4,
    xsPlus: 6,
    sm: 8,
    smPlus: 10,
    md: 12,
    mdPlus: 14,
    lg: 16,
    lgPlus: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    jumbo: 40,
};

export const radius = {
    xxs: 4,
    xs: 6,
    sm: 8,
    smPlus: 10,
    mdPlus: 14,
    md: 12,
    lg: 16,
    lgPlus: 18,
    xl: 20,
    xxl: 22,
    hero: 24,
    pill: 999,
};

export const sizes = {
    controlHeight: 44,
    avatarSm: 40,
    avatarLg: 100,
    socialIcon: 30,
};

export const fontFamilies = {
    display: Platform.select({
        ios: 'AvenirNext-DemiBold',
        android: 'sans-serif-condensed',
        default: 'System',
    }),
    body: Platform.select({
        ios: 'AvenirNext-Regular',
        android: 'sans-serif-light',
        default: 'System',
    }),
};

export const fontSizes = {
    xxs: 10,
    xs: 11,
    xsPlus: 11.5,
    sm: 12,
    smPlus: 13,
    base: 14,
    basePlus: 14.5,
    lg: 15,
    xl: 16,
    xxl: 18,
    xxxl: 20,
    title: 22,
    headline: 24,
    display: 28,
    displayLg: 35,
};

export const lineHeights = {
    sm: 16,
    md: 20,
    lg: 22,
    xl: 24,
};

export const typography = {
    display: {
        fontSize: fontSizes.display,
        fontWeight: '700' as const,
        fontFamily: fontFamilies.display,
        letterSpacing: 0.5,
    },
    displayLg: {
        fontSize: fontSizes.displayLg,
        fontWeight: '600' as const,
        fontFamily: fontFamilies.display,
    },
    title: {
        fontSize: fontSizes.title,
        fontWeight: '700' as const,
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        fontSize: fontSizes.xl,
        fontWeight: '600' as const,
        fontFamily: fontFamilies.body,
    },
    body: {
        fontSize: fontSizes.lg,
        fontWeight: '400' as const,
        fontFamily: fontFamilies.body,
        lineHeight: lineHeights.md,
    },
    bodyStrong: {
        fontSize: fontSizes.lg,
        fontWeight: '600' as const,
        fontFamily: fontFamilies.body,
        lineHeight: lineHeights.md,
    },
    label: {
        fontSize: fontSizes.smPlus,
        fontWeight: '600' as const,
        fontFamily: fontFamilies.body,
    },
    caption: {
        fontSize: fontSizes.sm,
        fontWeight: '600' as const,
        fontFamily: fontFamilies.body,
        letterSpacing: 0.4,
    },
    overline: {
        fontSize: fontSizes.sm,
        fontWeight: '600' as const,
        fontFamily: fontFamilies.body,
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
    },
};

export const shadows = {
    card: {
        shadowColor: colors.black,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    sheet: {
        shadowColor: colors.black,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: -4 },
        shadowRadius: 12,
        elevation: 12,
    },
    brandCard: {
        shadowColor: colors.shadowPlum,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
        elevation: 6,
    },
    button: {
        shadowColor: colors.shadowPlum,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        elevation: 4,
    },
};

export const gradients = {
    welcome: ['#5A1D8A', '#7E39C8', '#F38AB2', '#FFC7A1'] as const,
    auth: ['#2C0B63', '#5B1FB8', '#D65CCE'] as const,
    access: ['#5B1FB8', '#8E2ACB', '#C04FD4'] as const,
    primaryButton: ['#6B46C1', '#8E3BD9'] as const,
    nav: ['#7C3BD6', '#C248CE', '#FF5293'] as const,
    communityOrganizer: ['#F1ECFF', '#D7CCFF'] as const,
    communityNeutral: ['#E5E7EB', '#C7CBD6'] as const,
};

export const eventListThemes = {
    welcome: {
        colors: gradients.welcome,
        locations: [0, 0.45, 0.78, 1],
        glows: [colors.brandGlowTop, colors.brandGlowMid, colors.brandGlowWarm],
        blend: 'rgba(74,17,125,0.22)',
    },
    aurora: {
        colors: ['rgba(122,74,215,0.22)', '#F7F2FF', '#FCEAF2', '#FFF1D6'],
        locations: [0, 0.2, 0.62, 1],
        glows: ['rgba(128,90,255,0.16)', 'rgba(255,120,180,0.14)', 'rgba(255,210,140,0.18)'],
        blend: 'rgba(122,74,215,0.2)',
    },
    velvet: {
        colors: ['rgba(98,68,190,0.2)', '#F0EBFF', '#EFE6FF', '#F7EAF8'],
        locations: [0, 0.22, 0.58, 1],
        glows: ['rgba(90,67,181,0.16)', 'rgba(144,97,255,0.14)', 'rgba(255,162,210,0.14)'],
        blend: 'rgba(98,68,190,0.18)',
    },
    citrus: {
        colors: ['rgba(255,178,102,0.18)', '#FFF3E2', '#FFE7F1', '#F3F2FF'],
        locations: [0, 0.24, 0.6, 1],
        glows: ['rgba(255,186,128,0.18)', 'rgba(255,124,146,0.14)', 'rgba(120,150,255,0.12)'],
        blend: 'rgba(255,178,102,0.16)',
    },
};

export const calendarTagTones = {
    spiritual: { background: '#FFF4E6', text: '#B45309', border: '#FFD7A8' },
    social: { background: '#E9FBF3', text: '#1F8A5B', border: '#BDEDD8' },
    skill: { background: '#EEF5FF', text: '#2B5AD7', border: '#CFE0FF' },
    scene: { background: '#F6EEFF', text: '#6B35C6', border: '#DEC8FF' },
    default: { background: '#F5F1FF', text: '#4B2ABF', border: '#E3DBFF' },
};

export const calendarTypeChips = {
    'play party': { background: '#EFE9FF', text: '#5A43B5', border: '#DED7FF' },
    'munch': { background: '#FFE2B6', text: '#8A5200', border: '#F1C07A' },
    'retreat': { background: '#EAF6EE', text: '#2E6B4D', border: '#D6EBDC' },
    'festival': { background: '#E8F1FF', text: '#2F5DA8', border: '#D6E4FB' },
    'workshop': { background: '#FDEBEC', text: '#9A3D42', border: '#F6D7DA' },
    'performance': { background: '#F1E9FF', text: '#5D3FA3', border: '#E2D6FB' },
    'discussion': { background: '#E8F5F8', text: '#2D5E6F', border: '#D3E7EE' },
    'rope': { background: '#E8F5F8', text: '#2D5E6F', border: '#D3E7EE' },
    'vetted': { background: '#E9F8EF', text: '#2F6E4A', border: '#D7F0E1' },
};

export const calendarOrganizerTone = {
    background: '#E8F1FF',
    text: '#2F5DA8',
    border: '#D6E4FB',
};

export const calendarExperienceTone = {
    background: '#E7F0FF',
    text: '#2F5DA8',
    border: '#D6E4FB',
};

export const calendarInteractivityTones = {
    social: { background: '#E9FBF3', text: '#1F8A5B', border: '#BDEDD8' },
    discussion: { background: '#E8F5F8', text: '#2D5E6F', border: '#D3E7EE' },
    intimate: { background: '#FFE9F1', text: '#A6456A', border: '#F6CADB' },
    sensual: { background: '#FDEBEC', text: '#9A3D42', border: '#F6D7DA' },
    erotic: { background: '#FDE3E3', text: '#B42318', border: '#F3C8C8' },
    sexual: { background: '#FEE2E2', text: '#B42318', border: '#F6C9C9' },
    extreme: { background: '#FEE2E2', text: '#B42318', border: '#F6C9C9' },
    hands_on: { background: '#E7F9F6', text: '#197769', border: '#CFEFE9' },
    performance: { background: '#F1E9FF', text: '#5D3FA3', border: '#E2D6FB' },
    observational: { background: '#EEF2FF', text: '#4C55A6', border: '#D9DEFF' },
};

export const calendarOrganizerPalette = [
    '#7986CB', '#33B679', '#8E24AA', '#E67C73', '#F6BF26', '#F4511E', '#039BE5', '#616161',
    '#3F51B5', '#0B8043', '#D50000', '#F09300', '#F6BF26', '#33B679', '#0B8043', '#E4C441',
    '#FF7043', '#795548', '#8D6E63', '#9E9E9E'
] as const;

/**
 * Common shared styles for PlayBuddy React Native app
 */
export const commonStyles = StyleSheet.create({
    // Layout
    container: { flex: 1, backgroundColor: colors.accentPurple },
    bottomContainer: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        overflow: 'hidden',
    },

    // Separators
    separator: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: spacing.sm },

    // Tabs
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md },
    tabButton: { paddingVertical: 8 },
    tabText: { color: colors.textSecondary },
    activeTab: { borderBottomWidth: 3, borderColor: colors.accentPurple },
    activeTabText: { color: colors.accentPurple, fontWeight: '600' },

    // Scroll & Lists
    scroll: { flex: 1, paddingTop: 8 },
    list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

    // Location & Tags
    locationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    locationText: { color: colors.textMuted, marginLeft: 6 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    pill: {
        backgroundColor: colors.headerPurple,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        margin: 4,
        height: 32,
        justifyContent: 'center',
    },
    pillText: { color: colors.white, fontSize: fontSizes.base },

    // Empty States
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: colors.textPrimary, fontSize: fontSizes.xl },

    paddedHorizontalMedium: { paddingHorizontal: spacing.lg },
});
