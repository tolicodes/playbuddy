import { Text, SectionList, StyleSheet, Animated, Dimensions, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import meta from '../src/KinkLibrary/FilterChips.stories';

export default () => {
    return (<SafeAreaView style={{ padding: 20 }}>
        <Text>Got feedback?</Text>
        <Text>Want to add your event? </Text>

        <Text>Contact me at</Text>

        <TouchableOpacity onPress={() => Linking.openURL("mailto:toli@toli.me")}>
            <Text style={{ color: 'blue' }}> toli@toli.me</Text>
        </TouchableOpacity>
    </SafeAreaView>)
}