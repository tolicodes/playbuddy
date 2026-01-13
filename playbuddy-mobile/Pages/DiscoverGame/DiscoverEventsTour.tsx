// DiscoverEventsIntro.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Easing,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useNavigation } from '@react-navigation/native';
import type { NavStack } from '../../Common/Nav/NavStackType';
import { navigateToAuth } from '../../Common/Nav/navigationHelpers';
import { colors, fontFamilies, fontSizes, lineHeights, radius, shadows, spacing } from '../../components/styles';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 72, 240);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.9);

type Stage = 'left' | 'right';

interface DiscoverEventsTourProps {
    onClose: () => void;
}

export const DiscoverEventsTour: React.FC<DiscoverEventsTourProps> = ({ onClose }) => {
    const { authUserId } = useUserContext();
    const navigation = useNavigation<NavStack>();
    const analyticsProps = useAnalyticsProps();

    // “left” = show SKIP overlay; “right” = show SAVE overlay
    const [stage, setStage] = useState<Stage>('right');

    // Animated values:
    const arrowX = useRef(new Animated.Value(0)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const intervalRef = useRef<NodeJS.Timer | null>(null);

    /**
     * startBounce() launches an Animated.loop that bounces arrowX from 0 → 16 → 0.
     * Returns the looping animation so it can be .stop()ped.
     */
    const startBounce = () => {
        arrowX.setValue(0);
        const bounceLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(arrowX, {
                    toValue: 16,
                    duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(arrowX, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        bounceLoop.start();
        return bounceLoop;
    };

    // Whenever `stage` changes, restart the bounce animation so the arrow shifts sides.
    useEffect(() => {
        const loop = startBounce();
        return () => {
            loop.stop();
        };
    }, [stage]);

    // On mount: set up a pulse for the active legend chip, then start alternating stages.
    useEffect(() => {
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseScale, {
                    toValue: 1.08,
                    duration: 500,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseScale, {
                    toValue: 1.0,
                    duration: 500,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        pulseLoop.start();

        // After 1 second, alternate stage every 5 seconds
        const holdTimeout = setTimeout(() => {
            setStage('left'); // ensure starting on left
            intervalRef.current = setInterval(() => {
                setStage(prev => (prev === 'left' ? 'right' : 'left'));
            }, 3000);
        }, 1000);

        return () => {
            clearTimeout(holdTimeout);
            pulseLoop.stop();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const handlePrimaryPress = async () => {
        if (authUserId) {
            logEvent(UE.DiscoverGameHideTourPressed, analyticsProps)
            // Mark that we have seen the intro
            await AsyncStorage.setItem(STORAGE_KEY, 'true');

            onClose();
        } else {
            // If not logged in, navigate to login/signup

            logEvent(UE.DiscoverGameCreateAccountPressed, analyticsProps)

            navigateToAuth(navigation, 'Login Form');
        }
    };

    return (
        <View style={styles.container}>
            <View pointerEvents="none" style={styles.glowTop} />
            <View pointerEvents="none" style={styles.glowBottom} />

            <View style={styles.content}>
                {/* ── Top: Header & Subtitle ───────────────────────────────── */}
                <View style={styles.topContainer}>
                    <Text style={styles.kicker}>Swipe guide</Text>
                    <Text style={styles.header}>Curate your calendar in seconds.</Text>
                    <Text style={styles.subheader}>
                        Swipe right to save. Swipe left to skip.
                    </Text>
                </View>

                {/* ── Middle: Animated Card + Primary Button ───────────────── */}
                <View style={styles.middleContainer}>
                    <LinearGradient
                        colors={[colors.brandLavender, colors.brandPink]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardFrame}
                    >
                        <View style={styles.card}>
                            {stage === 'left' && (
                                <>
                                    <View style={[styles.half, styles.leftHalf]} />
                                    <Animated.View
                                        style={[
                                            styles.arrowIcon,
                                            styles.leftOverlay,
                                            { transform: [{ translateX: arrowX }] },
                                        ]}
                                    >
                                        <Ionicons name="arrow-back" size={32} color={colors.textMuted} />
                                    </Animated.View>
                                    <View style={[styles.banner, styles.skipBanner]}>
                                        <Text style={styles.bannerText}>Skip</Text>
                                    </View>
                                </>
                            )}

                            {stage === 'right' && (
                                <>
                                    <View style={[styles.half, styles.rightHalf]} />
                                    <Animated.View
                                        style={[
                                            styles.arrowIcon,
                                            styles.rightOverlay,
                                            { transform: [{ translateX: arrowX }] },
                                        ]}
                                    >
                                        <Ionicons name="arrow-forward" size={32} color={colors.brandPink} />
                                    </Animated.View>
                                    <View style={[styles.banner, styles.saveBanner]}>
                                        <Text style={[styles.bannerText, styles.bannerTextOnDark]}>Save</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </LinearGradient>

                    {!authUserId && (
                        <Text style={styles.authNotice}>
                            You must create an account to save events
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            authUserId ? styles.primaryButtonConfirm : styles.primaryButtonCreate,
                        ]}
                        onPress={handlePrimaryPress}
                        activeOpacity={0.85}
                    >
                        <Text
                            style={[
                                styles.primaryButtonText,
                                authUserId && styles.primaryButtonTextConfirm,
                            ]}
                        >
                            {authUserId ? 'Got it!' : 'Create Account'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomContainer}>
                    <View style={styles.legendRow}>
                        <Animated.View
                            style={[
                                styles.legendChip,
                                stage === 'left' ? styles.legendChipActive : styles.legendChipMuted,
                                { transform: [{ scale: stage === 'left' ? pulseScale : 1 }] },
                            ]}
                        >
                            <Ionicons
                                name="close"
                                size={16}
                                color={stage === 'left' ? colors.textPrimary : colors.textOnDarkMuted}
                                style={styles.legendIcon}
                            />
                            <Text
                                style={[
                                    styles.legendText,
                                    stage === 'left' ? styles.legendTextActive : styles.legendTextMuted,
                                ]}
                            >
                                Skip
                            </Text>
                        </Animated.View>
                        <Animated.View
                            style={[
                                styles.legendChip,
                                stage === 'right' ? styles.legendChipActiveSave : styles.legendChipMuted,
                                { transform: [{ scale: stage === 'right' ? pulseScale : 1 }] },
                            ]}
                        >
                            <Ionicons
                                name="heart"
                                size={16}
                                color={stage === 'right' ? colors.white : colors.textOnDarkMuted}
                                style={styles.legendIcon}
                            />
                            <Text
                                style={[
                                    styles.legendText,
                                    stage === 'right' ? styles.legendTextOnDark : styles.legendTextMuted,
                                ]}
                            >
                                Save
                            </Text>
                        </Animated.View>
                    </View>
                </View>
            </View>
        </View>
    );
};

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    glowTop: {
        position: 'absolute',
        top: -90,
        right: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: colors.brandGlowTop,
    },
    glowBottom: {
        position: 'absolute',
        bottom: -120,
        left: -70,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: colors.brandGlowWarm,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.xxxl,
        paddingBottom: spacing.xxxl,
    },

    // ── Top Container ─────────────────────────────────────────────
    topContainer: {
        alignItems: 'center',
        maxWidth: 320,
    },
    kicker: {
        fontSize: fontSizes.sm,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: colors.textOnDarkSubtle,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.body,
    },
    header: {
        textAlign: 'center',
        marginBottom: spacing.sm,
        color: colors.textOnDarkStrong,
        fontSize: fontSizes.display,
        fontWeight: '700',
        fontFamily: fontFamilies.display,
    },

    subheader: {
        fontSize: fontSizes.lg,
        color: colors.textOnDarkMuted,
        textAlign: 'center',
        lineHeight: lineHeights.lg,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },

    // ── Middle Container ─────────────────────────────────────────
    middleContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
        width: '100%',
    },
    authNotice: {
        marginTop: spacing.lg,
        marginBottom: spacing.md,
        maxWidth: 280,
        textAlign: 'center',
        color: colors.textOnDarkMuted,
        fontSize: fontSizes.base,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        fontWeight: '600',
    },
    cardFrame: {
        borderRadius: radius.lgPlus,
        padding: 2,
        overflow: 'hidden',
        ...shadows.brandCard,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: colors.surfaceWhiteFrosted,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderOnDarkSoft,
        marginBottom: spacing.xl,
    },
    half: {
        position: 'absolute',
        top: 0,
        width: CARD_WIDTH / 2,
        height: CARD_HEIGHT,
    },
    leftHalf: {
        left: 0,
        backgroundColor: colors.surfaceMutedAlt,
    },
    rightHalf: {
        right: 0,
        backgroundColor: colors.surfaceLavenderStrong,
    },
    banner: {
        position: 'absolute',
        top: spacing.smPlus,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    skipBanner: {
        left: spacing.smPlus,
        backgroundColor: colors.surfaceWhiteOpaque,
        borderColor: colors.borderMutedAlt,
    },
    saveBanner: {
        right: spacing.smPlus,
        backgroundColor: colors.brandPink,
        borderColor: colors.brandPink,
    },
    bannerText: {
        color: colors.textPrimary,
        fontSize: fontSizes.sm,
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    bannerTextOnDark: {
        color: colors.white,
    },
    arrowIcon: {
        position: 'absolute',
        top: CARD_HEIGHT / 2 - 16,
    },
    leftOverlay: { left: CARD_WIDTH * 0.25 - 16 },
    rightOverlay: { right: CARD_WIDTH * 0.25 - 16 },

    primaryButton: {
        width: '100%',
        maxWidth: 280,
        borderRadius: radius.lg,
        overflow: 'hidden',
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.mdPlus,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonCreate: {
        backgroundColor: colors.brandBright,
    },
    primaryButtonConfirm: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: fontSizes.lg,
        fontWeight: '600',
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    primaryButtonTextConfirm: {
        color: colors.brandDeep,
    },

    // ── Bottom Legend ────────────────────────────────────────────
    bottomContainer: {
        alignItems: 'center',
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        marginHorizontal: spacing.xs,
        minWidth: 98,
    },
    legendChipMuted: {
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.borderOnDarkSoft,
    },
    legendChipActive: {
        backgroundColor: colors.white,
        borderColor: colors.borderOnDarkBright,
    },
    legendChipActiveSave: {
        backgroundColor: colors.brandPink,
        borderColor: colors.brandPink,
    },
    legendIcon: {
        marginRight: spacing.xs,
    },
    legendText: {
        fontSize: fontSizes.sm,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    legendTextMuted: {
        color: colors.textOnDarkMuted,
    },
    legendTextActive: {
        color: colors.textPrimary,
    },
    legendTextOnDark: {
        color: colors.white,
    },
});

const STORAGE_KEY = 'hasSeenDiscoverScreen';


/**
 * Hook: returns { visible, setVisible }.
 * - On mount, reads AsyncStorage[STORAGE_KEY]. If not 'true', sets visible = true.
 * - setVisible(false) will write 'true' into storage so it never shows again.
 * - setVisible(true) is the inverse (rarely used, but we expose it).
 */
export const useShowDiscoverEventsTour = () => {
    const [visibleInternal, setVisibleInternal] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(val => {
            if (val !== 'true') {
                saveVisible(true);
            }
        });
    }, []);

    const saveVisible = async (value: boolean) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
            setVisibleInternal(value);
        } catch (e) {
            // swallow or log error
            console.warn('Error writing DiscoverScreen flag', e);
        }
    };

    return { visible: visibleInternal, saveVisible };
};
