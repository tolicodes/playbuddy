import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';

export const WishlistHeart = ({ itemIsOnWishlist, handleToggleEventWishlist }: { itemIsOnWishlist: boolean; handleToggleEventWishlist: () => void }) => {
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
        <TouchableOpacity onPress={handleToggleEventWishlist} style={styles.heartContainer}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <FAIcon
                    name={itemIsOnWishlist ? 'heart' : 'heart-o'}
                    size={25}
                    color="red"
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    heartContainer: {
        paddingLeft: 10
    },
});
