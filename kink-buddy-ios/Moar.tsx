import { Text, View, SafeAreaView, TouchableOpacity, Linking } from 'react-native';

export default () => {
    return (<SafeAreaView>
        <View style={{ padding: 20 }}>
            <Text>Got feedback?</Text>
            <Text>Want to add your event? </Text>

            <Text>Contact me at</Text>

            <TouchableOpacity onPress={() => Linking.openURL("mailto:toli@toli.me")}>
                <Text style={{ color: 'blue' }}>toli@toli.me</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>)
}