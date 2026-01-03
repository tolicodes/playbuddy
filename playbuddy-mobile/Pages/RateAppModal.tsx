import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import { useAnalyticsProps } from '../Common/hooks/useAnalytics';
import { logEvent } from '../Common/hooks/logger';
import {
    APP_STORE_REVIEW_URL,
    APP_STORE_WEB_URL,
    GOOGLE_PLAY_REVIEW_URL,
    GOOGLE_PLAY_WEB_URL,
} from '../config';
import { UE } from '../userEventTypes';

type RateAppModalProps = {
    visible: boolean;
    onDismiss: () => void;
    onSnooze: () => void;
};

export function RateAppModal({ visible, onDismiss, onSnooze }: RateAppModalProps) {
    const analyticsProps = useAnalyticsProps();

    if (!visible) return null;

    const dismiss = () => {
        logEvent(UE.RateAppModalDismissed, analyticsProps);
        onDismiss();
    };

    const snooze = () => {
        logEvent(UE.RateAppModalDismissed, analyticsProps);
        onSnooze();
    };

    const rateApp = async () => {
        logEvent(UE.RateAppModalOpenStore, analyticsProps);
        const reviewUrl = Platform.OS === 'ios' ? APP_STORE_REVIEW_URL : GOOGLE_PLAY_REVIEW_URL;
        const fallbackUrl = Platform.OS === 'ios' ? APP_STORE_WEB_URL : GOOGLE_PLAY_WEB_URL;

        try {
            await Linking.openURL(reviewUrl);
        } catch {
            void Linking.openURL(fallbackUrl);
        }
        onDismiss();
    };

    return (
        <Modal transparent animationType="fade" onRequestClose={dismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.close} onPress={dismiss}>
                        <Text style={styles.closeText}>X</Text>
                    </TouchableOpacity>

                    <View style={styles.iconWrap}>
                        <FontAwesome5 name="star" size={26} color="#fbbf24" />
                    </View>
                    <Text style={styles.title}>Enjoying PlayBuddy?</Text>
                    <Text style={styles.subtitle}>
                        Your rating helps others discover the app and supports the community.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={rateApp} activeOpacity={0.85}>
                            <Text style={styles.primaryText}>Rate the app</Text>
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
        width: '88%',
        backgroundColor: '#0f172a',
        borderRadius: 18,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 12,
    },
    close: {
        alignSelf: 'flex-end',
        padding: 4,
    },
    closeText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    iconWrap: {
        backgroundColor: 'rgba(251, 191, 36, 0.12)',
        borderRadius: 999,
        padding: 12,
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#cbd5e1',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    buttonContainer: {
        width: '100%',
        gap: 10,
    },
    primaryBtn: {
        backgroundColor: '#fbbf24',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        width: '100%',
    },
    primaryText: {
        color: '#0f172a',
        fontSize: 16,
        fontWeight: '700',
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
