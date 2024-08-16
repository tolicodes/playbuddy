// App.tsx or App.js
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, View } from '@/components/Themed';


const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <WebView source={{ uri: "https://www.kinkbuddy.org/" }} />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App; 