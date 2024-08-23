import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';


const Web = () => {
  return (
    <SafeAreaView style={styles.container}>
      <WebView source={{ uri: "https://www.kinkbuddy.org/kinks" }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default Web; 