import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";

import { Community } from "../../../Common/commonTypes";

export const CommunitiesManageSection: React.FC = () => {
    const [managedCommunities] = useState<Community[]>([
        { id: '3', name: 'HMU' },
        { id: '4', name: 'Hacienda' },
    ]);

    const [pendingRequests] = useState<PendingRequests>({
        'HMU': [
            { id: '1', email: 'user1@example.com' },
            { id: '2', email: 'user2@example.com' },
        ],
        'Hacienda': [{ id: '3', email: 'user3@example.com' }],
    });

    return (
        <View style={styles.section}>
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
                <Text style={styles.emptyText}>You&apos;re not managing any communities yet.</Text>
            )}

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
};

const styles = StyleSheet.create({
    section: {
        padding: 16,
        paddingVertical: 0
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 10
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    communityItem: {
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 10,
        elevation: 2
    },
    communityName: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20
    },
    communityRequestSection: {
        marginBottom: 20
    },
    requestItem: {
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginVertical: 5,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    buttonGroup: {
        flexDirection: 'row'
    },
    approveButton: {
        backgroundColor: '#28a745',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: 5
    },
    rejectButton: {
        backgroundColor: '#dc3545',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10
    }
});