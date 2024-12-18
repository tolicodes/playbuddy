import React, { useMemo } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { MyCommunitiesSection } from './MyCommunitiesSection';
import { MyEvents } from './MyEvents';
import { JoinCommunitySection } from './JoinCommunitySection';
import { LoginToAccess } from '../../Common/LoginToAccess';
import { useUserContext } from '../Auth/hooks/UserContext';

const Tab = createMaterialTopTabNavigator();

const CommunitiesNav = ({ type = 'private' }: { type?: 'organizer' | 'private' }) => {
    const { authUserId } = useUserContext();
    const TypedMyCommunitiesSection = () => useMemo(() => <MyCommunitiesSection type={type} />, [type]);
    const TypedMyEvents = () => useMemo(() => <MyEvents type={type} />, [type]);
    const TypedJoinCommunitySection = () => useMemo(() => <JoinCommunitySection type={type} />, [type]);

    if (!authUserId) {
        return <LoginToAccess entityToAccess={type === 'organizer' ? 'Organizer' : 'Communities'} />;
    }

    return (
        <Tab.Navigator>
            <Tab.Screen name="My Communities" component={TypedMyCommunitiesSection} />
            <Tab.Screen name="My Events" component={TypedMyEvents} />
            <Tab.Screen name="Join Community" component={TypedJoinCommunitySection} />
        </Tab.Navigator>
    );
};

export default CommunitiesNav;