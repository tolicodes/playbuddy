import React from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Pressable,
} from 'react-native';

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
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: -4 },
        shadowRadius: 12,
        elevation: 12,
    },
});
