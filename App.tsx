import React, {useEffect} from 'react';
import {InteractionManager, StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  VaultScreen,
  EditorScreen,
  SettingsScreen,
  SearchScreen,
} from './src/screens';
import {indexDB} from './src/services/index-db';
import {colors} from './src/theme';
import {useVaultStore} from './src/store';
import {useAutoSync} from './src/hooks';

export type RootStackParamList = {
  Vault: undefined;
  Editor: {path: string};
  Settings: undefined;
  Search: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const loadRecentNotes = useVaultStore(state => state.loadRecentNotes);
  const loadSyncInterval = useVaultStore(state => state.loadSyncInterval);

  useAutoSync();

  useEffect(() => {
    loadRecentNotes();
    loadSyncInterval();
    const handle = InteractionManager.runAfterInteractions(() => {
      indexDB.init().catch(console.error);
    });
    return () => handle.cancel();
  }, [loadRecentNotes, loadSyncInterval]);

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
          translucent={false}
        />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Vault"
            screenOptions={{
              headerStyle: {backgroundColor: colors.background},
              headerTintColor: colors.textPrimary,
              contentStyle: {backgroundColor: colors.background},
            }}>
            <Stack.Screen
              name="Vault"
              component={VaultScreen}
              options={{headerShown: false}}
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
    </View>
  );
}

export default App;
