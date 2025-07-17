import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PrivyAuthTest } from '../components/privy/PrivyAuthTest';

export default function BlankScreen() {
  return (
    <>
      <View style={styles.screenContainer}>
        <Text variant="titleLarge">This is a blank tab!</Text>
        <PrivyAuthTest />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    height: '100%',
    padding: 16,
  },
});
