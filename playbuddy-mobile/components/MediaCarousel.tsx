import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    FlatList,
    Image,
    Text,
    Dimensions,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video';
import type { Media } from '../Common/types/commonTypes.js';

const { width, height } = Dimensions.get('window');
const DOT_SIZE = 8;
const DOT_SPACING = 8;

export const MediaCarousel = ({ medias }: { medias: Media[] }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);

    // track which items have finished loading
    const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});

    const gridRef = useRef<FlatList>(null);
    const carouselRef = useRef<FlatList>(null);

    const openAt = (idx: number) => {
        setStartIndex(idx);
        setActiveIndex(idx);
        // reset loader for *this* index only
        setLoadedMap(m => ({ ...m, [idx]: false }));
        setModalVisible(true);
    };

    useEffect(() => {
        if (modalVisible && carouselRef.current) {
            carouselRef.current.scrollToIndex({ index: startIndex, animated: false });
        }
    }, [modalVisible]);

    const onLoadEnd = (index: number) => {
        setLoadedMap(m => ({ ...m, [index]: true }));
    };

    const renderThumbnail = ({ item: m, index }: { item: Media; index: number }) => (
        <TouchableOpacity style={styles.thumbContainer} onPress={() => openAt(index)}>
            <Image
                source={{ uri: m.thumbnail_url || m.storage_path }}
                style={styles.thumb}
            />
        </TouchableOpacity>
    );

    const renderSlide = ({ item: m, index }: { item: Media; index: number }) => {
        const isLoaded = loadedMap[index] === true;

        return (
            <View style={styles.slide} key={index}>
                {!isLoaded && (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                )}

                {m.type === 'video' ? (
                    <Video
                        source={{ uri: m.storage_path }}
                        style={styles.media}
                        resizeMode="contain"
                        repeat
                        paused={activeIndex !== index}
                        onReadyForDisplay={() => onLoadEnd(index)}    // fires when first frame is ready
                    />
                ) : (
                    <Image
                        source={{ uri: m.storage_path }}
                        style={styles.media}
                        resizeMode="contain"
                        onLoadEnd={() => onLoadEnd(index)}
                    />
                )}
            </View>
        );
    };

    return (
        <>
            {/* 1) Scrollable thumbnail grid */}
            <FlatList
                ref={gridRef}
                data={medias}
                keyExtractor={(_, i) => i.toString()}
                numColumns={3}
                style={styles.gridList}
                contentContainerStyle={styles.grid}
                showsVerticalScrollIndicator={false}
                renderItem={renderThumbnail}
            />

            {/* 2) Fullscreen carousel */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modal}>
                    <FlatList
                        ref={carouselRef}
                        data={medias}
                        keyExtractor={(_, i) => i.toString()}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={startIndex}
                        getItemLayout={(_, idx) => ({
                            length: width,
                            offset: width * idx,
                            index: idx,
                        })}
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={e => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                            setActiveIndex(idx);
                            // no resetting here—once loaded, we keep it true
                        }}
                        renderItem={renderSlide}
                        extraData={loadedMap}
                    />

                    <View style={styles.pagination}>
                        {medias.map((_, i) => (
                            <View
                                key={i}
                                style={[styles.dot, activeIndex === i && styles.activeDot]}
                            />
                        ))}
                    </View>

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
    gridList: { flex: 1 },
    grid: { padding: 4 },
    thumbContainer: {
        width: width / 3 - 8,
        margin: 4,
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
    },
    slide: {
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width,
        height,
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
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

    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        padding: 8,
    },
    closeText: {
        color: 'white',
        fontSize: 24,
    },
});
