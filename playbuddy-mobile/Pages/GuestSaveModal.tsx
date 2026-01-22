import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';

import type { NavStack } from '../Common/Nav/NavStackType';
import { navigateToAuth } from '../Common/Nav/navigationHelpers';
import { colors, fontFamilies, fontSizes, gradients, lineHeights, radius, shadows, spacing } from '../components/styles';

const logoMark = require('../assets/logo-transparent.png');
const HERO_GRADIENT = [colors.heroDark, colors.brandPlum, colors.brandPurpleDark] as const;

export type GuestSaveModalConfig = {
    title: string;
    message: string;
    ctaLabel: string;
    iconName: string;
    contextLabel: string;
    highlightTitle: string;
    highlights: string[];
};

const DEFAULT_CONFIG: GuestSaveModalConfig = {
    title: 'Create an account to save events',
    message: 'Guests can browse, but saving and syncing needs an account.',
    ctaLabel: 'Create account',
    iconName: 'bookmark',
    contextLabel: 'Guest mode',
    highlightTitle: 'With an account you can',
    highlights: [
        'Save events and sync your calendar',
        'Follow organizers and get updates',
        'Plan nights out with buddies',
    ],
};

type GuestSaveModalContextValue = {
    showGuestSaveModal: (overrides?: Partial<GuestSaveModalConfig>) => void;
};

const GuestSaveModalContext = createContext<GuestSaveModalContextValue>({
    showGuestSaveModal: () => {},
});

export const useGuestSaveModal = () => useContext(GuestSaveModalContext);

type GuestSaveModalProps = GuestSaveModalConfig & {
    visible: boolean;
    onDismiss: () => void;
    onCreateAccount: () => void;
};

export const GuestSaveModal = ({
    visible,
    onDismiss,
    onCreateAccount,
    title,
    message,
    ctaLabel,
    highlightTitle,
    highlights,
}: GuestSaveModalProps) => {
    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <LinearGradient
                        colors={HERO_GRADIENT}
                        locations={[0, 0.45, 0.78, 1]}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                        style={styles.hero}
                    >
                        <View pointerEvents="none" style={styles.heroGlowTop} />
                        <View pointerEvents="none" style={styles.heroGlowMid} />
                        <View pointerEvents="none" style={styles.heroGlowBottom} />
                        <TouchableOpacity style={styles.close} onPress={onDismiss} hitSlop={8}>
                            <Text style={styles.closeText}>X</Text>
                        </TouchableOpacity>
                        <View style={styles.logoWrap}>
                            <View pointerEvents="none" style={styles.logoGlow} />
                            <LinearGradient
                                colors={[colors.surfaceWhiteStrong, colors.surfaceGlassStrong]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.logoHalo}
                            >
                                <View style={styles.logoInner}>
                                    <Image source={logoMark} style={styles.logo} resizeMode="contain" />
                                </View>
                            </LinearGradient>
                        </View>
                    </LinearGradient>

                    <View style={styles.body}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>{message}</Text>

                        {highlights.length > 0 && (
                            <View style={styles.highlightBox}>
                                <Text style={styles.highlightLabel}>{highlightTitle}</Text>
                                {highlights.map((item, index) => (
                                    <View key={`${item}-${index}`} style={styles.bulletRow}>
                                        <View style={styles.bulletDot} />
                                        <Text style={styles.bulletText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity onPress={onCreateAccount} activeOpacity={0.85} style={styles.primaryButton}>
                                <LinearGradient
                                    colors={gradients.primaryButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.primaryButtonInner}
                                >
                                    <FontAwesome5 name="user-plus" size={16} color={colors.white} />
                                    <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onDismiss} style={styles.secondaryButton}>
                                <Text style={styles.secondaryButtonText}>Not now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export const GuestSaveModalProvider = ({ children }: { children: React.ReactNode }) => {
    const navigation = useNavigation<NavStack>();
    const [config, setConfig] = useState<GuestSaveModalConfig>(DEFAULT_CONFIG);
    const [visible, setVisible] = useState(false);

    const showGuestSaveModal = useCallback((overrides?: Partial<GuestSaveModalConfig>) => {
        setConfig({
            ...DEFAULT_CONFIG,
            ...overrides,
            highlights: overrides?.highlights ?? DEFAULT_CONFIG.highlights,
        });
        setVisible(true);
    }, []);

    const handleDismiss = useCallback(() => {
        setVisible(false);
    }, []);

    const handleCreateAccount = useCallback(() => {
        setVisible(false);
        navigateToAuth(navigation, 'Login Form');
    }, [navigation]);

    const value = useMemo(() => ({ showGuestSaveModal }), [showGuestSaveModal]);

    return (
        <GuestSaveModalContext.Provider value={value}>
            {children}
            <GuestSaveModal
                visible={visible}
                onDismiss={handleDismiss}
                onCreateAccount={handleCreateAccount}
                title={config.title}
                message={config.message}
                ctaLabel={config.ctaLabel}
                iconName={config.iconName}
                contextLabel={config.contextLabel}
                highlightTitle={config.highlightTitle}
                highlights={config.highlights}
            />
        </GuestSaveModalContext.Provider>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.backdropNight,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: colors.surfaceNight,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.borderNight,
        overflow: 'hidden',
        ...shadows.brandCard,
    },
    hero: {
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        alignItems: 'center',
    },
    heroGlowTop: {
        position: 'absolute',
        top: -60,
        right: -80,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.brandGlowTop,
    },
    heroGlowMid: {
        position: 'absolute',
        bottom: -70,
        left: -40,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: colors.brandGlowMid,
    },
    heroGlowBottom: {
        position: 'absolute',
        bottom: -90,
        right: -30,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.brandGlowBottom,
    },
    close: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        padding: spacing.xs,
        zIndex: 2,
    },
    closeText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontFamily: fontFamilies.body,
    },
    logoHalo: {
        width: 88,
        height: 88,
        borderRadius: 44,
        padding: spacing.xsPlus,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoWrap: {
        width: 110,
        height: 110,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    logoGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: colors.surfaceGlass,
    },
    logoInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.heroDark,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderOnDarkMedium,
        shadowColor: colors.black,
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 6,
    },
    logo: {
        width: 50,
        height: 50,
    },
    body: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.lg,
        alignItems: 'center',
    },
    title: {
        color: colors.white,
        fontSize: fontSizes.display,
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        color: colors.textNightMuted,
        fontSize: fontSizes.basePlus,
        textAlign: 'center',
        marginTop: spacing.xs,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    highlightBox: {
        width: '100%',
        marginTop: spacing.lg,
        backgroundColor: colors.surfaceNightOverlay,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
        padding: spacing.md,
    },
    highlightLabel: {
        color: colors.textNight,
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: spacing.sm,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: spacing.xs,
        marginRight: spacing.sm,
        backgroundColor: colors.brandPink,
    },
    bulletText: {
        flex: 1,
        color: colors.textNightMuted,
        fontSize: fontSizes.base,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    buttonContainer: {
        width: '100%',
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    primaryButton: {
        width: '100%',
        borderRadius: radius.mdPlus,
        overflow: 'hidden',
    },
    primaryButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.mdPlus,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fontSizes.lg,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    secondaryButton: {
        marginTop: spacing.smPlus,
    },
    secondaryButtonText: {
        color: colors.textNightSubtle,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});
