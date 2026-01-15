import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View, ViewStyle, Text } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { colors, fontFamilies } from '../../../components/styles';

type WishlistPlusButtonProps = {
    itemIsOnWishlist: boolean;
    handleToggleEventWishlist: () => void;
    onLongPress?: () => void;
    wobble?: boolean;
    size?: number;
    containerStyle?: ViewStyle;
};

const MAX_LABEL = 'Saved';

const buildButtonMetrics = (height: number) => {
    const iconSize = Math.round(height * 0.34);
    const fontSize = Math.round(height * 0.27);
    const paddingX = Math.round(height * 0.22);
    const gap = Math.max(3, Math.round(height * 0.12));
    const textWidth = Math.round(MAX_LABEL.length * fontSize * 0.6);
    const minWidth = Math.round(paddingX * 2 + iconSize + gap + textWidth);
    return {
        iconSize,
        fontSize,
        paddingX,
        gap,
        minWidth,
    };
};

export const getWishlistButtonWidth = (height: number) =>
    buildButtonMetrics(height).minWidth;

export const WishlistPlusButton: React.FC<WishlistPlusButtonProps> = ({
    itemIsOnWishlist,
    handleToggleEventWishlist,
    onLongPress,
    wobble = false,
    size = 36,
    containerStyle,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const wobbleAnim = useRef(new Animated.Value(0)).current;
    const wobbleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const longPressTriggeredRef = useRef(false);
    const { iconSize, fontSize, paddingX, gap, minWidth } = buildButtonMetrics(size);
    const label = itemIsOnWishlist ? 'Saved' : 'Save';
    const iconName = itemIsOnWishlist ? 'check' : 'plus';
    const contentColor = itemIsOnWishlist ? colors.white : colors.brandInk;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.08,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start();
    }, [itemIsOnWishlist]);

    useEffect(() => {
        if (!wobble) {
            wobbleLoopRef.current?.stop();
            wobbleLoopRef.current = null;
            wobbleAnim.setValue(0);
            return;
        }

        wobbleAnim.setValue(0);
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(wobbleAnim, {
                    toValue: 1,
                    duration: 90,
                    useNativeDriver: true,
                }),
                Animated.timing(wobbleAnim, {
                    toValue: -1,
                    duration: 120,
                    useNativeDriver: true,
                }),
                Animated.timing(wobbleAnim, {
                    toValue: 1,
                    duration: 120,
                    useNativeDriver: true,
                }),
                Animated.timing(wobbleAnim, {
                    toValue: 0,
                    duration: 120,
                    useNativeDriver: true,
                }),
            ]),
        );

        wobbleLoopRef.current = loop;
        loop.start();

        return () => {
            loop.stop();
            wobbleLoopRef.current = null;
            wobbleAnim.setValue(0);
        };
    }, [wobble, wobbleAnim]);

    const wobbleRotation = wobbleAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-6deg', '6deg'],
    });

    return (
        <TouchableOpacity
            onPress={(event) => {
                event.stopPropagation?.();
                if (longPressTriggeredRef.current) {
                    longPressTriggeredRef.current = false;
                    return;
                }
                handleToggleEventWishlist();
            }}
            onLongPress={(event) => {
                if (!onLongPress) return;
                event.stopPropagation?.();
                longPressTriggeredRef.current = true;
                onLongPress();
            }}
            onPressOut={() => {
                if (!longPressTriggeredRef.current) return;
                setTimeout(() => {
                    longPressTriggeredRef.current = false;
                }, 0);
            }}
            style={[
                styles.button,
                itemIsOnWishlist ? styles.buttonActive : styles.buttonInactive,
                {
                    height: size,
                    minWidth,
                    borderRadius: size / 2,
                    paddingHorizontal: paddingX,
                },
                containerStyle,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.75}
            delayLongPress={350}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <View style={styles.contentRow}>
                    <Animated.View style={{ transform: [{ rotate: wobbleRotation }] }}>
                        <FAIcon
                            name={iconName}
                            size={iconSize}
                            color={contentColor}
                            style={{ marginRight: gap }}
                        />
                    </Animated.View>
                    <Text style={[styles.label, { color: contentColor, fontSize }]}>
                        {label}
                    </Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceWhiteFrosted,
        borderWidth: 1,
        position: 'relative',
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    buttonActive: {
        backgroundColor: colors.brandInk,
        borderColor: colors.brandInk,
    },
    buttonInactive: {
        backgroundColor: colors.surfaceWhiteFrosted,
        borderColor: colors.borderMutedLight,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontWeight: '600',
        fontFamily: fontFamilies.body,
        letterSpacing: 0.3,
    },
});
