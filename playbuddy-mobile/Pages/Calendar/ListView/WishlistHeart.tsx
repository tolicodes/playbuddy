import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View, ViewStyle } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { colors } from '../../../components/styles';

export const WishlistHeart = ({
    itemIsOnWishlist,
    handleToggleEventWishlist,
    size = 28,
    containerStyle,
    variant = 'outline',
}: {
    itemIsOnWishlist: boolean;
    handleToggleEventWishlist: () => void;
    size?: number;
    containerStyle?: ViewStyle;
    variant?: 'outline' | 'solid' | 'thick-outline';
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const haloSize = size + 20;
    const outlineColor = colors.danger;
    const isSolid = variant === 'solid';
    const isThickOutline = variant === 'thick-outline';
    const solidColor = itemIsOnWishlist ? colors.danger : 'rgba(255, 255, 255, 0.9)';
    const iconBoxSize = size + 8;

    useEffect(() => {
        // Run animation whenever itemIsOnWishlist changes
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.3,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
            }),
        ]).start();
    }, [itemIsOnWishlist]);

    return (
        <TouchableOpacity
            onPress={(event) => {
                event.stopPropagation?.();
                handleToggleEventWishlist();
            }}
            style={[
                styles.heartContainer,
                { width: haloSize, height: haloSize, borderRadius: haloSize / 2 },
                containerStyle,
            ]}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {isSolid ? (
                    <FAIcon
                        name="heart"
                        size={size}
                        color={solidColor}
                        style={styles.iconSolid}
                    />
                ) : (
                    <View style={[styles.iconStack, { width: iconBoxSize, height: iconBoxSize }]}>
                        <FAIcon
                            name="heart"
                            size={size}
                            color={colors.white}
                            style={styles.iconBase}
                        />
                        <FAIcon
                            name="heart-o"
                            size={isThickOutline ? size + 4 : size + 2}
                            color={outlineColor}
                            style={styles.iconOutlineBase}
                        />
                        <FAIcon
                            name="heart-o"
                            size={isThickOutline ? size + 2 : size}
                            color={outlineColor}
                            style={styles.iconTop}
                        />
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    heartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconStack: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBase: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    iconOutlineBase: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    iconTop: {
        position: 'relative',
        textAlign: 'center',
        textShadowColor: colors.shadowMedium,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    iconSolid: {
        textShadowColor: colors.shadowMedium,
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
});
