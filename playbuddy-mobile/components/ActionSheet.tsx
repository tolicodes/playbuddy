import React from 'react';
import {
    Modal,
    View,
    StyleSheet,
} from 'react-native';

type Props = {
    children: React.ReactNode;
    height?: number;
    visible: boolean;
};

export const ActionSheet = ({ children, visible, height = 500 }: Props) => {
    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
        >
            <View style={styles.backdrop} />

            <View style={[styles.sheet, { height }]}>
                {children}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: '#00000088',
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
    },
});
