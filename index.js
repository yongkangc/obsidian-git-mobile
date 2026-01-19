/**
 * @format
 */

// Polyfill Buffer for isomorphic-git (Node.js API not available in React Native)
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
