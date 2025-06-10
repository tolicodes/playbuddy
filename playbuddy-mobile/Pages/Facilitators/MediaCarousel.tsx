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

const { width, height } = Dimensions.get('window');
const SLIDER_WIDTH = width;
const ITEM_WIDTH = width * 0.8;
const ITEM_HEIGHT = height * 0.7;

interface MediaCarouselProps {
    urls: string[];
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({ urls }) => {
    const carouselRef = useRef<Carousel<string>>(null);
    const [visible, setVisible] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const renderItem = ({ item }: { item: string }) => (
        <ExpoImage
            source={item}
            cachePolicy="memory-disk"
            contentFit="contain"
            style={styles.slideImage}
        />
    );

    return (
        <>
            {/* Thumbnail grid */}
            <View style={styles.grid}>
                {urls.map((uri, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={styles.thumbContainer}
                        onPress={() => {
                            setActiveIndex(idx);
                            setVisible(true);
                        }}
                    >
                        <ExpoImage
                            source={uri}
                            cachePolicy="memory-disk"
                            contentFit="cover"
                            transition={200}
                            style={styles.thumb}
                        />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Fullscreen swipeable carousel */}
            <Modal visible={visible} transparent onRequestClose={() => setVisible(false)}>
                <GestureHandlerRootView style={styles.modal}>
                    <Carousel
                        layout="default"
                        ref={carouselRef}
                        data={urls}
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
                        dotsLength={urls.length}
                        activeDotIndex={activeIndex}
                        carouselRef={carouselRef}
                        tappableDots
                        containerStyle={styles.pagination}
                    />

                    {/* Tap outside to close */}
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setVisible(false)}
                    />
                </GestureHandlerRootView>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
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

