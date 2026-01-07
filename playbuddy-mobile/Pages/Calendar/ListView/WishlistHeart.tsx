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
    variant?: 'outline' | 'solid';
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const haloSize = size + 14;
    const outlineColor = colors.danger;
    const isSolid = variant === 'solid';
    const solidColor = itemIsOnWishlist ? colors.danger : 'rgba(255, 255, 255, 0.9)';

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
                    <View style={styles.iconStack}>
                        <FAIcon
                            name="heart"
                            size={size}
                            color="rgba(255, 255, 255, 0.8)"
                            style={styles.iconBase}
                        />
                        <FAIcon
                            name="heart-o"
                            size={size + 2}
                            color={outlineColor}
                            style={styles.iconOutlineBase}
                        />
                        <FAIcon
                            name="heart-o"
                            size={size}
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
    },
    iconOutlineBase: {
        position: 'absolute',
    },
    iconTop: {
        position: 'relative',
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
