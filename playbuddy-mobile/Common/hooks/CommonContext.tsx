import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFetchMyCommunities, useFetchPublicCommunities } from './useCommunities';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

export const ACRO_COMMUNITY_ID = '89d31ff0-05bf-4fa7-98e0-3376b44b4997';
export const DEFAULT_LOCATION_AREA_ID = '73352aef-334c-49a6-9256-0baf91d56b49';
export const DEFAULT_COMMUNITY_ID = '72f599a9-6711-4d4f-a82d-1cb66eac0b7b'
export const ALL_COMMUNITIES_ID = 'b9ca5033-cdf9-40f5-aae8-24afbcb25f24';
export const ALL_LOCATION_AREAS_ID = 'cd98687a-3dca-426e-bd82-7bf47d4d4754';

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
    isLoadingLocationAreas: boolean;

    communities: {
        interestGroups: Community[];
        organizerPublicCommunities: Community[];
        allCommunities: Community[];
    };
    myCommunities: {
        myOrganizerPrivateCommunities: Community[];
        myPrivateCommunities: Community[];
        myOrganizerPublicCommunities: Community[];
        allMyCommunities: Community[];
    };


    isLoadingCommunities: boolean;

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


export const CommonProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { locationAreas, isLoadingLocationAreas } = useFetchLocationAreas();
    const { data: myCommunities = [], isLoading: isLoadingMyCommunities } = useFetchMyCommunities();
    const { data: publicCommunities = [], isLoading: isLoadingPublicCommunities } = useFetchPublicCommunities();

    const communities = useMemo(
        () => ({
            interestGroups: publicCommunities.filter((c) => c.type === 'interest_group'),
            organizerPublicCommunities: publicCommunities.filter((c) => c.type === 'organizer_public_community'),
            allCommunities: [...publicCommunities, ...myCommunities],
        }),
        [publicCommunities, myCommunities]
    );

    const myCommunitiesLists = useMemo(
        () => ({
            myOrganizerPrivateCommunities: myCommunities.filter((c) => c.type === 'organizer_private_community'),
            myPrivateCommunities: myCommunities.filter((c) => c.type === 'private_community'),
            myOrganizerPublicCommunities: myCommunities.filter((c) => c.type === 'organizer_public_community'),
            allMyCommunities: myCommunities
        }),
        [myCommunities]
    );


    const contextValue = useMemo(
        () => ({
            locationAreas,
            isLoadingLocationAreas,

            communities,
            myCommunities: myCommunitiesLists,
            isLoadingCommunities: isLoadingMyCommunities || isLoadingPublicCommunities,
        }),
        [
            locationAreas,
            isLoadingLocationAreas,

            communities,

            myCommunitiesLists,
            isLoadingMyCommunities,
            isLoadingPublicCommunities,
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