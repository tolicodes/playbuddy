import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useJoinCommunity } from '../../Common/hooks/useCommunities';
import { useNavigation } from '@react-navigation/native';
import { CommunitiesList } from './CommunitiesList';
import { useCommonContext } from '../../Common/hooks/CommonContext';
import { NavStack } from '../../Common/Nav/NavStackType';
import { logEvent } from '../../Common/hooks/logger';

export const JoinCommunitySection = ({ type }: { type: 'organizer' | 'private' } = { type: 'private' }) => {
    const [communityCode, setCommunityCode] = useState<string>('');
    const joinCommunity = useJoinCommunity();
    const { navigate } = useNavigation<NavStack>();

    const {
        communities: { organizerPublicCommunities },
    } = useCommonContext();

    const handleJoinCommunity = async () => {
        if (!communityCode.trim()) {
            alert('Please enter a valid community code');
            return;
        }

        try {
            const { status } = await joinCommunity.mutateAsync({
                community_id: communityCode,
                join_code: communityCode.trim(),
                type: 'private'
            });

            logEvent('join_community_section_join_community', { communityCode });

            if (status === 'pending') {
                alert(`Applied to join community: ${communityCode}`);
            } else {
                alert(`Joined community: ${communityCode}`);
                navigate('Communities', { screen: 'My Communities' });
            }
            setCommunityCode('');
        } catch {
            alert(`Failed to join community: ${communityCode}`);
            logEvent('join_community_section_join_community_failed', { communityCode });
        }
    };

    return (
        <View style={styles.container}>
            {type === 'private' && <View style={styles.joinContainer}>
                <Text style={styles.joinTitle}>Join a Private Community</Text>
                <Text style={styles.joinSubtitle}>Ask your group organizer for the join code.</Text>
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
                    onPress={handleJoinCommunity}
                >
                    <Text style={styles.buttonText}>Join</Text>
                </TouchableOpacity>
            </View>}

            {type === 'organizer' && <View >
                <CommunitiesList
                    title="Follow Organizers"
                    communities={organizerPublicCommunities}
                    flex={1}
                    showSearch={true}
                />
            </View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        paddingVertical: 20
    },
    joinContainer: {
        paddingHorizontal: 16,
        flex: 1,
        marginBottom: 60
    },
    joinTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    joinSubtitle: {
        fontSize: 14,
        marginBottom: 10,
        marginTop: 5,
        color: '#666',
        textAlign: 'center'
    },
    input: {
        height: 44,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    button: {
        backgroundColor: '#007AFF',
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600'
    },
});