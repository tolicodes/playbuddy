import React, { Suspense } from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import IonIcon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useCalendarContext } from "../../Pages/Calendar/hooks/CalendarContext";
import { ALL_COMMUNITIES_ID, ALL_LOCATION_AREAS_ID, useCommonContext } from "../hooks/CommonContext";
import { View } from "react-native";
import HeaderLoginButton from "../../Pages/Auth/Buttons/LoginButton";
import { CommunityDropdown, LocationAreaDropdown } from "./DefaultsMenus";
import { logEvent } from "../hooks/logger";
import { useUserContext } from "../../Pages/Auth/hooks/UserContext";
import { useUpdateUserProfile } from "../../Pages/Auth/hooks/useUserProfile";
import { NavStack } from "../Nav/NavStackType";

// Helper Components
export const CustomBackButton = ({ navigation }: { navigation: NavStack }) => {
    const onPress = () => {
        navigation.goBack();
        logEvent('header_back_button_clicked');
    }
    return (
        <TouchableOpacity onPress={onPress} style={customStyles.backButton}>
            <IonIcon name="chevron-back" size={30} color="#007AFF" />
        </TouchableOpacity>
    );
};


export const CustomDrawerButton = ({ navigation }: { navigation: NavStack }) => {
    const { filters } = useCalendarContext();
    const hasFilters = !!filters.organizers.length;

    const onPressToggleDrawer = () => {
        navigation.toggleDrawer();
        logEvent('header_drawer_button_clicked');
    };
    const onPressOpenFilters = () => {
        navigation.navigate('Details', { screen: 'Filters' });
        logEvent('header_filter_button_clicked');
    };

    return (
        <View style={customStyles.drawerButtonContainer}>
            <TouchableOpacity onPress={onPressToggleDrawer}>
                <IonIcon name="menu" size={30} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={customStyles.filterIcon} onPress={onPressOpenFilters}>
                <FAIcon name="filter" size={20} color={hasFilters ? "#007AFF" : "#8E8E93"} />
            </TouchableOpacity>
        </View>
    );
};


// Navigation Options
export const detailsPageHeaderOptions = ({ navigation }: { navigation: NavStack }) => ({
    headerLeft: () => <CustomBackButton navigation={navigation} />,
});

export const headerOptions = ({ navigation }: { navigation: NavStack }) => ({
    headerRight: () => {
        const {
            locationAreas,
            communities,
        } = useCommonContext();

        const { selectedLocationAreaId, selectedCommunityId } = useUserContext();

        const { authUserId } = useUserContext();
        const { mutate: updateUserProfile } = useUpdateUserProfile(authUserId || '');

        const setSelectedLocationAreaId = (locationAreaId: string | null) => {
            updateUserProfile({ selected_location_area_id: locationAreaId });
        };

        const setSelectedCommunityId = (communityId: string | null) => {
            updateUserProfile({ selected_community_id: communityId });
        };

        return (
            <View style={customStyles.rightNavContainer}>
                <CommunityDropdown
                    communities={communities.interestGroups}
                    selectedCommunityId={selectedCommunityId || ALL_COMMUNITIES_ID}
                    onSelectCommunityId={setSelectedCommunityId}
                />
                <LocationAreaDropdown
                    locationAreas={locationAreas}
                    selectedLocationAreaId={selectedLocationAreaId || ALL_LOCATION_AREAS_ID}
                    onSelectLocationAreaId={setSelectedLocationAreaId}
                />
                <Suspense fallback={<ActivityIndicator />}>
                    <HeaderLoginButton headerButton={true} />
                </Suspense>
            </View>
        );
    },
    headerLeft: () => <CustomDrawerButton navigation={navigation} />
});

const customStyles = StyleSheet.create({
    rightNavContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    filterIcon: {
        marginLeft: 10,
    },
    backButton: {
        paddingLeft: 10,
    },
    drawerButtonContainer: {
        marginLeft: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
});