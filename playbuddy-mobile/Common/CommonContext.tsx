import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface LocationArea {
    id: string;
    name: string;
    code: string;
}

export interface Community {
    id: string;
    name: string;
    code: string;
}

interface CommonContextType {
    locationAreas: LocationArea[];
    selectedLocationArea: LocationArea | null;
    setSelectedLocationArea: (locationArea: LocationArea | null) => void;
    isLoadingLocationAreas: boolean;

    communities: Community[];
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

const fetchCommunities = async (): Promise<Community[]> => {
    const { data, error } = await supabase
        .from('communities')
        .select('id, name, code')
        .order('name');

    if (error) {
        throw new Error(`Error fetching communities: ${error.message}`);
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

    const { data: communities = [], isLoading: isLoadingCommunities } = useQuery({
        queryKey: ['communities'],
        queryFn: fetchCommunities,
    });

    // Set the first location and community as the selected ones
    useEffect(() => {
        const location = locationAreas.find((l) => l.id === DEFAULT_LOCATION_ID);
        setSelectedLocationArea(location || null);

        const community = communities.find((c) => c.id === DEFAULT_COMMUNITY_ID);
        setSelectedCommunity(community || null);
    }, [locationAreas, communities]);

    return (
        <CommonContext.Provider
            value={{
                locationAreas,
                selectedLocationArea,
                setSelectedLocationArea,
                isLoadingLocationAreas,

                communities,
                selectedCommunity,
                setSelectedCommunity,
                isLoadingCommunities,
            }}
        >
            {children}
        </CommonContext.Provider>
    );
};

export const useCommon = () => {
    const context = useContext(CommonContext);
    if (context === undefined) {
        throw new Error('useCommon must be used within a CommonProvider');
    }
    return context;
};