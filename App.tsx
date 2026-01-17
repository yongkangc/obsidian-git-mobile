import React, {useEffect} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  VaultScreen,
  EditorScreen,
  SettingsScreen,
  SearchScreen,
} from './src/screens';
import {indexDB} from './src/services/index-db';

export type RootStackParamList = {
  Vault: undefined;
  Editor: {path: string};
  Settings: undefined;
  Search: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    indexDB.init().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Vault"
            screenOptions={{
              headerStyle: {backgroundColor: '#1e1e1e'},
              headerTintColor: '#ffffff',
              contentStyle: {backgroundColor: '#1e1e1e'},
            }}>
            <Stack.Screen
              name="Vault"
              component={VaultScreen}
              options={{title: 'Vault'}}
            />
            <Stack.Screen
              name="Editor"
              component={EditorScreen}
              options={{title: 'Editor'}}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{title: 'Settings'}}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{title: 'Search'}}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
