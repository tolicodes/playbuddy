// JoinCommunitySection.tsx

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useJoinCommunity } from '../../Common/hooks/useCommunities';
import { useNavigation } from '@react-navigation/native';
import { CommunitiesList } from './CommunitiesList';
import { useCommonContext } from '../../Common/hooks/CommonContext';
import { NavStack } from '../../Common/Nav/NavStackType';
import { logEvent } from '../../Common/hooks/logger';
import { colors, fontFamilies, fontSizes, radius, spacing } from '../../components/styles';
import { UE } from '../../userEventTypes';

export const JoinCommunitySection = ({
    type = 'private',
}: {
    type?: 'organizer' | 'private';
}) => {
    // const [communityCode, setCommunityCode] = useState<string>('');
    // const joinCommunity = useJoinCommunity();
    // const { navigate } = useNavigation<NavStack>();

    const {
        communities: { organizerPublicCommunities },
    } = useCommonContext();

    // const handleJoinPrivateCommunity = async () => {
    //     if (!communityCode.trim()) {
    //         alert('Please enter a valid community code');
    //         return;
    //     }

    //     try {
    //         const { status } = await joinCommunity.mutateAsync({
    //             community_id: communityCode,
    //             join_code: communityCode.trim(),
    //             type: 'private',
    //         });

    //         logEvent(UE.JoinCommunitySectionJoinCommunity, { communityCode });

    //         if (status === 'pending') {
    //             alert(`Applied to join community: ${communityCode}`);
    //         } else {
    //             alert(`Joined community: ${communityCode}`);
    //             navigate('Communities', { screen: 'My Communities' });
    //         }
    //         setCommunityCode('');
    //     } catch {
    //         alert(`Failed to join community: ${communityCode}`);
    //         logEvent(UE.JoinCommunitySectionJoinCommunityFailed, {
    //             communityCode,
    //         });
    //     }
    // };

    return (
        <View style={styles.container}>
            {/* {type === 'private' && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.joinContainer}
                >
                    <Text style={styles.joinTitle}>Join a Private Community</Text>
                    <Text style={styles.joinSubtitle}>
                        Ask your group organizer for the join code.
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={communityCode}
                        onChangeText={setCommunityCode}
                        placeholder="Enter community code"
                        placeholderTextColor={colors.textSubtle}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleJoinPrivateCommunity}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Join</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            )} */}

            {type === 'organizer' && (
                <View style={styles.listContainer}>
                    <CommunitiesList
                        title="All Communities"
                        communities={organizerPublicCommunities}
                        showSearch={true}
                        listMode="all"
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    // ── Join Private Styles ─────────────────────────────────────────────────────
    joinContainer: {
        flex: 1,
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.jumbo,
        paddingBottom: spacing.jumbo + spacing.xl,
        justifyContent: 'center',
    },
    joinTitle: {
        fontSize: fontSizes.title,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.sm,
        color: colors.textPrimary,
        fontFamily: fontFamilies.display,
    },
    joinSubtitle: {
        fontSize: fontSizes.lg,
        color: colors.textSlate,
        textAlign: 'center',
        marginBottom: spacing.xl,
        fontFamily: fontFamilies.body,
    },
    input: {
        height: spacing.jumbo + spacing.sm,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        fontSize: fontSizes.xl,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.borderMuted,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        fontFamily: fontFamilies.body,
    },
    button: {
        backgroundColor: colors.linkBlue,
        height: spacing.jumbo + spacing.sm,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.linkBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: colors.white,
        fontSize: fontSizes.xl,
        fontWeight: '600',
        fontFamily: fontFamilies.body,
    },

    // ── Organizer Styles (removed header & top padding) ─────────────────────────
    listContainer: {
        flex: 1,
        paddingHorizontal: 0,
        paddingTop: 0,
        marginTop: 0,
        backgroundColor: 'transparent',
    },
});
