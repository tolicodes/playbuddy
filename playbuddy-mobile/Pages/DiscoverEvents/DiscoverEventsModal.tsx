import React, { useEffect, useState, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Static card dimensions
const CARD_WIDTH = 200;
const CARD_HEIGHT = 200;
const STORAGE_KEY = 'hasSeenDiscoverModal';

type Stage = 'left' | 'right';

export const DiscoverEventsModal: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [stage, setStage] = useState<Stage>('left');
    const arrowX = useRef(new Animated.Value(0)).current;
    const downScale = useRef(new Animated.Value(1)).current;
    const intervalRef = useRef<NodeJS.Timer>();

    // Manage storage, initial hold, and stage switching
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(val => {
            if (val !== 'true') {
                setVisible(true);
                // Vertical pulse for down arrow hint
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(downScale, { toValue: 1.3, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                        Animated.timing(downScale, { toValue: 1.0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                    ])
                ).start();

                // Hold on initial stage for 1 second, then start arrow bounce loop
                setTimeout(() => {
                    startBounce();
                    // Alternate highlight stage every 5s
                    intervalRef.current = setInterval(() => {
                        setStage(prev => (prev === 'left' ? 'right' : 'left'));
                    }, 5000);
                }, 1000);
            }
        });
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Starts the bounce animation on arrowX
    const startBounce = () => {
        arrowX.setValue(0);
        const bounce = Animated.loop(
            Animated.sequence([
                Animated.timing(arrowX, { toValue: 20, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(arrowX, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            ])
        );
        bounce.start();
        return bounce;
    };

    // When stage flips, restart bounce so arrow jumps on new side
    useEffect(() => {
        if (!visible) return;
        const bounce = startBounce();
        return () => bounce.stop();
    }, [stage]);

    const onGotIt = async () => {
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
        setVisible(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    if (!visible) return null;

    return (
        <Modal transparent visible animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.header}>
                        🎉 Discover{'\n'}
                        <Text style={styles.highlight}>Upcoming Events</Text>
                    </Text>
                    <Text style={styles.subheader}>
                        Quickly
                        <Text style={styles.highlight}> swipe </Text>
                        through all events{'\n'}to discover the ones you want to go to!
                    </Text>

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
                                    <Ionicons name="arrow-back" size={36} color="#FFF" />
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
                                    <Ionicons name="arrow-forward" size={36} color="#FFF" />
                                </Animated.View>
                                <View style={[styles.banner, styles.addBanner]}>
                                    <Text style={styles.bannerText}>Add to My Calendar</Text>
                                </View>
                            </>
                        )}
                    </View>

                    <TouchableOpacity style={styles.button} onPress={onGotIt}>
                        <Text style={styles.buttonText}>Got it!</Text>
                    </TouchableOpacity>

                    <View style={styles.hintBox}>
                        <Ionicons name="heart" size={32} color="#FF3B30" style={styles.hintHeart} />
                        <Text style={styles.hintText}>
                            Events save to{'\n'}
                            My Calendar tab below
                        </Text>
                    </View>

                    <Animated.View style={{ transform: [{ scale: downScale }], marginBottom: 16, marginRight: 100 }}>
                        <Ionicons name="arrow-down" size={36} color="#6B46C1" />
                    </Animated.View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
    },
    header: {
        fontSize: 26,
        fontWeight: '700',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    highlight: {
        color: '#6B46C1',
        fontWeight: '700',
    },
    subheader: {
        fontSize: 18,
        color: '#555',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
        position: 'relative',
        padding: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 5,
    },
    half: {
        position: 'absolute',
        top: 0,
        height: CARD_HEIGHT,
        width: CARD_WIDTH / 2,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    leftHalf: { left: 0 },
    rightHalf: { right: 0 },
    banner: {
        position: 'absolute',
        top: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
    },
    skipBanner: {
        left: 16,
        backgroundColor: '#FF3B30',
    },
    addBanner: {
        right: 16,
        backgroundColor: '#34C759',
    },
    bannerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    arrowIcon: {
        position: 'absolute',
        top: CARD_HEIGHT / 2 - 18,
    },
    leftOverlay: { left: CARD_WIDTH * 0.25 - 20 },
    rightOverlay: { right: CARD_WIDTH * 0.25 - 20 },
    hintBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
        justifyContent: 'center',
        marginTop: 20,
    },
    hintHeart: {
        marginRight: 12,
    },
    hintText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
        lineHeight: 22,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#6B46C1',
        borderRadius: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
