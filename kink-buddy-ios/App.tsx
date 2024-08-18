import { StyleSheet, Text, View } from 'react-native';
import Web from './Web';
import Calendar from './Calendar/Calendar'

export default function App() {
  return (
    // <Web />
    <Calendar />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
