import React, { View } from "react-native";
import { Button } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

export default function Admin() {
    const navigation = useNavigation();
    return <View>
        <Button onPress={() => {
            navigation.navigate('PromoCodesManager');
        }}>
            Promo Codes
        </Button>
    </View>
}       