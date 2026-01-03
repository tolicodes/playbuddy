import React from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Pressable,
} from 'react-native';
import { colors, radius, shadows, spacing } from './styles';

type Props = {
    children: React.ReactNode;
    height?: number;
    visible: boolean;
    onClose?: () => void;
    dismissOnBackdropPress?: boolean;
};

export const ActionSheet = ({
    children,
    visible,
    height = 500,
    onClose,
    dismissOnBackdropPress = false,
}: Props) => {
    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            {dismissOnBackdropPress ? (
                <Pressable style={styles.backdrop} onPress={onClose} />
            ) : (
                <View style={styles.backdrop} />
            )}

            <View style={[styles.sheet, { height }]}>
                {children}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingBottom: spacing.xl,
        ...shadows.sheet,
    },
});
