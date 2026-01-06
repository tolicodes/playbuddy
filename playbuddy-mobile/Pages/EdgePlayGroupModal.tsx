import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Animated, Easing } from 'react-native';
import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../components/styles';

const WHATSAPP_URL = 'https://chat.whatsapp.com/KQrj1IBURWdEQrHVLZ23vM';

type EdgePlayGroupModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onSnooze: () => void;
};

export function EdgePlayGroupModal({ visible, onDismiss, onSnooze }: EdgePlayGroupModalProps) {
    const analyticsProps = useAnalyticsProps();
    const firePulse = useRef(new Animated.Value(1)).current;
    const bulletOpacities = useRef([new Animated.Value(0), new Animated.Value(0)]).current;

    useEffect(() => {
        if (!visible) return;
        firePulse.setValue(1);
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(firePulse, { toValue: 1.08, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(firePulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.delay(1200),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [firePulse, visible]);

    useEffect(() => {
        if (!visible) return;
        bulletOpacities.forEach((val) => val.setValue(0));
        Animated.stagger(120, bulletOpacities.map((val) =>
            Animated.timing(val, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            })
        )).start();
    }, [bulletOpacities, visible]);

    const dismissForever = async () => {
        logEvent(UE.EdgePlayGroupModalDismissed, analyticsProps);
        onDismiss();
    };

    const snooze = async () => {
        logEvent(UE.EdgePlayGroupModalDismissed, analyticsProps);
        onSnooze();
    };

    const openWhatsapp = async () => {
        logEvent(UE.EdgePlayGroupModalOpenWhatsapp, analyticsProps);
        void Linking.openURL(WHATSAPP_URL);
        onDismiss();
    };

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade">
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.close} onPress={dismissForever}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>

                    <View style={styles.titleRow}>
                        <Animated.View style={[styles.fireBadge, { transform: [{ scale: firePulse }] }]}>
                            <FontAwesome5 name="fire" size={32} color={colors.accentOrange} />
                        </Animated.View>
                    </View>
                    <Text style={styles.title}>Interested in Edgy Events?</Text>
                    <Text style={styles.subtitle}>
                        Join the PlayBuddy EdgePlay group —{'\n'}a community for{'\n'}<Text style={styles.bold}>exploring more advanced skills</Text> in a safe setting with expert facilitators.
                    </Text>

                    <View style={styles.highlightBox}>
                        <Text style={styles.highlightLabel}>What you get</Text>
                        <View style={styles.bulletContainer}>
                            <Animated.View style={[styles.bulletRow, {
                                opacity: bulletOpacities[0],
                                transform: [{
                                    translateY: bulletOpacities[0].interpolate({ inputRange: [0, 1], outputRange: [6, 0] })
                                }]
                            }]}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletPoint}>Invites to curated edgeplay workshops and events</Text>
                            </Animated.View>
                            <Animated.View style={[styles.bulletRow, {
                                opacity: bulletOpacities[1],
                                transform: [{
                                    translateY: bulletOpacities[1].interpolate({ inputRange: [0, 1], outputRange: [6, 0] })
                                }]
                            }]}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletPoint}>Safety-first culture, guided by vetted pros</Text>
                            </Animated.View>
                        </View>
                    </View>

                    <View style={styles.pastEventsBox}>
                        <Text style={styles.highlightLabel}>Events we held in the past</Text>
                        <Text style={styles.pastEventsText}>Needle Play · Lighthearted CNC · Dark CNC</Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={openWhatsapp} activeOpacity={0.85}>
                            <View style={styles.primaryContent}>
                                <FontAwesome5 name="whatsapp" size={18} color={colors.white} />
                                <Text style={styles.primaryText}>Join WhatsApp group</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={snooze}>
                            <Text style={styles.secondaryText}>Maybe later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.backdropNight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '90%',
        backgroundColor: colors.surfaceNight,
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderNight,
        shadowColor: colors.black,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 12,
        overflow: 'hidden',
    },
    close: {
        alignSelf: 'flex-end',
        padding: spacing.xs,
    },
    closeText: {
        color: colors.textNightSubtle,
        fontSize: fontSizes.xl,
        fontFamily: fontFamilies.body,
    },
    title: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        textAlign: 'center',
        color: colors.white,
        width: '100%',
        marginBottom: spacing.smPlus,
        fontFamily: fontFamilies.display,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        marginBottom: spacing.xsPlus,
        position: 'relative',
    },
    fireBadge: {
        backgroundColor: colors.accentOrangeSoft,
        borderRadius: radius.pill,
        padding: spacing.smPlus,
        shadowColor: colors.accentOrange,
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 16,
        elevation: 10,
    },
    subtitle: {
        fontSize: fontSizes.xl,
        marginBottom: spacing.lg,
        color: colors.textNightMuted,
        width: '100%',
        textAlign: 'center',
        lineHeight: lineHeights.xl,
        fontFamily: fontFamilies.body,
    },
    bold: {
        fontWeight: '700',
    },
    highlightBox: {
        width: '100%',
        backgroundColor: colors.accentBlueSoft,
        borderRadius: radius.mdPlus,
        padding: spacing.mdPlus,
        borderWidth: 1,
        borderColor: colors.accentBlueBorder,
        marginBottom: spacing.lg,
        shadowColor: colors.accentBlue,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 6,
    },
    highlightLabel: {
        color: colors.accentBlueLight,
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        marginBottom: spacing.sm,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    bulletContainer: {
        alignItems: 'flex-start',
        gap: spacing.smPlus,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accentOrange,
    },
    bulletPoint: {
        fontSize: fontSizes.base,
        color: colors.textNight,
        flex: 1,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
    },
    pastEventsBox: {
        width: '100%',
        backgroundColor: colors.surfaceNightOverlay,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
        marginBottom: spacing.lg,
        shadowColor: colors.accentSkyDeep,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 5,
    },
    pastEventsText: {
        color: colors.textNight,
        fontSize: fontSizes.base,
        lineHeight: lineHeights.md,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    buttonContainer: {
        alignItems: 'stretch',
        width: '100%',
        marginTop: spacing.xsPlus,
        gap: spacing.smPlus,
    },
    primaryBtn: {
        backgroundColor: colors.accentGreen,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.mdPlus,
        paddingHorizontal: spacing.xl,
        width: '100%',
        alignItems: 'center',
        shadowColor: colors.accentGreen,
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 8,
    },
    primaryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    primaryText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
    secondaryBtn: {
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
    },
    secondaryText: {
        color: colors.textNightMuted,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});
