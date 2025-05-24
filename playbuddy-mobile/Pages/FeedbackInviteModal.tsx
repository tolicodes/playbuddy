import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHOW_DELAY_MS = 24 * 60 * 60 * 1000; // 1 day
const TIMER_KEY = 'feedback_modal_timer';
const HIDE_KEY = 'feedback_modal_hide';
const WHATSAPP_URL = 'https://chat.whatsapp.com/IxE95YmQMc07umbD7vFrPM';

export function FeedbackInviteModal() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        (async () => {
            const hideModal = await AsyncStorage.getItem(HIDE_KEY);
            if (hideModal === 'true') return;

            let timer = await AsyncStorage.getItem(TIMER_KEY);
            const now = Date.now();

            if (!timer) {
                timer = String(now);
                await AsyncStorage.setItem(TIMER_KEY, timer);
            }

            if (now - Number(timer) >= SHOW_DELAY_MS) {
                setVisible(true);
            }
        })();
    }, []);

    const dismiss = async () => {
        await AsyncStorage.setItem(HIDE_KEY, 'true');
        setVisible(false);
    };

    const openWhatsapp = async () => {
        await AsyncStorage.setItem(HIDE_KEY, 'true');
        Linking.openURL(WHATSAPP_URL);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade">
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.close} onPress={dismiss}>
                        <Text>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Share Feedback, {'\n'}Next Event On Us!</Text>
                    <Text style={styles.subtitle}>30-min chat about PlayBuddy</Text>
                    <Text style={styles.bulletPoint}>• Discuss NYC play scene</Text>
                    <Text style={styles.bulletPoint}>• Share your challenges and desires</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={openWhatsapp}>
                            <Text style={styles.primaryText}>Join WhatsApp</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.footnote}>*Up to $50. First 5 only.</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    close: {
        alignSelf: 'flex-end',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 15,
    },
    bulletPoint: {
        fontSize: 14,
        marginBottom: 8,
    },
    buttonContainer: {
        alignItems: 'center',
        width: '100%',
        marginTop: 10,
    },
    primaryBtn: {
        backgroundColor: '#25D366',
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 15,
        width: '100%',
        alignItems: 'center',
    },
    primaryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footnote: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
});
