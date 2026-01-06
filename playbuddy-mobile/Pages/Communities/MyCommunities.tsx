import React, { useState } from "react";
import { Text, TouchableOpacity, FlatList, StyleSheet, View, Button, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Community, useCommonContext } from "../../Common/hooks/CommonContext";
import { useNavigation } from "@react-navigation/native";
import { UseMutationResult } from "@tanstack/react-query";
import { logEvent } from "../../Common/hooks/logger";
import { NavStack } from "../../Common/Nav/NavStackType";
import { useLeaveCommunity } from "../../Common/hooks/useCommunities";
import { UE } from "../../userEventTypes";
import { useAnalyticsProps } from "../../Common/hooks/useAnalytics";
import { colors, fontFamilies, fontSizes, radius, shadows, spacing } from "../../components/styles";

const CommunityList = ({
    title,
    communities,
    onClickLeave,
    showSearch = false
}: {
    title: string,
    communities: Community[],
    onClickLeave: UseMutationResult<Community, Error, unknown>,
    showSearch?: boolean
}) => {
    const navigation = useNavigation<NavStack>();
    const [searchQuery, setSearchQuery] = useState('');
    const analyticsProps = useAnalyticsProps();

    const filteredCommunities = communities
        .filter(community => community.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (communities.length === 0) {
        return (
            <View style={styles.centeredView}>
                <Text>You&apos;re not following any communities yet.</Text>

            </View>
        )
    }

    return (
        <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {showSearch && <TextInput
                style={styles.searchInput}
                placeholder="Search communities..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
            />}
            <FlatList
                data={filteredCommunities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.communityItem}
                        onPress={() => {
                            navigation.navigate('Community Events', { communityId: item.id });
                            logEvent(UE.CommunityListNavigateToCommunityEvents, { ...analyticsProps, community_id: item.id });
                        }}
                    >
                        <View style={styles.communityItemContent}>
                            <Text style={styles.communityName}>{item.name}</Text>
                            <TouchableOpacity onPress={() => {
                                onClickLeave.mutate({ community_id: item.id });
                                logEvent(UE.CommunityListCommunityLeft, { ...analyticsProps, community_id: item.id });
                            }} style={styles.unfollowButton}>
                                <Text style={styles.buttonText}>Unfollow</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}
                style={{ height: 200 }}
            />
        </View>
    )
}

export const CommunitiesList: React.FC = () => {
    const { myCommunities } = useCommonContext();
    const privateCommunities = [
        ...myCommunities.myPrivateCommunities,
        ...myCommunities.myOrganizerPrivateCommunities
    ];

    const leaveCommunity = useLeaveCommunity();

    const { myCommunities: { myOrganizerPublicCommunities } } = useCommonContext();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <CommunityList title="My Private Communities" communities={privateCommunities} onClickLeave={leaveCommunity} />
                <CommunityList title="My Public Communities" communities={myOrganizerPublicCommunities} onClickLeave={leaveCommunity} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    section: {
        padding: spacing.lg,
        paddingVertical: 0
    },
    sectionTitle: {
        fontSize: fontSizes.xxxl,
        fontWeight: '700',
        marginVertical: spacing.smPlus,
        textAlign: 'center',
        color: colors.brandText,
        fontFamily: fontFamilies.display,
    },
    communityItem: {
        padding: spacing.mdPlus,
        backgroundColor: colors.white,
        borderRadius: radius.sm,
        margin: spacing.lg,
        marginTop: 0,
        elevation: 2,
        ...shadows.card,
    },
    communityItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    communityName: {
        fontSize: fontSizes.xxl,
        fontWeight: '700',
        color: colors.textPrimary,
        flex: 1,
        marginRight: spacing.smPlus,
        fontFamily: fontFamilies.body,
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginTop: spacing.xl,
        fontFamily: fontFamilies.body,
    },
    buttonText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontFamily: fontFamilies.body,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    container: {
        flex: 1,
        backgroundColor: colors.surfaceSubtle,
        marginTop: spacing.xl,
    },
    content: {
        flex: 1,
        flexDirection: 'column',
    },
    unfollowButton: {
        backgroundColor: colors.danger,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.md,
        borderRadius: radius.xs,
        minWidth: 80,
        alignItems: 'center',
    },
    followButton: {
        backgroundColor: colors.linkBlue,
        paddingVertical: spacing.xsPlus,
        paddingHorizontal: spacing.md,
        borderRadius: radius.xs,
        minWidth: 80,
        alignItems: 'center',
    },
    searchInput: {
        height: spacing.jumbo,
        margin: spacing.lg,
        marginTop: 0,
        padding: spacing.smPlus,
        borderRadius: radius.smPlus,
        backgroundColor: colors.white,
        borderColor: colors.borderMutedAlt,
        borderWidth: 1,
        fontSize: fontSizes.xl,
        fontFamily: fontFamilies.body,
    },
});
