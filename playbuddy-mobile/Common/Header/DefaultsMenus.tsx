import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Image } from 'expo-image';
import { logEvent } from '../hooks/logger';
import { ALL_COMMUNITIES_ID, ALL_LOCATION_AREAS_ID } from '../hooks/CommonContext';

// Icons
const COMMUNITIES_ICON_MAP: { [key: string]: React.ReactNode } = {
    'ALL': <Ionicons name="ellipsis-horizontal" size={20} color="black" />,
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

type DropdownItem = { id: string; name: string; code: string; }

interface DropdownProps {
    items: DropdownItem[];
    selectedItemId: string;
    onSelectItemId: (itemId: string) => void;
    getIcon: (code: string) => React.ReactNode;
}


interface CommunityDropdownProps {
    communities: DropdownItem[]
    selectedCommunityId: string;
    onSelectCommunityId: (communityId: string) => void;
}

interface LocationAreaDropdownProps {
    locationAreas: DropdownItem[]
    selectedLocationAreaId: string;
    onSelectLocationAreaId: (locationAreaId: string) => void;
}

interface SearchHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const ITEM_HEIGHT = 60;

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


const Menu = ({
    items,
    selectedItemId,
    onSelectItemId,
    getIcon,
}: DropdownProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const sortedItems = items.sort((a, b) => {
        if (a.name === 'ALL') return -1;
        if (b.name === 'ALL') return 1;
        return a.name.localeCompare(b.name);
    });

    if (!sortedItems) {
        return null;
    }

    const listRef = useRef<FlatList>(null);


    const filteredItems = sortedItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const scrollToLocation = useCallback(() => {
        // We need to filter on the filteredItems because the indexes change
        const index = filteredItems.findIndex(item => item.id === selectedItemId);
        setTimeout(() => {
            if (listRef.current && index !== -1 && sortedItems.length > 0) {
                listRef.current.scrollToIndex({ index, animated: true });
            }
        }, 100);
    }, [filteredItems, selectedItemId]);

    useEffect(() => {
        scrollToLocation();
    }, [sortedItems, selectedItemId]);

    const renderItem = ({ item }: { item: DropdownItem }) => {
        const isSelected = selectedItemId === item.id;
        return (
            <TouchableOpacity
                style={[
                    styles.item,
                    isSelected && styles.selectedItem
                ]}
                onPress={() => onSelectItemId(item.id)}
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
                <ActivityIndicator style={styles.loading} />
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

const Dropdown = ({
    items,
    selectedItemId,
    onSelectItemId,
    getIcon,
    title,
}: DropdownProps & { title: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);

    if (items.length === 0) {
        return (<ActivityIndicator style={styles.loading} color="#007aff" />);
    }

    const selectedItem = items.find(item => item.id === selectedItemId)!;

    return (
        <View>
            <TouchableOpacity onPress={toggleDropdown}>
                <View style={styles.codeCircle}>
                    {getIcon(selectedItem.code)}
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
                            selectedItemId={selectedItemId}
                            onSelectItemId={onSelectItemId}
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
    selectedCommunityId,
    onSelectCommunityId,
}) => {
    return (
        <Dropdown
            items={communities}
            selectedItemId={selectedCommunityId || ALL_COMMUNITIES_ID}
            onSelectItemId={(itemId) => {
                onSelectCommunityId(itemId);
                const itemName = communities.find(c => c.id === itemId)?.name;
                logEvent('defaults_menu_community_item_selected', { itemId, itemName });
            }}
            getIcon={(code) => getIcon(COMMUNITIES_ICON_MAP, code)}
            title="Communities"
        />
    );
};

export const CommunityMenu = ({
    communities,
    selectedCommunityId,
    onSelectCommunityId,
}: CommunityDropdownProps) => {
    return (
        <Menu
            items={communities}
            selectedItemId={selectedCommunityId || ALL_COMMUNITIES_ID}
            onSelectItemId={(itemId) => {
                onSelectCommunityId(itemId);
                const itemName = communities.find(c => c.id === itemId)?.name;
                logEvent('defaults_menu_community_item_selected', { itemId, itemName });
            }}
            getIcon={(code) => getIcon(COMMUNITIES_ICON_MAP, code)}
        />
    );
};

export const LocationAreaDropdown: React.FC<LocationAreaDropdownProps> = ({
    locationAreas,
    selectedLocationAreaId,
    onSelectLocationAreaId,
}) => {
    return (
        <Dropdown
            items={locationAreas}
            selectedItemId={selectedLocationAreaId || ALL_LOCATION_AREAS_ID}
            onSelectItemId={onSelectLocationAreaId}
            getIcon={(code) => getIcon(LOCATIONS_ICON_MAP, code)}
            title="Locations"
        />
    );
};

export const LocationAreaMenu = ({
    locationAreas,
    selectedLocationAreaId,
    onSelectLocationAreaId,
}: LocationAreaDropdownProps) => {
    return (
        <Menu
            items={locationAreas}
            selectedItemId={selectedLocationAreaId || ALL_LOCATION_AREAS_ID}
            onSelectItemId={(itemId) => {
                onSelectLocationAreaId(itemId);
                const itemName = locationAreas.find(l => l.id === itemId)?.name;
                logEvent('defaults_menu_location_item_selected', { itemId, itemName });
            }}
            getIcon={(code) => getIcon(LOCATIONS_ICON_MAP, code)}
        />
    );
};

// Styles
const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
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
        marginRight: 10,
        alignSelf: 'center',
    },
});

