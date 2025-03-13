import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { detailsPageHeaderOptions } from "../Header/Header";
import { EventDetail } from "../../Pages/Calendar/EventDetail";
import { CommunityEvents } from "../../Pages/Communities/CommunityEvents";
import { Filters } from "../../Pages/Calendar/Filters/Filters";
import BuddyEvents from "../../Pages/Buddies/screens/BuddyEventsScreen";
import { PromoScreen } from "../../Pages/Auth/screens/PromoScreen";

const DetailStack = createStackNavigator();

const PromoScreenWrap = () => {
    return <PromoScreen setIsSkippingWelcomeDueToPromo={() => { }} />
}

export const DetailStackNavigator = () => (
    <DetailStack.Navigator screenOptions={detailsPageHeaderOptions}>
        <DetailStack.Screen name="Event Details" component={EventDetail} />
        <DetailStack.Screen name="Community Events" component={CommunityEvents} />
        <DetailStack.Screen name="Buddy Events" component={BuddyEvents} />
        <DetailStack.Screen name="Filters" component={Filters} />
        <DetailStack.Screen name="PromoScreen" component={PromoScreenWrap} />
    </DetailStack.Navigator>
);