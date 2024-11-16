import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { UseMutationResult, useQuery } from '@tanstack/react-query';
import { useFetchMyCommunities, useFetchPublicCommunities, useJoinCommunity, useLeaveCommunity } from './hooks/useCommunities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ALL_ITEM } from '../Header/const';

export const ACRO_COMMUNITY_ID = '89d31ff0-05bf-4fa7-98e0-3376b44b4997';

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

    joinCommunity: UseMutationResult<Community, Error, JoinCommunityData, unknown>;

    leaveCommunity: UseMutationResult<Community, Error, LeaveCommunityData, unknown>;

    selectedCommunity: Community | AllSelection | null;
    setSelectedCommunity: (community: Community | AllSelection | null) => void;
    showDefaultsModal: boolean;
    setShowDefaultsModal: (show: boolean) => void;
    isLoadingCommunities: boolean;

    preferencesInfo: string;
}

const CommonContext = createContext<CommonContextType | undefined>(undefined);


const useFetchLocationAreas = () => {
    const { data: locationAreas = [], isLoading: isLoadingLocationAreas } = useQuery({
        queryKey: ['locationAreas'],
        queryFn: async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/personalization/location-areas`);
                return response.data;
            } catch (error) {
                console.error('Error fetching location areas', error);
                return [];
            }
        },
    });

    return { locationAreas, isLoadingLocationAreas };
};

export type AllSelection = typeof ALL_ITEM;

export const CommonProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedLocationArea, doSetSelectedLocationArea] = useState<LocationArea | null>(null);
    const [selectedCommunity, doSetSelectedCommunity] = useState<Community | AllSelection | null>(null);

    const { locationAreas, isLoadingLocationAreas } = useFetchLocationAreas();
    const { data: myCommunities = [], isLoading: isLoadingMyCommunities } = useFetchMyCommunities();
    const { data: publicCommunities = [], isLoading: isLoadingPublicCommunities } = useFetchPublicCommunities();

    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();

    const communities = useMemo(
        () => ({
            interestGroups: publicCommunities.filter((c) => c.type === 'interest_group'),
            organizerPublicCommunities: publicCommunities.filter((c) => c.type === 'organizer_public_community'),
        }),
        [publicCommunities]
    );

    const myCommunitiesLists = useMemo(
        () => ({
            myOrganizerPrivateCommunities: myCommunities.filter((c) => c.type === 'organizer_private_community'),
            myPrivateCommunities: myCommunities.filter((c) => c.type === 'private_community'),
            myOrganizerPublicCommunities: myCommunities.filter((c) => c.type === 'organizer_public_community'),
        }),
        [myCommunities]
    );

    const SELECTED_LOCATION_AREA_KEY = 'selectedLocationArea';
    const SELECTED_COMMUNITY_KEY = 'selectedCommunity';

    const setSelectedLocationArea = (location: LocationArea | null) => {
        doSetSelectedLocationArea(location || null);
        if (location) {
            AsyncStorage.setItem(SELECTED_LOCATION_AREA_KEY, JSON.stringify(location));
        } else {
            AsyncStorage.removeItem(SELECTED_LOCATION_AREA_KEY);
        }
    };

    const setSelectedCommunity = (community: Community | AllSelection | null) => {
        doSetSelectedCommunity(community || null);
        if (community) {
            AsyncStorage.setItem(SELECTED_COMMUNITY_KEY, JSON.stringify(community));
        } else {
            AsyncStorage.removeItem(SELECTED_COMMUNITY_KEY);
        }
    };

    // Welcome more info message
    useEffect(() => {
        if (selectedCommunity?.id === ACRO_COMMUNITY_ID) {
            setSelectedLocationArea(ALL_ITEM); // Fixing the type error by setting it to null
        }
    }, [selectedCommunity]);

    // Show the defaults modal if the user hasn't selected a location or community
    const [showDefaultsModal, setShowDefaultsModal] = useState(false);

    useEffect(() => {
        const initializeDefaults = async () => {
            // wait for locationAreas and communities to load before initializing defaults

            if (!locationAreas || !communities.interestGroups) {
                return;
            }

            if (selectedLocationArea && selectedCommunity) {
                return;
            }

            const [locationValue, communityValue] = await Promise.all([
                AsyncStorage.getItem(SELECTED_LOCATION_AREA_KEY),
                AsyncStorage.getItem(SELECTED_COMMUNITY_KEY),
            ]);

            // we set default values and show the modal
            if (!locationValue || !communityValue) {
                setShowDefaultsModal(true);
                return;
            }

            doSetSelectedLocationArea(JSON.parse(locationValue || 'null'));
            doSetSelectedCommunity(JSON.parse(communityValue || 'null'));
        };

        initializeDefaults();
    }, [locationAreas, communities.interestGroups]);

    const contextValue = useMemo(
        () => ({
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
            setShowDefaultsModal,
            isLoadingCommunities: isLoadingMyCommunities || isLoadingPublicCommunities,
        }),
        [
            locationAreas,
            selectedLocationArea,
            isLoadingLocationAreas,

            communities,

            myCommunitiesLists,
            joinCommunity,
            leaveCommunity,
            selectedCommunity,
            setSelectedCommunity,
            isLoadingMyCommunities,
            isLoadingPublicCommunities,
            showDefaultsModal,
            setShowDefaultsModal,
        ]
    );

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