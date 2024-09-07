import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { supabase } from '../supabaseCiient';
import { Session } from '@supabase/supabase-js';
import { useUserContext } from './UserContext';

export default function Account({ session }: { session: Session }) {
    const { setUserId, user } = useUserContext();
    const onPressSignOut = async () => {
        supabase.auth.signOut();
        setUserId(null);

    }
    return (
        <View style={styles.container}>
            <Text style={styles.emailText}>Logged in As: {session?.user?.email}</Text>
            <Text>Wishlist Share Code: {user?.share_code}</Text>
            <Button title="Sign Out" onPress={onPressSignOut} />
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
