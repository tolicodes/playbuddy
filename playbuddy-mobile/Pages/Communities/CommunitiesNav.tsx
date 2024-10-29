import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { MyCommunitiesSection } from './MyCommunitiesSection';
import { CommunitiesManageSection } from './CommunitiesManageSection';
import { PrivateEventsSection } from './PrivateEventsSection';

const Tab = createMaterialTopTabNavigator();

const CommunitiesNav = () => {

    return (
        <>
            <Tab.Navigator>
                <Tab.Screen name="My Communities" component={MyCommunitiesSection} />
                <Tab.Screen name="Private Events" component={PrivateEventsSection} />
                <Tab.Screen name="Manage Communities" component={CommunitiesManageSection} />
            </Tab.Navigator>
        </>
    );
};

export default CommunitiesNav;