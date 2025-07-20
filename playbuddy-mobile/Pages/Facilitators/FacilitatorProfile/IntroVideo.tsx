import { View, StyleSheet, TouchableOpacity, Text, Modal, Dimensions, Image } from 'react-native';
import Video from 'react-native-video';
import { useRef, useState } from 'react';
import { useAnalyticsProps } from '../../../Common/hooks/useAnalytics';
import { logEvent } from '../../../Common/hooks/logger';
import { UE } from '../../../userEventTypes';

export const IntroVideo = ({
    url,
    name,
    onAspectRatio,
    facilitatorId
}: {
    url: string;
    name: string;
    onAspectRatio: (aspectRatio: 'portrait' | 'landscape') => void;
    facilitatorId: string;
}) => {
    const analyticsProps = useAnalyticsProps();

    const videoRef = useRef(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isInitialVideoMuted, setIsInitialVideoMuted] = useState(false);
    const [isFullscreenVideoMuted, setIsFullscreenVideoMuted] = useState(true);

    const onLoad = (data: { naturalSize: { width: number; height: number } }) => {
        if (data.naturalSize.width > data.naturalSize.height) {
            onAspectRatio('landscape');
        } else {
            onAspectRatio('portrait');
        }
    };

    const handlePress = () => {
        setModalVisible(true);
        setIsInitialVideoMuted(true);
        setIsFullscreenVideoMuted(false);
        logEvent(UE.FacilitatorsProfileIntroVideoPressed, {
            ...analyticsProps,
            url: url,
            facilitator_id: facilitatorId,
        });
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setIsFullscreenVideoMuted(true);
        logEvent(UE.FacilitatorsProfileIntroVideoClosed, {
            ...analyticsProps,
            url: url,
            facilitator_id: facilitatorId,
        });
    };

    return (
        <View style={styles.wrapper}>
            {/* Inline Video with Overlay */}
            <TouchableOpacity onPress={handlePress}>
                <Video
                    ref={videoRef}
                    source={{ uri: url }}
                    style={styles.video}
                    resizeMode="cover"
                    repeat
                    paused={false}
                    muted={isInitialVideoMuted}
                    onLoad={onLoad}
                    ignoreSilentSwitch="ignore" // allow audio even on silent mode (iOS)
                />
                <View style={styles.overlay}>
                    <Text style={styles.playText}>▶ Full Screen {name}</Text>
                </View>
            </TouchableOpacity>

            {/* Fullscreen Modal Video */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                onRequestClose={handleModalClose}
                supportedOrientations={['portrait', 'landscape']}
            >
                <TouchableOpacity style={styles.fullscreenContainer} onPress={handleModalClose}>
                    <Video
                        source={{ uri: url }}
                        style={styles.fullscreenVideo}
                        resizeMode="contain"
                        controls
                        fullscreen
                        paused={false}
                        muted={isFullscreenVideoMuted}
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
