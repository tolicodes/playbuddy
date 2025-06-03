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
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserContext } from '../Auth/hooks/UserContext';
import { useNavigation } from '@react-navigation/native';
import type { NavStack } from '../../Common/Nav/NavStackType';
import { LAVENDER_BACKGROUND } from '../../styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 180;
const CARD_HEIGHT = 180;

type Stage = 'left' | 'right';

interface DiscoverEventsTourProps {
    onClose: () => void;
}

export const DiscoverEventsTour: React.FC<DiscoverEventsTourProps> = ({ onClose }) => {
    const { authUserId } = useUserContext();
    const navigation = useNavigation<NavStack>();

    // “left” = show SKIP overlay; “right” = show SAVE overlay
    const [stage, setStage] = useState<Stage>('right');

    // Animated values:
    const arrowX = useRef(new Animated.Value(0)).current;
    const downScale = useRef(new Animated.Value(1)).current;
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

    // On mount: set up vertical‐pulse for the down arrow, then after 1s, begin alternating stage every 5s
    useEffect(() => {
        // Vertical pulse for the down arrow hint (heartbeat effect)
        const downPulse = Animated.loop(
            Animated.sequence([
                Animated.timing(downScale, {
                    toValue: 1.3,
                    duration: 500,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(downScale, {
                    toValue: 1.0,
                    duration: 500,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        downPulse.start();

        // After 1 second, alternate stage every 5 seconds
        const holdTimeout = setTimeout(() => {
            setStage('left'); // ensure starting on left
            intervalRef.current = setInterval(() => {
                setStage(prev => (prev === 'left' ? 'right' : 'left'));
            }, 3000);
        }, 1000);

        return () => {
            clearTimeout(holdTimeout);
            downPulse.stop();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const handlePrimaryPress = async () => {
        if (authUserId) {
            // Mark that we have seen the intro
            await AsyncStorage.setItem(STORAGE_KEY, 'true');
            onClose();
        } else {
            // If not logged in, navigate to login/signup
            navigation.navigate('AuthNav', { screen: 'Login Form' });
        }
    };

    return (
        <View style={styles.container}>
            {/* ── Top: Header & Subtitle ───────────────────────────────── */}
            <View style={styles.topContainer}>
                <Text style={styles.header}>
                    ❤️ Swipe Right ❤️ {'\n'}
                </Text>
                <Text style={styles.subheader}>
                    and save your favorite events!
                </Text>
            </View>

            {/* ── Middle: Animated Card + Primary Button ───────────────── */}
            <View style={styles.middleContainer}>
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
                                <Ionicons name="arrow-back" size={32} color="#FFF" />
                            </Animated.View>
                            <View style={[styles.banner, styles.skipBanner]}>
                                <Text style={styles.bannerText}>SKIP</Text>
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
                                <Ionicons name="arrow-forward" size={32} color="#FFF" />
                            </Animated.View>
                            <View style={[styles.banner, styles.saveBanner]}>
                                <Text style={styles.bannerText}>Save to My Calendar</Text>
                            </View>
                        </>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        authUserId ? styles.gotItButton : styles.createAccountButton,
                    ]}
                    onPress={handlePrimaryPress}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={authUserId ? 'checkmark-circle-outline' : 'person-add-outline'}
                        size={20}
                        color="#FFF"
                    />
                    <Text style={styles.primaryButtonText}>
                        {authUserId ? 'Got it!' : 'Create Account\nto save events'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Bottom: Only show when swiping right ─────────────────── */}
            {stage === 'right' && (
                <View style={styles.customHintContainer}>
                    <View style={styles.iconColumn}>
                        <Ionicons name="heart" size={24} color="#FF3B30" />
                        <Animated.View
                            style={{ transform: [{ scale: downScale }], marginTop: 4 }}
                        >
                            <Ionicons name="arrow-down" size={20} color="#6B46C1" />
                        </Animated.View>
                    </View>

                    <View style={styles.hintBox}>
                        <Text style={styles.hintText}>Save to{'\n'}My Calendar</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LAVENDER_BACKGROUND,
    },

    // ── Top Container ─────────────────────────────────────────────
    topContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 24,
    },
    header: {
        textAlign: 'center',
        marginBottom: 4,
        color: "black",
        fontSize: 24,
        fontWeight: "600"
    },

    subheader: {
        fontSize: 20,
        color: '#555',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '600',
    },

    // ── Middle Container ─────────────────────────────────────────
    middleContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        overflow: 'hidden',
        padding: 16,
        borderWidth: 1,
        borderColor: '#DDD',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 4,
        marginBottom: 20,
    },
    half: {
        position: 'absolute',
        top: 0,
        width: CARD_WIDTH / 2,
        height: CARD_HEIGHT,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    leftHalf: { left: 0 },
    rightHalf: { right: 0 },
    banner: {
        position: 'absolute',
        top: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    skipBanner: {
        left: 10,
        backgroundColor: '#FF3B30',
    },
    saveBanner: {
        right: 10,
        backgroundColor: '#34C759',
    },
    bannerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    arrowIcon: {
        position: 'absolute',
        top: CARD_HEIGHT / 2 - 16,
    },
    leftOverlay: { left: CARD_WIDTH * 0.25 - 16 },
    rightOverlay: { right: CARD_WIDTH * 0.25 - 16 },

    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 6,
    },
    gotItButton: {
        backgroundColor: '#6B46C1',
    },
    createAccountButton: {
        backgroundColor: '#1976d2',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
        textAlign: 'center',
    },

    // ── Custom Bottom Hint ───────────────────────────────────────
    customHintContainer: {
        position: 'absolute',
        bottom: 40,
        left: SCREEN_WIDTH / 4 + 37, // arrow + pill start
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconColumn: {
        alignItems: 'center',
        marginRight: 8,
    },
    hintBox: {
        width: 150,
        backgroundColor: 'lightgray',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    hintText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 20,
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