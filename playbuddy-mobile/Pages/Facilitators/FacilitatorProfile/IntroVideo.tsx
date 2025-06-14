import { View, StyleSheet, TouchableOpacity, Text, Modal, Dimensions, Image } from 'react-native';
import Video from 'react-native-video';
import { useRef, useState } from 'react';

export const IntroVideo = ({ url, name, onAspectRatio }: { url: string; name: string; onAspectRatio: (aspectRatio: 'portrait' | 'landscape') => void; }) => {
    const video = useRef(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const onLoad = (data: { naturalSize: { width: number; height: number } }) => {
        if (data.naturalSize.width > data.naturalSize.height) {
            onAspectRatio('landscape');
        } else {
            onAspectRatio('portrait');
        }
    };

    return (
        <View style={styles.wrapper}>
            {/* Inline Video with Overlay */}
            <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Video
                    ref={video}
                    source={{ uri: url }}
                    style={styles.video}
                    resizeMode="cover"
                    repeat
                    paused={false}
                    muted={isMuted}
                    onLoad={onLoad}
                    ignoreSilentSwitch="ignore" // allow audio even on silent mode (iOS)

                />
                <View style={styles.overlay}>
                    <Text style={styles.playText}>▶ Full Screen {name}</Text>
                </View>
                <View style={styles.muteButtonContainer}>
                    <TouchableOpacity onPress={() => setIsMuted(!isMuted)}>
                        {isMuted ? (
                            <Text style={styles.muteButton}>🔇</Text>
                        ) : (
                            <Text style={styles.muteButton}>🔊</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {/* Fullscreen Modal Video */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                onRequestClose={() => { setModalVisible(false); setIsMuted(true); }}
                supportedOrientations={['portrait', 'landscape']}
            >
                <TouchableOpacity style={styles.fullscreenContainer} onPress={() => setModalVisible(false)}>
                    <Video
                        source={{ uri: url }}
                        style={styles.fullscreenVideo}
                        resizeMode="contain"
                        controls
                        fullscreen
                        paused={false}
                        muted={isMuted}
                        ignoreSilentSwitch="ignore" // allow audio even on silent mode (iOS)
                    />
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { width: '100%', height: '100%', position: 'relative' },
    video: { width: '100%', height: '100%' },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    playText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginRight: 16,
    },
    muteButtonContainer: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
    muteButton: {
        fontSize: 32,
        color: 'white',
    },
    fullscreenContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
    },
    fullscreenVideo: {
        width: '100%',
        height: '100%',
    },
});
