import React, { useRef, useState } from 'react';
import {
    View,
    ScrollView,
    Image,
    Text,
    Dimensions,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import Video from 'react-native-video';  // ← react-native-video
import type { Media } from '../common/types/commonTypes.js';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.9;
const ITEM_HEIGHT = height * 0.6;
const DOT_SIZE = 8;
const DOT_SPACING = 8;

export const MediaCarousel = ({ medias }: { medias: Media[] }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    const openAt = (idx: number) => {
        setStartIndex(idx);
        setActiveIndex(idx);
        setModalVisible(true);
    };

    const onScrollEnd = (e: any) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
        setActiveIndex(idx);
    };

    return (
        <>
            {/* Thumbnails */}
            <View style={styles.grid}>
                {medias.map((m, i) => (
                    <TouchableOpacity
                        key={i}
                        style={styles.thumbContainer}
                        onPress={() => openAt(i)}
                    >
                        <Image
                            source={{ uri: m.thumbnail_url || m.storage_path }}
                            style={styles.thumb}
                        />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Fullscreen carousel */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modal}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        contentOffset={{ x: startIndex * width, y: 0 }}
                        onMomentumScrollEnd={onScrollEnd}
                    >
                        {medias.map((m, i) => (
                            <View style={styles.slide} key={i}>
                                {m.type === 'video' ? (
                                    <Video
                                        source={{ uri: m.storage_path }}
                                        style={styles.media}
                                        resizeMode="contain"
                                        repeat
                                        paused={i !== activeIndex}      // only play the active slide
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: m.storage_path }}
                                        style={styles.media}
                                        resizeMode="contain"
                                    />
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Dots */}
                    <View style={styles.pagination}>
                        {medias.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    activeIndex === i && styles.activeDot,
                                ]}
                            />
                        ))}
                    </View>

                    {/* Close */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setModalVisible(false)}
                    >
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    thumbContainer: {
        width: width / 3 - 8,
        margin: 4,
    },
    thumb: { width: '100%', aspectRatio: 1, borderRadius: 8 },

    modal: { flex: 1, backgroundColor: 'black' },
    slide: { width, justifyContent: 'center', alignItems: 'center' },
    media: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        borderRadius: 8,
    },

    pagination: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        width,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: 'gray',
        marginHorizontal: DOT_SPACING / 2,
    },
    activeDot: {
        backgroundColor: 'white',
        width: DOT_SIZE * 1.5,
        height: DOT_SIZE * 1.5,
        borderRadius: (DOT_SIZE * 1.5) / 2,
    },

    closeButton: { position: 'absolute', top: 40, right: 20, padding: 8 },
    closeText: { color: 'white', fontSize: 24 },
});
