import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { UseMutationResult, useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useFetchMyCommunities, useFetchPublicCommunities, useJoinCommunity, useLeaveCommunity } from './hooks/useCommunities';

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

    joinCommunity: UseMutationResult<Community, Error, {
        community_id: string;
        join_code?: string;
    }, unknown>

    leaveCommunity: U

    selectedCommunity: Community | null;
    setSelectedCommunity: (community: Community | null) => void;
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
    const [selectedLocationArea, setSelectedLocationArea] = useState<LocationArea | null>(null);
    const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

    const { data: locationAreas = [], isLoading: isLoadingLocationAreas } = useQuery({
        queryKey: ['locationAreas'],
        queryFn: fetchLocationAreas,
    });

    const { data: myCommunities = [], isLoading: isLoadingMyCommunities } = useFetchMyCommunities();
    const { data: publicCommunities = [], isLoading: isLoadingPublicCommunities } = useFetchPublicCommunities();

    const joinCommunity = useJoinCommunity();
    const leaveCommunity = useLeaveCommunity();


    //  'interest_group', 'organizer_public_community', 'organizer_private_community', 'private_community'

    // INTEREST GROUPS
    // For the top menu, everyone sees them
    const interestGroups = publicCommunities.filter((c) => c.type === 'interest_group');


    // ALL COMMUNITIES LIST
    const organizerPublicCommunities = publicCommunities.filter((c) => c.type === 'organizer_public_community');

    // MY COMMUNITIES LIST
    const myOrganizerPrivateCommunities = myCommunities.filter((c) => c.type === 'organizer_private_community');
    const myPrivateCommunities = myCommunities.filter((c) => c.type === 'private_community');
    const myOrganizerPublicCommunities = myCommunities.filter((c) => c.type === 'organizer_public_community');

    // ALL COMMUNITIES LIST
    const communities = {
        interestGroups,
        organizerPublicCommunities,
    }

    // MY COMMUNITIES LIST
    const myCommunitiesLists = {
        myOrganizerPrivateCommunities,
        myPrivateCommunities,
        myOrganizerPublicCommunities
    }

    // Set the first location and community as the selected ones
    useEffect(() => {
        const location = locationAreas.find((l) => l.id === DEFAULT_LOCATION_ID);
        setSelectedLocationArea(location || null);

        const community = publicCommunities.find((c) => c.id === DEFAULT_COMMUNITY_ID);
        setSelectedCommunity(community || null);
    }, [locationAreas, publicCommunities]);

    return (
        <CommonContext.Provider
            value={{
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
                isLoadingCommunities: isLoadingMyCommunities || isLoadingPublicCommunities,
            }}
        >
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