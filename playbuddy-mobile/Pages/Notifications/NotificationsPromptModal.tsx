import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { colors, fontFamilies, fontSizes, lineHeights, radius, spacing } from '../../components/styles';

type NotificationsPromptConfig = {
    title: string;
    subtitle: string;
    benefits: string[];
    ctaLabel: string;
    secondaryLabel: string;
    iconName: string;
};

type NotificationsPromptOverrides = Partial<NotificationsPromptConfig>;

type PromptRequest = {
    resolve: (value: boolean) => void;
    promise: Promise<boolean>;
};

const DEFAULT_CONFIG: NotificationsPromptConfig = {
    title: 'Enable notifications',
    subtitle: 'Stay in the loop on the events you care about.',
    benefits: [
        'Get alerted when your favorite organizers have a new event',
        'Receive reminders before upcoming workshops',
    ],
    ctaLabel: 'Enable notifications',
    secondaryLabel: 'Not now',
    iconName: 'bell',
};

let promptHandler: ((overrides?: NotificationsPromptOverrides) => Promise<boolean>) | null = null;

const isPermissionGranted = (settings: Notifications.NotificationPermissionsStatus) =>
    settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

export const requestNotificationsPrompt = async (overrides?: NotificationsPromptOverrides) => {
    const current = await Notifications.getPermissionsAsync();
    if (isPermissionGranted(current)) return true;
    return showNotificationsPromptModal(overrides);
};

export const showNotificationsPromptModal = (overrides?: NotificationsPromptOverrides) => {
    if (!promptHandler) return Promise.resolve(true);
    return promptHandler(overrides);
};

type NotificationsPromptModalProps = {
    visible: boolean;
    config: NotificationsPromptConfig;
    onEnable: () => void;
    onDismiss: () => void;
};

const NotificationsPromptModal = ({ visible, config, onEnable, onDismiss }: NotificationsPromptModalProps) => {
    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.close} onPress={onDismiss} hitSlop={8}>
                        <Text style={styles.closeText}>X</Text>
                    </TouchableOpacity>

                    <View style={styles.iconWrap}>
                        <FontAwesome5 name={config.iconName} size={24} color={colors.accentSkyDeep} />
                    </View>
                    <Text style={styles.title}>{config.title}</Text>
                    <Text style={styles.subtitle}>{config.subtitle}</Text>

                    <View style={styles.highlightBox}>
                        <Text style={styles.highlightLabel}>Benefits</Text>
                        {config.benefits.map((benefit, index) => (
                            <View key={`${benefit}-${index}`} style={styles.bulletRow}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletText}>{benefit}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.primaryButton} onPress={onEnable} activeOpacity={0.85}>
                            <Text style={styles.primaryButtonText}>{config.ctaLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton} onPress={onDismiss}>
                            <Text style={styles.secondaryButtonText}>{config.secondaryLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export const NotificationsPromptModalProvider = ({ children }: { children: React.ReactNode }) => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const pendingRef = useRef<PromptRequest | null>(null);

    const openPrompt = useCallback((overrides?: NotificationsPromptOverrides) => {
        if (pendingRef.current) return pendingRef.current.promise;
        let resolve: (value: boolean) => void = () => {};
        const promise = new Promise<boolean>((nextResolve) => {
            resolve = nextResolve;
        });
        pendingRef.current = { resolve, promise };
        setConfig({
            ...DEFAULT_CONFIG,
            ...overrides,
            benefits: overrides?.benefits ?? DEFAULT_CONFIG.benefits,
        });
        setVisible(true);
        return promise;
    }, []);

    const resolvePrompt = useCallback((value: boolean) => {
        setVisible(false);
        const pending = pendingRef.current;
        pendingRef.current = null;
        pending?.resolve(value);
    }, []);

    useEffect(() => {
        promptHandler = openPrompt;
        return () => {
            if (promptHandler === openPrompt) {
                promptHandler = null;
            }
        };
    }, [openPrompt]);

    return (
        <>
            {children}
            <NotificationsPromptModal
                visible={visible}
                config={config}
                onEnable={() => resolvePrompt(true)}
                onDismiss={() => resolvePrompt(false)}
            />
        </>
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
        backgroundColor: colors.surfaceNight,
        borderRadius: radius.lgPlus,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderNight,
        shadowColor: colors.black,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 12,
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
    iconWrap: {
        backgroundColor: colors.accentSkySoft,
        borderRadius: radius.pill,
        padding: spacing.md,
        marginBottom: spacing.smPlus,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.35)',
    },
    title: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        textAlign: 'center',
        color: colors.white,
        marginBottom: spacing.sm,
        fontFamily: fontFamilies.display,
    },
    subtitle: {
        fontSize: fontSizes.lg,
        color: colors.textNightMuted,
        textAlign: 'center',
        lineHeight: lineHeights.lg,
        marginBottom: spacing.lg,
        fontFamily: fontFamilies.body,
    },
    highlightBox: {
        width: '100%',
        backgroundColor: colors.accentSkySoft,
        borderRadius: radius.mdPlus,
        padding: spacing.mdPlus,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.3)',
        marginBottom: spacing.lg,
    },
    highlightLabel: {
        color: colors.accentSkyDeep,
        fontSize: fontSizes.smPlus,
        fontWeight: '700',
        marginBottom: spacing.sm,
        textAlign: 'center',
        fontFamily: fontFamilies.body,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accentSkyDeep,
    },
    bulletText: {
        color: colors.textNight,
        fontSize: fontSizes.base,
        lineHeight: lineHeights.md,
        fontFamily: fontFamilies.body,
        flex: 1,
    },
    buttonContainer: {
        width: '100%',
        gap: spacing.smPlus,
    },
    primaryButton: {
        backgroundColor: colors.accentSkyDeep,
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        width: '100%',
    },
    primaryButtonText: {
        color: colors.surfaceNight,
        fontSize: fontSizes.xl,
        fontWeight: '700',
        fontFamily: fontFamilies.body,
    },
    secondaryButton: {
        borderRadius: radius.mdPlus,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderNightMuted,
    },
    secondaryButtonText: {
        color: colors.textNightMuted,
        fontSize: fontSizes.base,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },
});
