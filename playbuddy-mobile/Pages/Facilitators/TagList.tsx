import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export interface Tag { id: string; name: string; }
interface Props { tags: Tag[]; }

export default function TagList({ tags }: Props) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
            {tags.map(t => (
                <View key={t.id} style={styles.pill}>
                    <Text style={styles.text}>{t.name}</Text>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 8 },
    pill: { backgroundColor: '#EAEAFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 },
    text: { color: '#5E3FFD', fontSize: 14 }
});


