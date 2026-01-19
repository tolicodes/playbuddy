import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

import { MyCommunitiesSection } from './MyCommunitiesSection';
import { JoinCommunitySection } from './JoinCommunitySection';
import { logEvent } from '../../Common/hooks/logger';
import { UE } from '../../userEventTypes';
import { useAnalyticsProps } from '../../Common/hooks/useAnalytics';
import { useCommonContext } from '../../Common/hooks/CommonContext';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../components/styles';

type TabKey = 'favorite' | 'all';

const CommunitiesNav = ({ type = 'private' }: { type?: 'organizer' | 'private' }) => {
    const { myCommunities, isLoadingCommunities } = useCommonContext();
    const hasMyCommunities = useMemo(() => {
        if (type === 'organizer') {
            return myCommunities.myOrganizerPublicCommunities.length > 0;
        }
        return (
            myCommunities.myPrivateCommunities.length +
            myCommunities.myOrganizerPrivateCommunities.length
        ) > 0;
    }, [myCommunities, type]);
    const [activeTab, setActiveTab] = useState<TabKey>(() => (
        hasMyCommunities ? 'favorite' : 'all'
    ));
    const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);
    const analyticsProps = useAnalyticsProps();

    const tabs = [
        { name: 'My Communities', value: 'favorite' },
        { name: 'All Communities', value: 'all' },
    ];

    useEffect(() => {
        if (hasUserSelectedTab || isLoadingCommunities) return;
        const defaultTab: TabKey = hasMyCommunities ? 'favorite' : 'all';
        if (activeTab !== defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [activeTab, hasMyCommunities, hasUserSelectedTab, isLoadingCommunities]);

    return (
        <View style={[styles.container]}>
            <View style={styles.segmentedWrap}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                        <TouchableOpacity
                            key={tab.value}
                            onPress={() => {
                                setHasUserSelectedTab(true);
                                setActiveTab(tab.value as TabKey);
                                logEvent(UE.CommunityTabNavigatorTabClicked, {
                                    ...analyticsProps,
                                    tab_name: tab.value,
                                });
                            }}
                            style={[
                                styles.segmentedButton,
                                isActive && styles.segmentedButtonActive,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text style={isActive ? styles.segmentedTextActive : styles.segmentedText}>
                                {tab.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {
                activeTab === 'favorite' ? (
                    <MyCommunitiesSection type={type} onPressAllCommunities={() => {
                        setActiveTab('all');
                    }} />
                ) : (
                    <JoinCommunitySection type={type} />
                )
            }

        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingTop: spacing.md,
    },
    segmentedWrap: {
        flexDirection: 'row',
        alignSelf: 'center',
        padding: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceGlass,
        borderWidth: 1,
        borderColor: colors.borderOnDark,
        marginBottom: spacing.smPlus,
    },
    segmentedButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
    },
    segmentedButtonActive: {
        backgroundColor: colors.accentPurple,
        shadowColor: colors.black,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    segmentedText: {
        fontSize: fontSizes.base,
        fontWeight: '600',
        color: colors.textOnDarkMuted,
        fontFamily: fontFamilies.body,
    },
    segmentedTextActive: {
        fontSize: fontSizes.base,
        fontWeight: '700',
        color: colors.white,
        fontFamily: fontFamilies.body,
    },
});

export default CommunitiesNav;
