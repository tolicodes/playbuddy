import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import IonIcon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { useCalendarContext } from "../Calendar/CalendarContext";
import { useCommonContext } from "../Common/CommonContext";
import { View } from "react-native";
import * as amplitude from '@amplitude/analytics-react-native';
import HeaderLoginButton from "../Auth/HeaderLoginButton";
import { CommunityDropdown, LocationAreaDropdown } from "../Header/DefaultsMenus";

// Helper Components
export const CustomBackButton = ({ navigation }: { navigation: any }) => (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingLeft: 10 }}>
        <IonIcon name="chevron-back" size={30} color="#007AFF" />
    </TouchableOpacity>
);

export const CustomDrawerButton = ({ navigation }: { navigation: any }) => {
    const { filters } = useCalendarContext();
    const hasFilters = !!filters.organizers.length;

    const onPressOpenFilters = () => {
        amplitude.logEvent('calendar_filters_clicked');
        navigation.navigate('Filters');
    };

    return (
        <View style={{ marginLeft: 15, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
                <IonIcon name="menu" size={30} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterIcon} onPress={onPressOpenFilters}>
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
            <View style={styles.rightNavContainer}>
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
                <HeaderLoginButton headerButton={true} />
            </View>
        );
    },
    headerLeft: () => <CustomDrawerButton navigation={navigation} />
});

const styles = StyleSheet.create({
    rightNavContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    filterIcon: {
        marginLeft: 10,
    },
});