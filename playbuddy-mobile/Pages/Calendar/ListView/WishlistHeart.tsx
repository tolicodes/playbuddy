import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View, ViewStyle } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';

export const WishlistHeart = ({
    itemIsOnWishlist,
    handleToggleEventWishlist,
    backgroundColor,
    size = 28,
    containerStyle,
}: {
    itemIsOnWishlist: boolean;
    handleToggleEventWishlist: () => void;
    backgroundColor?: string;
    size?: number;
    containerStyle?: ViewStyle;
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

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
            onPress={handleToggleEventWishlist}
            style={[styles.heartContainer, containerStyle]}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <View style={styles.iconStack}>
                    {backgroundColor && itemIsOnWishlist && (
                        <FAIcon
                            name="heart"
                            size={size}
                            color={backgroundColor}
                            style={styles.iconBase}
                        />
                    )}
                    <FAIcon
                        name={itemIsOnWishlist ? 'heart' : 'heart-o'}
                        size={size}
                        color="red"
                        style={styles.iconTop}
                    />
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    heartContainer: {
        padding: 4,
    },
    iconStack: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBase: {
        position: 'absolute',
    },
    iconTop: {
        position: 'relative',
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
