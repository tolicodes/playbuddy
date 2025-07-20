import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ACRO_COMMUNITY_ID, Community, LocationArea, useCommonContext } from '../Common/hooks/CommonContext';
import { LocationAreaMenu, CommunityMenu } from '../../../_depracated/DefaultsMenus.tsx.deprecated';
import Icon from 'react-native-vector-icons/Ionicons';
import { logEvent } from '../Common/hooks/logger';
import { useUpdateUserProfile } from '../Pages/Auth/hooks/useUserProfile';
import { useUserContext } from '../Pages/Auth/hooks/UserContext';
import { DEFAULT_LOCATION_AREA_ID, DEFAULT_COMMUNITY_ID, ALL_LOCATION_AREAS_ID, ALL_COMMUNITIES_ID } from '../Common/hooks/CommonContext';
export const PreferencesScreen = () => {
    const { authUserId } = useUserContext();
    const {
        locationAreas,
        communities,
    } = useCommonContext();

    const { selectedLocationAreaId, selectedCommunityId } = useUserContext();

    const [preferencesInfo, setPreferencesInfo] = useState('');
    const [tempSelectedLocationAreaId, setTempSelectedLocationAreaId] = useState(selectedLocationAreaId);
    const [tempSelectedCommunityId, setTempSelectedCommunityId] = useState(selectedCommunityId);
    const { mutate: updateUserProfile } = useUpdateUserProfile(authUserId || '');

    // set default values to conscious touch and NYC    
    useEffect(() => {
        const defaultLocationId = locationAreas.find((l: LocationArea) => l.id === DEFAULT_LOCATION_AREA_ID)?.id;
        if (!tempSelectedLocationAreaId && defaultLocationId) {
            setTempSelectedLocationAreaId(defaultLocationId);
        }

        const selectedCommunityId = communities.interestGroups.find((c: Community) => c.id === DEFAULT_COMMUNITY_ID)?.id;
        if (!tempSelectedCommunityId && selectedCommunityId) {
            setTempSelectedCommunityId(selectedCommunityId);
        }
    }, [locationAreas, communities]);

    // Welcome more info message for Acro
    useEffect(() => {
        if (tempSelectedCommunityId === ACRO_COMMUNITY_ID) {
            logEvent('default_community_selected_acro', { community: 'Acro' });
            setPreferencesInfo('Currently, only acro retreats are supported. Select "ALL" in the retreats tab for worldwide events.');
            setTempSelectedLocationAreaId(ALL_LOCATION_AREAS_ID);
        } else {
            setPreferencesInfo('');
        }
    }, [tempSelectedCommunityId]);

    const onPressConfirm = () => {
        updateUserProfile({
            selected_location_area_id: tempSelectedLocationAreaId || '',
            selected_community_id: tempSelectedCommunityId || '',
        });
        logEvent('personalization_modal_confirmed');
    }
    return (
        <View style={styles.container}>
            <View style={styles.infoContainer}>
                <Text style={styles.infoText}>Switch your defaults from the top right bar</Text>
                <Icon name="arrow-up" size={18} color="#007aff" style={styles.iconArrow} />
            </View>

            <Text style={styles.modalTitle}>Pick your default location and community</Text>

            <Text style={styles.sectionTitle}>Location</Text>
            <LocationAreaMenu
                locationAreas={locationAreas}
                selectedLocationAreaId={tempSelectedLocationAreaId || ALL_LOCATION_AREAS_ID}
                onSelectLocationAreaId={setTempSelectedLocationAreaId}
            />

            <Text style={styles.sectionTitle}>Community</Text>
            <CommunityMenu
                communities={communities.interestGroups}
                selectedCommunityId={tempSelectedCommunityId || ALL_COMMUNITIES_ID}
                onSelectCommunityId={setTempSelectedCommunityId}
            />
            {preferencesInfo && <Text style={styles.infoText}>{preferencesInfo}</Text>}

            <TouchableOpacity style={styles.confirmButton} onPress={onPressConfirm}>
                <Text style={styles.confirmButtonText}>Confirm & Close</Text>
            </TouchableOpacity>
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 20,
    },
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
        textAlign: 'center',
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