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
import { colors } from '../../components/styles';
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
                        placeholderTextColor="#999"
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
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 60,
        justifyContent: 'center',
    },
    joinTitle: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        color: '#333',
    },
    joinSubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        height: 48,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#DDD',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    button: {
        backgroundColor: '#007AFF',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
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
