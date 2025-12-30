import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import { UE } from '../userEventTypes';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const SHOW_DELAY_MS = 5 * 1000; // 5 seconds (testing)
const SNOOZE_DELAY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const TIMER_KEY = 'edgeplay_modal_timer';
const HIDE_KEY = 'edgeplay_modal_hide';
const SNOOZE_KEY = 'edgeplay_modal_snooze';
const WHATSAPP_URL = 'https://chat.whatsapp.com/KQrj1IBURWdEQrHVLZ23vM';

export function EdgePlayGroupModal() {
    const analyticsProps = useAnalyticsProps();
    const [visible, setVisible] = useState(false);
    const firePulse = useRef(new Animated.Value(1)).current;
    const bulletOpacities = useRef([new Animated.Value(0), new Animated.Value(0)]).current;

    useEffect(() => {
        (async () => {
            const hideModal = await AsyncStorage.getItem(HIDE_KEY);
            if (hideModal === 'true') return;

            const now = Date.now();

            const snoozeUntil = await AsyncStorage.getItem(SNOOZE_KEY);
            if (snoozeUntil && now < Number(snoozeUntil)) return;

            let timer = await AsyncStorage.getItem(TIMER_KEY);

            if (!timer) {
                timer = String(now);
                await AsyncStorage.setItem(TIMER_KEY, timer);
            }

            if (now - Number(timer) >= SHOW_DELAY_MS) {
                setVisible(true);
            }
        })();
    }, []);

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(firePulse, { toValue: 1.08, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(firePulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.delay(1200),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [firePulse]);

    useEffect(() => {
        Animated.stagger(120, bulletOpacities.map((val) =>
            Animated.timing(val, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            })
        )).start();
    }, [bulletOpacities]);

    const dismissForever = async () => {
        logEvent(UE.EdgePlayGroupModalDismissed, analyticsProps);
        await AsyncStorage.setItem(HIDE_KEY, 'true');
        setVisible(false);
    };

    const snooze = async () => {
        logEvent(UE.EdgePlayGroupModalDismissed, analyticsProps);
        await AsyncStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DELAY_MS));
        setVisible(false);
    };

    const openWhatsapp = async () => {
        logEvent(UE.EdgePlayGroupModalOpenWhatsapp, analyticsProps);
        await AsyncStorage.setItem(HIDE_KEY, 'true');
        Linking.openURL(WHATSAPP_URL);
        setVisible(false);
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
                            <FontAwesome5 name="fire" size={32} color="#f97316" />
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
                                <FontAwesome5 name="whatsapp" size={18} color="#fff" />
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
        backgroundColor: 'rgba(8, 7, 20, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '90%',
        backgroundColor: '#0f172a',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 12,
        overflow: 'hidden',
    },
    close: {
        alignSelf: 'flex-end',
        padding: 4,
    },
    closeText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#fff',
        width: '100%',
        marginBottom: 10,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        marginBottom: 6,
        position: 'relative',
    },
    fireBadge: {
        backgroundColor: 'rgba(249, 115, 22, 0.12)',
        borderRadius: 999,
        padding: 10,
        shadowColor: '#f97316',
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 16,
        elevation: 10,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 15,
        color: '#cbd5e1',
        width: '100%',
        textAlign: 'center',
        lineHeight: 24,
    },
    bold: {
        fontWeight: '700',
    },
    highlightBox: {
        width: '100%',
        backgroundColor: 'rgba(59, 130, 246, 0.06)',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.25)',
        marginBottom: 16,
        shadowColor: '#3b82f6',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 6,
    },
    highlightLabel: {
        color: '#93c5fd',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    bulletContainer: {
        alignItems: 'flex-start',
        gap: 10,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#f97316',
    },
    bulletPoint: {
        fontSize: 14,
        color: '#e2e8f0',
        flex: 1,
        lineHeight: 20,
    },
    pastEventsBox: {
        width: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.25)',
        marginBottom: 16,
        shadowColor: '#0ea5e9',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 5,
    },
    pastEventsText: {
        color: '#e2e8f0',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    buttonContainer: {
        alignItems: 'stretch',
        width: '100%',
        marginTop: 6,
        gap: 10,
    },
    primaryBtn: {
        backgroundColor: '#16a34a',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#16a34a',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 8,
    },
    primaryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    primaryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryBtn: {
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 20,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.4)',
    },
    secondaryText: {
        color: '#cbd5e1',
        fontSize: 14,
        fontWeight: '600',
    },
});
