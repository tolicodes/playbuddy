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
    textPrimary: DARK_GRAY,
    textSecondary: MEDIUM_GRAY,
    textMuted: '#555555',
    textSubtle: '#B0B0B0',
    textSlate: '#6B7280',
    textDeep: '#2C2C34',
    textLavenderMuted: '#9B90B9',
    textBrown: '#4E342E',
    textDisabled: LIGHT_GRAY,
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
    surfaceMuted: '#F6F7F9',
    surfaceSubtle: '#F2F4F7',
    surfaceRose: '#FFF5F6',
    surfaceRoseSoft: '#FFF1F2',
    surfaceLavenderLight: '#F7F5FF',
    surfaceLavender: '#F0ECFF',
    surfaceLavenderAlt: '#F3EEFF',
    surfaceLavenderStrong: '#E7DEFF',
    surfaceLavenderWarm: '#F4E1FF',
    surfaceMutedAlt: '#ECECF3',
    surfaceMutedLight: '#F6F4FA',
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
    danger: '#FF3B30',
    brandPink: '#FF2675',
    brandGlowTop: 'rgba(255,255,255,0.18)',
    brandGlowBottom: 'rgba(255,186,214,0.2)',
    brandGlowMid: 'rgba(255,193,230,0.2)',
    brandGlowWarm: 'rgba(255,188,143,0.2)',
    brandText: '#2C1A4A',
    brandTextMuted: '#7D6D9F',
    surfaceSoft: '#F8F5FF',
    badgeBackground: 'rgba(107,70,193,0.12)',
    badgeBorder: 'rgba(107,70,193,0.2)',
    badgeVetted: '#4CAF50',
    badgePlayParty: '#8F00FF',
    badgeMunch: '#FFC107',
    badgeTag: '#66BB6A',
    badgeAlert: '#EF4444',
    overlay: 'rgba(0, 0, 0, 0.35)',
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
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    sheet: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: -4 },
        shadowRadius: 12,
        elevation: 12,
    },
    brandCard: {
        shadowColor: '#2b145a',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
        elevation: 6,
    },
    button: {
        shadowColor: '#2b145a',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        elevation: 4,
    },
};

export const gradients = {
    welcome: ['#4A117D', '#7C2DD6', '#FF73A8', '#FFC089'] as const,
    auth: ['#2C0B63', '#5B1FB8', '#D65CCE'] as const,
    access: ['#5B1FB8', '#8E2ACB', '#C04FD4'] as const,
    primaryButton: ['#6B46C1', '#8E3BD9'] as const,
};

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
    separator: { height: 1, backgroundColor: '#EEE', marginVertical: spacing.sm },

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
    locationText: { color: '#555', marginLeft: 6 },
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
    emptyText: { color: '#000', fontSize: fontSizes.xl },

    paddedHorizontalMedium: { paddingHorizontal: spacing.lg },
});
