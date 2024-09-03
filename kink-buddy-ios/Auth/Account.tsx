import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { supabase } from '../supabaseCiient';
import { Session } from '@supabase/supabase-js';

export default function Account({ session }: { session: Session }) {
    return (
        <View style={styles.container}>
            <Text style={styles.emailText}>Logged in As: {session?.user?.email}</Text>
            <Button title="Sign Out" onPress={() => supabase.auth.signOut()} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        padding: 12,
        alignItems: 'center',
    },
    emailText: {
        fontSize: 16,
        marginBottom: 20,
    },
});
