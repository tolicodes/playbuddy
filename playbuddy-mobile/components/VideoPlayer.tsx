import React from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import Video from 'react-native-video';

export const VideoPlayer = ({ mediaUrl, onClose }: { mediaUrl: string; onClose: () => void }) => {
    return (
        <Modal transparent animationType="fade" visible onRequestClose={onClose}>
            <View style={styles.container}>
                <Video
                    source={{ uri: mediaUrl }}
                    style={styles.video}
                    controls
                    resizeMode="contain"
                    paused={false}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    video: {
        width: '100%',
        height: '100%',
    },
});
