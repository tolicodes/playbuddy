import React, { Suspense } from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import IonIcon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { useCalendarContext } from "../../Pages/Calendar/hooks/CalendarContext";
import { useCommonContext } from "../hooks/CommonContext";
import { View } from "react-native";
import HeaderLoginButton from "../../Pages/Auth/Buttons/HeaderLoginButton";
import { CommunityDropdown, LocationAreaDropdown } from "./DefaultsMenus";
import { logEvent } from "../hooks/logger";

// Helper Components
export const CustomBackButton = ({ navigation }: { navigation: any }) => {
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


export const CustomDrawerButton = ({ navigation }: { navigation: any }) => {
    const { filters } = useCalendarContext();
    const hasFilters = !!filters.organizers.length;

    const onPressToggleDrawer = () => {
        navigation.toggleDrawer();
        logEvent('header_drawer_button_clicked');
    };
    const onPressOpenFilters = () => {
        navigation.navigate('Filters');
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
export const detailsPageHeaderOptions = ({ navigation }: { navigation: any }) => ({
    headerLeft: () => <CustomBackButton navigation={navigation} />,
});

export const headerOptions = ({ navigation }: { navigation: any }) => ({
    headerRight: () => {
        const {
            locationAreas,
            communities,
            selectedLocationArea,
            setSelectedLocationArea,
            selectedCommunity,
            setSelectedCommunity,
        } = useCommonContext();

        return (
            <View style={customStyles.rightNavContainer}>
                <CommunityDropdown
                    communities={communities.interestGroups}
                    selectedCommunity={selectedCommunity}
                    onSelectCommunity={setSelectedCommunity}
                />
                <LocationAreaDropdown
                    locationAreas={locationAreas}
                    selectedLocationArea={selectedLocationArea}
                    onSelectLocationArea={setSelectedLocationArea}
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