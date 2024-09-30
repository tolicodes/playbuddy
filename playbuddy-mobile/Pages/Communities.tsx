import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import EventList from '../Calendar/EventList';
import { useCalendarContext } from '../Calendar/CalendarContext';
import { useGroupedEvents } from '../Calendar/hooks/useGroupedEvents';

// Types for communities and requests
interface Community {
    id: string;
    name: string;
}

interface Request {
    id: string;
    email: string;
}

interface PendingRequests {
    [key: string]: Request[];
}

interface SegmentedControlProps {
    selectedIndex: number;
    onChange: (index: number) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ selectedIndex, onChange }) => {
    const buttons = ["Join", "Play", "Manage"];
    return (
        <View style={styles.segmentedControl}>
            {buttons.map((button, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => onChange(index)}
                    style={[
                        styles.segmentedButton,
                        selectedIndex === index && styles.selectedButton
                    ]}
                >
                    <Text style={selectedIndex === index ? styles.segmentedTextSelected : styles.segmentedText}>
                        {button}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const CommunitiesScreen: React.FC = () => {

    const [selectedSection, setSelectedSection] = useState<number>(0);
    const [communityCode, setCommunityCode] = useState<string>('');

    const { filteredEvents } = useCalendarContext();
    const { sections } = useGroupedEvents(filteredEvents);

    const [joinedCommunities] = useState<Community[]>([
        { id: '1', name: 'HMU' },
        { id: '2', name: 'Pagan\'s Paradise' },
    ]);

    const [managedCommunities] = useState<Community[]>([
        { id: '3', name: 'HMU' },
        { id: '4', name: 'Hacienda' },
    ]);

    const [pendingRequests, setPendingRequests] = useState<PendingRequests>({
        'HMU': [
            { id: '1', email: 'user1@example.com' },
            { id: '2', email: 'user2@example.com' },
        ],
        'Hacienda': [{ id: '3', email: 'user3@example.com' }],
    });

    const handleJoinCommunity = () => {
        if (!communityCode.trim()) {
            alert('Please enter a valid community code');
            return;
        }
        alert(`Applied to join community: ${communityCode}`);
        setCommunityCode('');
    };

    const renderJoinCommunity = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Join a Community</Text>
            <TextInput
                placeholder="Enter Community Code"
                style={styles.input}
                value={communityCode}
                onChangeText={setCommunityCode}
            />
            <TouchableOpacity onPress={handleJoinCommunity} style={styles.joinButton}>
                <Text style={styles.buttonText}>Join</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPlay = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Communities</Text>
            {joinedCommunities.length > 0 ? (
                <FlatList
                    data={joinedCommunities}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.communityItem}>
                            <Text style={styles.communityName}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    style={{ height: 200 }}
                />
            ) : (
                <Text style={styles.emptyText}>You haven't joined any communities yet.</Text>
            )}

            <Text style={styles.sectionTitle}>My Private Events</Text>
            <EventList
                sections={sections}
                screen='Wishlist'
                reloadEvents={() => { }}
            />
        </View>
    );

    const renderManageAndPendingRequests = () => (
        <View style={styles.section}>
            {/* Manage Communities Section */}
            <Text style={styles.sectionTitle}>Manage Communities</Text>
            {managedCommunities.length > 0 ? (
                <FlatList
                    data={managedCommunities}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.communityItem}>
                            <Text style={styles.communityName}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <Text style={styles.emptyText}>You're not managing any communities yet.</Text>
            )}

            {/* Pending Requests Section */}
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {Object.keys(pendingRequests).map((communityName) => (
                <View key={communityName} style={styles.communityRequestSection}>
                    <Text style={styles.communityName}>{communityName}</Text>
                    {pendingRequests[communityName].length === 0 ? (
                        <Text>No pending requests</Text>
                    ) : (
                        pendingRequests[communityName].map((request) => (
                            <View key={request.id} style={styles.requestItem}>
                                <Text>{request.email}</Text>
                                <View style={styles.buttonGroup}>
                                    <TouchableOpacity onPress={() => alert('Approved')} style={styles.approveButton}>
                                        <Text style={styles.buttonText}>Approve</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => alert('Rejected')} style={styles.rejectButton}>
                                        <Text style={styles.buttonText}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            ))}
        </View>
    );

    const renderSection = () => {
        switch (selectedSection) {
            case 0: // Join
                return renderJoinCommunity();
            case 1: // Play
                return renderPlay();
            case 2: // Manage
                return renderManageAndPendingRequests();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text
                style={{ fontSize: 20, textAlign: 'center', fontWeight: 'bold', color: 'red', marginBottom: 20, marginTop: 10 }}
            >THIS IS A DEMO (Fake Data Used)</Text>
            <SegmentedControl selectedIndex={selectedSection} onChange={setSelectedSection} />
            {renderSection()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    segmentedControl: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
    segmentedButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#f4f4f4', borderColor: '#007AFF', borderWidth: 1, width: 100, alignItems: 'center' },
    selectedButton: { backgroundColor: '#007AFF' },
    segmentedText: { color: '#333', fontWeight: 'bold' },
    segmentedTextSelected: { color: 'white', fontWeight: 'bold' },
    section: { padding: 16, paddingVertical: 0 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
    input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 10, height: 40 },
    joinButton: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    communityItem: { padding: 15, backgroundColor: '#fff', borderRadius: 8, marginBottom: 10, elevation: 2 },
    communityName: { fontSize: 18, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
    communityRequestSection: { marginBottom: 20 },
    requestItem: { padding: 10, backgroundColor: '#fff', borderRadius: 8, marginVertical: 5, flexDirection: 'row', justifyContent: 'space-between' },
    buttonGroup: { flexDirection: 'row' },
    approveButton: { backgroundColor: '#28a745', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginRight: 5 },
    rejectButton: { backgroundColor: '#dc3545', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }
});

export default CommunitiesScreen;
