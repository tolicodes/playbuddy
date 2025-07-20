import React, { useMemo } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import { MyCommunitiesSection } from './MyCommunitiesSection';
import { MyEvents } from './MyEvents';
import { JoinCommunitySection } from './JoinCommunitySection';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';

const Tab = createMaterialTopTabNavigator();

const CommunitiesNav = ({ type = 'private' }: { type?: 'organizer' | 'private' }) => {
    const analyticsProps = useAnalyticsProps();

    const TypedMyCommunitiesSection = () => useMemo(() => <MyCommunitiesSection type={type} />, [type]);
    const TypedMyEvents = () => useMemo(() => <MyEvents type={type} />, [type]);
    const TypedJoinCommunitySection = () => useMemo(() => <JoinCommunitySection type={type} />, [type]);

    const onPressTab = (name: string) => {
        return {
            tabPress: () => {
                logEvent(UE.CommunityTabNavigatorTabClicked, {
                    tab_name: name,
                });
            }
        }
    }

    return (
        <Tab.Navigator>
            <Tab.Screen
                name="My Organizers"
                component={TypedMyCommunitiesSection}
                listeners={onPressTab('My Organizers')}
            />
            <Tab.Screen
                name="My Events"
                component={TypedMyEvents}
                listeners={onPressTab('My Events')}
            />
            <Tab.Screen
                name="Follow Organizers"
                component={TypedJoinCommunitySection}
                listeners={onPressTab('Follow Organizers')}
            />
        </Tab.Navigator>
    );
};

export default CommunitiesNav;