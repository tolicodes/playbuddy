import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { MyCommunitiesSection } from './MyCommunitiesSection';
import { MyEvents } from './MyEvents';
import { JoinCommunitySection } from './JoinCommunitySection';

const Tab = createMaterialTopTabNavigator();

const CommunitiesNav = () => {

    return (
        <>
            <Tab.Navigator>
                <Tab.Screen name="My Communities" component={MyCommunitiesSection} />
                <Tab.Screen name="My Events" component={MyEvents} />
                <Tab.Screen name="Join Community" component={JoinCommunitySection} />
            </Tab.Navigator>
        </>
    );
};

export default CommunitiesNav;