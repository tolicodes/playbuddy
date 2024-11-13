import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ACRO_COMMUNITY_ID, Community, LocationArea, useCommonContext } from '../CommonContext';
import { LocationAreaMenu, CommunityMenu } from '../../Header/DefaultsMenus';
import Icon from 'react-native-vector-icons/Ionicons';
import { ALL_ITEM } from '../../Header/const';

export const PreferencesScreen = ({ onClose }: { onClose: () => void }) => {
    const {
        locationAreas,
        communities,
        selectedCommunity,
        setSelectedCommunity,
        selectedLocationArea,
        setSelectedLocationArea,
        showDefaultsModal,
        setShowDefaultsModal,
    } = useCommonContext();

    const DEFAULT_LOCATION_ID = '73352aef-334c-49a6-9256-0baf91d56b49';
    const DEFAULT_COMMUNITY_ID = '72f599a9-6711-4d4f-a82d-1cb66eac0b7b'

    const [preferencesInfo, setPreferencesInfo] = useState('');
    const [tempSelectedLocationArea, setTempSelectedLocationArea] = useState(selectedLocationArea);
    const [tempSelectedCommunity, setTempSelectedCommunity] = useState(selectedCommunity);

    // set default values
    useEffect(() => {
        const defaultLocation = locationAreas.find((l: LocationArea) => l.id === DEFAULT_LOCATION_ID);
        if (defaultLocation) {
            setTempSelectedLocationArea(defaultLocation);
        }

        const defaultCommunity = communities.interestGroups.find((c: Community) => c.id === DEFAULT_COMMUNITY_ID);
        if (defaultCommunity) {
            setTempSelectedCommunity(defaultCommunity);
        }
    }, [locationAreas, communities]);

    // Welcome more info message
    useEffect(() => {
        if (tempSelectedCommunity?.id === ACRO_COMMUNITY_ID) {
            setPreferencesInfo('Currently, only acro retreats are supported. Select "ALL" in the retreats tab for worldwide events.');
            setTempSelectedLocationArea(ALL_ITEM); // Fixing the type error by setting it to null
        } else {
            setPreferencesInfo('');
        }
    }, [tempSelectedCommunity]);

    const onPressConfirm = () => {
        setSelectedLocationArea(tempSelectedLocationArea);
        setSelectedCommunity(tempSelectedCommunity);
        setShowDefaultsModal(false);
        onClose();
    }
    return (
        <View style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Text style={styles.modalTitle}>Pick your default options</Text>
            <View style={styles.infoContainer}>
                <Text style={styles.infoText}>Switch your defaults from the top right bar</Text>
                <Icon name="arrow-up" size={18} color="#007aff" style={styles.iconArrow} />
            </View>

            <Text style={styles.sectionTitle}>Location</Text>
            <LocationAreaMenu
                locationAreas={locationAreas}
                selectedLocationArea={tempSelectedLocationArea}
                onSelectLocationArea={setTempSelectedLocationArea}
            />

            <Text style={styles.sectionTitle}>Community</Text>
            <CommunityMenu
                communities={communities.interestGroups}
                selectedCommunity={tempSelectedCommunity}
                onSelectCommunity={setTempSelectedCommunity}
            />
            {preferencesInfo && <Text style={styles.infoText}>{preferencesInfo}</Text>}

            <TouchableOpacity style={styles.confirmButton} onPress={onPressConfirm}>
                <Text style={styles.confirmButtonText}>Confirm & Close</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
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
    infoText: {
        fontSize: 13,
        textAlign: 'center',
        color: '#666',
        marginBottom: 10,
    },
    confirmButton: {
        paddingVertical: 15,
        backgroundColor: '#E0E0E0',
        borderRadius: 10,
        alignItems: 'center'
    },
    confirmButtonText: {
        fontSize: 16,
        color: '#333'
    }
});