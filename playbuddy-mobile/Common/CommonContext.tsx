import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { UseMutationResult, useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useFetchMyCommunities, useFetchPublicCommunities, useJoinCommunity, useLeaveCommunity } from './hooks/useCommunities';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationArea {
    id: string;
    name: string;
    code: string;
}

export interface Community {
    id: string;
    name: string;
    code: string;
    organizer_id: string;
    description: string;
    visibility: string;
    type: string;
}

export interface JoinCommunityData {
    community_id: string;
    join_code?: string;
    type?: string;
}

export interface LeaveCommunityData {
    community_id: string;
}

interface CommonContextType {
    locationAreas: LocationArea[];
    selectedLocationArea: LocationArea | null;
    setSelectedLocationArea: (locationArea: LocationArea | null) => void;
    isLoadingLocationAreas: boolean;

    communities: {
        interestGroups: Community[];
        organizerPublicCommunities: Community[];
    };
    myCommunities: {
        myOrganizerPrivateCommunities: Community[];
        myPrivateCommunities: Community[];
        myOrganizerPublicCommunities: Community[];
    };

    joinCommunity: UseMutationResult<Community, Error, JoinCommunityData, unknown>

    leaveCommunity: UseMutationResult<Community, Error, LeaveCommunityData, unknown>

    selectedCommunity: Community | null;
    setSelectedCommunity: (community: Community | null) => void;
    showDefaultsModal: boolean;
    isLoadingCommunities: boolean;

}

const CommonContext = createContext<CommonContextType | undefined>(undefined);

const fetchLocationAreas = async (): Promise<LocationArea[]> => {
    const { data, error } = await supabase
        .from('location_areas')
        .select('id, name, code')
        .order('name');

    if (error) {
        throw new Error(`Error fetching locations: ${error.message}`);
    }

    return data || [];
};

const DEFAULT_LOCATION_ID = '73352aef-334c-49a6-9256-0baf91d56b49';
const DEFAULT_COMMUNITY_ID = '72f599a9-6711-4d4f-a82d-1cb66eac0b7b';

export const CommonProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedLocationArea, doSetSelectedLocationArea] = useState<LocationArea | null>(null);
    const [selectedCommunity, doSetSelectedCommunity] = useState<Community | null>(null);

    const { data: locationAreas = [], isLoading: isLoadingLocationAreas } = useQuery({
        queryKey: ['locationAreas'],
        queryFn: fetchLocationAreas,
    });

    const { data: myCommunities = [], isLoading: isLoadingMyCommunities } = useFetchMyCommunities();
    const { data: publicCommunities = [], isLoading: isLoadingPublicCommunities } = useFetchPublicCommunities();

    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();

    const communities = useMemo(() => ({
        interestGroups: publicCommunities.filter((c) => c.type === 'interest_group'),
        organizerPublicCommunities: publicCommunities.filter((c) => c.type === 'organizer_public_community'),
    }), [publicCommunities]);

    const myCommunitiesLists = useMemo(() => ({
        myOrganizerPrivateCommunities: myCommunities.filter((c) => c.type === 'organizer_private_community'),
        myPrivateCommunities: myCommunities.filter((c) => c.type === 'private_community'),
        myOrganizerPublicCommunities: myCommunities.filter((c) => c.type === 'organizer_public_community'),
    }), [myCommunities]);

    const setSelectedLocationArea = (location: LocationArea | null) => {
        doSetSelectedLocationArea(location || null);
        if (location) {
            AsyncStorage.setItem('selectedLocationArea', JSON.stringify(location));
        } else {
            AsyncStorage.removeItem('selectedLocationArea');
        }
    };

    const setSelectedCommunity = (community: Community | null) => {
        doSetSelectedCommunity(community || null);
        if (community) {
            AsyncStorage.setItem('selectedCommunity', JSON.stringify(community));
        } else {
            AsyncStorage.removeItem('selectedCommunity');
        }
    };

    // Show the defaults modal if the user hasn't selected a location or community
    const [showDefaultsModal, setShowDefaultsModal] = useState(false);

    useEffect(() => {
        const initializeDefaults = async () => {
            // wait for locationAreas and communities to load before initializing defaults

            if (!locationAreas || !communities.interestGroups) {
                return;
            }

            const [locationValue, communityValue] = await Promise.all([
                AsyncStorage.getItem('selectedLocationArea'),
                AsyncStorage.getItem('selectedCommunity')
            ]);

            // we set default values and show the modal
            if (!locationValue || !communityValue) {
                const defaultLocation = locationAreas.find((l) => l.id === DEFAULT_LOCATION_ID);
                if (defaultLocation) {
                    setSelectedLocationArea(defaultLocation);
                }

                const defaultCommunity = communities.interestGroups.find((c) => c.id === DEFAULT_COMMUNITY_ID);
                if (defaultCommunity) {
                    setSelectedCommunity(defaultCommunity);
                }

                setShowDefaultsModal(true);
                return;
            }

            doSetSelectedLocationArea(JSON.parse(locationValue || 'null'));
            doSetSelectedCommunity(JSON.parse(communityValue || 'null'));
        };

        initializeDefaults();
    }, [locationAreas, communities]);



    const contextValue = useMemo(() => ({
        locationAreas,
        selectedLocationArea,
        setSelectedLocationArea,
        isLoadingLocationAreas,

        communities,
        myCommunities: myCommunitiesLists,
        joinCommunity,
        leaveCommunity,

        selectedCommunity,
        setSelectedCommunity,
        showDefaultsModal,
        isLoadingCommunities: isLoadingMyCommunities || isLoadingPublicCommunities,
    }), [
        locationAreas,
        selectedLocationArea,
        isLoadingLocationAreas,

        communities,
        myCommunitiesLists,
        joinCommunity,
        leaveCommunity,
        selectedCommunity,
        isLoadingMyCommunities,
        isLoadingPublicCommunities,
        showDefaultsModal
    ]);

    return (
        <CommonContext.Provider value={contextValue}>
            {children}
        </CommonContext.Provider>
    );
};

export const useCommonContext = (): CommonContextType => {
    const context = useContext(CommonContext);
    if (context === undefined) {
        throw new Error('useCommon must be used within a CommonProvider');
    }
    return context;
};