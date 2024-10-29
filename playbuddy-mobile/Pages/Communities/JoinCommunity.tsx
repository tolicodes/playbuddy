import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useJoinCommunity } from '../../Common/hooks/useCommunities';
import { useNavigation } from '@react-navigation/native';

export const JoinCommunity: React.FC = () => {
    const [communityCode, setCommunityCode] = useState<string>('');
    const joinCommunity = useJoinCommunity();
    const { navigate } = useNavigation();

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

            if (status === 'pending') {
                alert(`Applied to join community: ${communityCode}`);
            } else {
                alert(`Joined community: ${communityCode}`);
                navigate('Communities Play')
            }
            setCommunityCode('');

        } catch (error) {
            alert(`Failed to join community: ${communityCode}`);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Join a Community</Text>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 16,
        paddingTop: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
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
    }
});
