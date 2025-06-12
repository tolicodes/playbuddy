import React, { useRef, useState } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Carousel, { Pagination } from '@tuya-oh/react-native-snap-carousel';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { VideoPlayer } from './VideoPlayer';
import { Media } from '../Common/types/commonTypes';

const { width, height } = Dimensions.get('window');
const SLIDER_WIDTH = width;
const ITEM_WIDTH = width * 0.8;
const ITEM_HEIGHT = height * 0.7;

interface MediaCarouselProps {
    medias: Media[];
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({ medias }) => {
    const carouselRef = useRef<Carousel<string>>(null);
    const [visible, setVisible] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);

    const renderItem = ({ item: media }: { item: Media }) => (
        <ExpoImage
            source={media.thumbnail_url}
            cachePolicy="memory-disk"
            contentFit="contain"
            style={styles.slideImage}
        />
    );

    const openCarousel = () => {
        setVisible(true);
        setShowVideoPlayer(false);
    };

    const openVideoPlayer = () => {
        setVisible(true);
        setShowVideoPlayer(true);
    };

    const close = () => {
        setVisible(false);
        setShowVideoPlayer(false);
    };

    return (
        <>
            {/* Thumbnail grid */}
            <View style={styles.grid}>
                {medias.map((media, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={styles.thumbContainer}
                        onPress={() => {
                            setActiveIndex(idx);
                            if (media.type === 'video') {
                                openVideoPlayer();
                            } else {
                                openCarousel();
                            }
                        }}
                    >
                        <ExpoImage
                            source={media.thumbnail_url || media.storage_path}
                            cachePolicy="memory-disk"
                            contentFit="cover"
                            transition={200}
                            style={styles.thumb}
                        />

                    </TouchableOpacity>
                ))}
            </View>

            {/* Fullscreen swipeable carousel */}
            {visible && !showVideoPlayer && (
                <Modal visible transparent onRequestClose={close}>
                    <GestureHandlerRootView style={styles.modal}>
                        <Carousel
                            layout="default"
                            ref={carouselRef}
                            data={medias}
                            renderItem={renderItem}
                            sliderWidth={SLIDER_WIDTH}
                            itemWidth={ITEM_WIDTH}
                            firstItem={activeIndex}
                            onSnapToItem={(index) => setActiveIndex(index)}
                            enableMomentum
                            swipeThreshold={20}
                            lockScrollWhileSnapping
                        />

                        <Pagination
                            dotsLength={medias.length}
                            activeDotIndex={activeIndex}
                            carouselRef={carouselRef}
                            tappableDots
                            containerStyle={styles.pagination}
                        />

                        {/* Tap outside to close */}
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            onPress={close}
                        />
                    </GestureHandlerRootView>
                </Modal>
            )}

            {/* Video player */}
            {visible && showVideoPlayer && (
                <Modal visible transparent onRequestClose={close}>
                    <VideoPlayer mediaUrl={medias[activeIndex].storage_path} onClose={close} />
                </Modal>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    thumbContainer: {
        width: '33%',
        padding: 4,
    },
    thumb: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
    },
    modal: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    slideImage: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        resizeMode: 'contain',
    },
    pagination: {
        position: 'absolute',
        bottom: 40,
    },
});
