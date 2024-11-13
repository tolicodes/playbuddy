import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Community } from '../Common/CommonContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ALL_ITEM } from './const';

// Icons
const COMMUNITIES_ICON_MAP: { [key: string]: React.ReactNode } = {
    'All': <Ionicons name="ellipsis-horizontal" size={20} color="black" />,
    'CT': <Ionicons name="hand-right-outline" size={20} color="black" />,
    'ACR': <Image source={{ uri: 'https://bsslnznasebtdktzxjqu.supabase.co/storage/v1/object/public/misc/acro_icon.png' }} style={{ width: 30, height: 30 }} />
};

const LOCATIONS_ICON_MAP: { [key: string]: React.ReactNode } = {
    'ALL': <Text>🌍</Text>,
    'NYC': <Text>🗽</Text>,
    'LVG': <Text>🌴</Text>,
    'SDG': <Text>🌞</Text>,
    'SFR': <Text>🌉</Text>,
    'LA': <Text>🌆</Text>,
    'SJ': <Text>🌲</Text>,
    'MX': <Text>🇲🇽</Text>,
    'HR': <Text>🇭🇷</Text>,
    'CR': <Text>🇨🇷</Text>,
};

const getIcon = (map: { [key: string]: React.ReactNode }, code: string) => {
    return map[code] ? (
        <Text style={styles.codeTextEmoji}>
            {map[code]}
        </Text>
    ) : (
        <Text style={styles.codeText}>{code}</Text>
    );
};

// Types
interface DropdownProps<T> {
    items: T[];
    selectedItem: T | null;
    onSelectItem: (item: T | null) => void;
    getIcon: (code: string) => React.ReactNode;
}

interface CommunityDropdownProps {
    communities: Community[];
    selectedCommunity: Community | null;
    onSelectCommunity: (community: Community | null) => void;
}

interface LocationAreaDropdownProps {
    locationAreas: { id: string; name: string; code: string; }[];
    selectedLocationArea: { id: string; name: string; code: string; } | null;
    onSelectLocationArea: (locationArea: { id: string; name: string; code: string; } | null) => void;
}

interface SearchHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const ITEM_HEIGHT = 60;

// Styles
const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%', // Full width
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        height: '85%',
    },
    iconArrow: {
        marginLeft: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007aff',
        marginVertical: 10,
        alignSelf: 'flex-start',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        width: '100%',
        height: ITEM_HEIGHT,
    },
    selectedItem: {
        backgroundColor: '#007aff',
        width: '100%',
    },
    itemName: {
        fontSize: 16,
    },
    selectedText: {
        fontWeight: '700',
        color: 'white',
    },
    codeCircle: {
        width: 35,
        height: 35,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    menuContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        marginBottom: 15,
    },
    closeButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#007aff',
        borderRadius: 8,
        width: '100%', // Full width
        alignItems: 'center', // Center text
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    searchHeader: {
        width: '100%' // Full width
    },
    searchInput: {
        height: 40,
        borderBottomWidth: 1,
        borderColor: '#e0e0e0',
        paddingHorizontal: 10,
        width: '100%' // Full width
    },
    codeTextEmoji: {
        fontWeight: 'bold',
        fontSize: 20,
    },
    codeText: {
        fontWeight: 'bold',
        fontSize: 11,
        textAlign: 'center',
    },
    loading: {
        marginTop: 10,
    },
});

// Components
const SearchHeader: React.FC<SearchHeaderProps> = ({ searchQuery, setSearchQuery }) => (
    <View style={styles.searchHeader}>
        <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
        />
    </View>
);

const Menu = <T extends { id: string; name: string; code: string; }>({
    items,
    selectedItem,
    onSelectItem,
    getIcon,
}: DropdownProps<T>) => {
    const [searchQuery, setSearchQuery] = useState('');

    if (!items) {
        return null;
    }

    const listRef = useRef<FlatList>(null);

    const itemsWithAll = [
        ALL_ITEM as T,
        ...items,
    ];

    const filteredItems = itemsWithAll.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const scrollToLocation = () => {
        // We need to filter on the filteredItems because the indexes change
        const index = filteredItems.findIndex(item => item.id === selectedItem?.id);
        setTimeout(() => {
            if (listRef.current && index !== -1 && items.length > 0) {
                listRef.current.scrollToIndex({ index, animated: true });
            }
        }, 100);
    }

    useEffect(() => {
        scrollToLocation();
    }, [items, selectedItem]);

    const renderItem = ({ item }: { item: T }) => {
        const isSelected = selectedItem?.id === item.id;
        return (
            <TouchableOpacity
                style={[
                    styles.item,
                    isSelected && styles.selectedItem
                ]}
                onPress={() => onSelectItem(item)}
            >
                <View style={styles.codeCircle}>
                    {getIcon(item.code)}
                </View>
                <Text style={[styles.itemName, isSelected && styles.selectedText]}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const loading = items.length === 0;


    return (
        <View style={styles.menuContainer}>
            <SearchHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            {loading ? (
                <ActivityIndicator size="large" color="#007aff" style={styles.loading} />
            ) : (
                <FlatList
                    ref={listRef}
                    data={filteredItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    onScrollToIndexFailed={(e) => {
                        console.log('failed to scroll to index', e);
                    }}
                    getItemLayout={(data, index) => (
                        { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
                    )}
                    initialNumToRender={1000}
                />
            )}
        </View>
    );
};

const Dropdown = <T extends { id: string; name: string; code: string; }>({
    items,
    selectedItem,
    onSelectItem,
    getIcon,
    title,
}: DropdownProps<T> & { title: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelect = (item: T | null) => {
        onSelectItem(item);
        setIsOpen(false);
    };

    return (
        <View>
            <TouchableOpacity onPress={toggleDropdown}>
                <View style={styles.codeCircle}>
                    {getIcon(selectedItem?.code || 'ALL')}
                </View>
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <Menu
                            items={items}
                            selectedItem={selectedItem}
                            onSelectItem={handleSelect}
                            getIcon={getIcon}
                        />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setIsOpen(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Exports
export const CommunityDropdown: React.FC<CommunityDropdownProps> = ({
    communities,
    selectedCommunity,
    onSelectCommunity,
}) => (
    <Dropdown
        items={communities}
        selectedItem={selectedCommunity}
        onSelectItem={onSelectCommunity}
        getIcon={(code) => getIcon(COMMUNITIES_ICON_MAP, code)}
        title="Communities"
    />
);

export const CommunityMenu = ({
    communities,
    selectedCommunity,
    onSelectCommunity,
}: CommunityDropdownProps) => (
    <Menu
        items={communities}
        selectedItem={selectedCommunity}
        onSelectItem={onSelectCommunity}
        getIcon={(code) => getIcon(COMMUNITIES_ICON_MAP, code)}
    />
);

export const LocationAreaDropdown: React.FC<LocationAreaDropdownProps> = ({
    locationAreas,
    selectedLocationArea,
    onSelectLocationArea,
}) => (
    <Dropdown
        items={locationAreas}
        selectedItem={selectedLocationArea}
        onSelectItem={onSelectLocationArea}
        getIcon={(code) => getIcon(LOCATIONS_ICON_MAP, code)}
        title="Locations"
    />
);

export const LocationAreaMenu = ({
    locationAreas,
    selectedLocationArea,
    onSelectLocationArea,
}: LocationAreaDropdownProps) => (
    <Menu
        items={locationAreas}
        selectedItem={selectedLocationArea}
        onSelectItem={onSelectLocationArea}
        getIcon={(code) => getIcon(LOCATIONS_ICON_MAP, code)}
    />
);

export default CommunityDropdown;
