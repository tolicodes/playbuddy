import React, { useMemo } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { MyCommunitiesSection } from './MyCommunitiesSection';
import { MyEvents } from './MyEvents';
import { JoinCommunitySection } from './JoinCommunitySection';

const Tab = createMaterialTopTabNavigator();

const CommunitiesNav = ({ type = 'private' }: { type?: 'organizer' | 'private' }) => {
    const TypedMyCommunitiesSection = () => useMemo(() => <MyCommunitiesSection type={type} />, [type]);
    const TypedMyEvents = () => useMemo(() => <MyEvents type={type} />, [type]);
    const TypedJoinCommunitySection = () => useMemo(() => <JoinCommunitySection type={type} />, [type]);

    return (
        <Tab.Navigator>
            <Tab.Screen name="My Organizers" component={TypedMyCommunitiesSection} />
            <Tab.Screen name="My Events" component={TypedMyEvents} />
            <Tab.Screen name="Follow Organizers" component={TypedJoinCommunitySection} />
        </Tab.Navigator>
    );
};

export default CommunitiesNav;