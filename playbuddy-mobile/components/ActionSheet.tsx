import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    BackHandler,
    Easing,
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing } from './styles';

type Props = {
    children: React.ReactNode;
    height?: number;
    visible: boolean;
    onClose?: () => void;
    dismissOnBackdropPress?: boolean;
    debugId?: string;
    sheetStyle?: StyleProp<ViewStyle>;
    backdropOpacity?: number;
};

export const ActionSheet = ({
    children,
    visible,
    height = 500,
    onClose,
    dismissOnBackdropPress = false,
    debugId,
    sheetStyle,
    backdropOpacity = 0.55,
}: Props) => {
    const insets = useSafeAreaInsets();
    const [rendered, setRendered] = useState(visible);
    const animation = useRef(new Animated.Value(visible ? 1 : 0)).current;
    const logDebug = useCallback((message: string, extra?: Record<string, unknown>) => {
        if (!__DEV__ || !debugId) return;
        if (extra) {
            console.log(`[ActionSheet:${debugId}] ${message}`, extra);
        } else {
            console.log(`[ActionSheet:${debugId}] ${message}`);
        }
    }, [debugId]);
    const resolvedBackdropOpacity = Math.max(0, Math.min(backdropOpacity, 1));

    useEffect(() => {
        logDebug('visible changed', { visible, height });
        if (visible) {
            setRendered(true);
            animation.setValue(0);
            Animated.timing(animation, {
                toValue: 1,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(() => logDebug('animation open complete'));
            return;
        }
        Animated.timing(animation, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            logDebug('animation close complete', { finished });
            if (finished) {
                setRendered(false);
            }
        });
    }, [animation, height, visible, debugId, logDebug]);

    useEffect(() => {
        if (!rendered) return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            if (visible) {
                logDebug('hardware back');
                onClose?.();
                return true;
            }
            return false;
        });
        return () => {
            subscription.remove();
        };
    }, [onClose, rendered, visible, logDebug]);

    const handleBackdropPress = () => {
        if (!dismissOnBackdropPress) return;
        logDebug('backdrop press');
        onClose?.();
    };

    if (!rendered) return null;

    const backdropAnimatedOpacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, resolvedBackdropOpacity],
    });
    const sheetTranslateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [height + insets.bottom + spacing.xl, 0],
    });

    return (
        <Portal>
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={handleBackdropPress}
                    onPressIn={() => logDebug('backdrop press in')}
                    onPressOut={() => logDebug('backdrop press out')}
                >
                    <Animated.View style={[styles.backdrop, { opacity: backdropAnimatedOpacity }]} />
                </Pressable>
                <Animated.View
                    style={[
                        styles.sheet,
                        sheetStyle,
                        {
                            height,
                            paddingBottom: Math.max(insets.bottom, spacing.lg),
                            transform: [{ translateY: sheetTranslateY }],
                        },
                    ]}
                >
                    {children}
                </Animated.View>
            </View>
        </Portal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlayDeep,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surfaceWhiteOpaque,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.borderLavenderSoft,
        ...shadows.sheet,
    },
});
