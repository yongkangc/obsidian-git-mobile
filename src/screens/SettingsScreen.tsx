import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {getToken, storeToken, clearToken} from '../services/auth';
import {gitSync} from '../services/git-sync';
import type {GitAuth} from '../types';
import {colors, radius, touchTargets} from '../theme';
import {useVaultStore} from '../store';

const SYNC_INTERVAL_OPTIONS = [
  {label: 'Off', value: 0},
  {label: '1 min', value: 1},
  {label: '5 min', value: 5},
  {label: '15 min', value: 15},
  {label: '30 min', value: 30},
  {label: '1 hour', value: 60},
];

export function SettingsScreen(): React.JSX.Element {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneProgress, setCloneProgress] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const syncInterval = useVaultStore(state => state.syncInterval);
  const setSyncInterval = useVaultStore(state => state.setSyncInterval);
  const refreshTree = useVaultStore(state => state.refreshTree);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const auth = await getToken();
      if (auth) {
        setToken(auth.token);
        setUsername(auth.username || '');
        setRepoUrl(auth.repoUrl || '');
        setHasCredentials(true);
        // Check if repo is cloned
        const status = await gitSync.status();
        setIsConnected(status.state !== 'offline' || status.lastSyncAt !== null);
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Personal Access Token is required');
      return;
    }

    setIsSaving(true);
    try {
      const auth: GitAuth = {
        type: 'pat',
        token: token.trim(),
        username: username.trim() || undefined,
        repoUrl: repoUrl.trim() || undefined,
      };
      await storeToken(auth);
      setHasCredentials(true);
      Alert.alert('Success', 'Git credentials saved securely');
    } catch (error) {
      Alert.alert('Error', 'Failed to save credentials');
      console.error('Failed to save credentials:', error);
    } finally {
      setIsSaving(false);
    }
  }, [token, username, repoUrl]);

  const normalizeRepoUrl = (url: string): string => {
    let normalized = url.trim();
    // Add https:// if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    // Add .git suffix if missing
    if (!normalized.endsWith('.git')) {
      normalized = `${normalized}.git`;
    }
    return normalized;
  };

  const handleConnect = useCallback(async () => {
    if (!repoUrl.trim()) {
      Alert.alert('Error', 'Repository URL is required to connect');
      return;
    }
    if (!token.trim()) {
      Alert.alert('Error', 'Please save your credentials first');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'GitHub username is required');
      return;
    }

    const normalizedUrl = normalizeRepoUrl(repoUrl);
    setIsCloning(true);
    setCloneProgress('Starting clone...');
    try {
      const auth: GitAuth = {
        type: 'pat',
        token: token.trim(),
        username: username.trim(),
        repoUrl: normalizedUrl,
      };
      await storeToken(auth);
      await gitSync.clone(normalizedUrl, auth, (phase, loaded, total) => {
        const totalStr = total ? `/${total}` : '';
        if (phase === 'Receiving objects') {
          const mb = (loaded / 1024 / 1024).toFixed(1);
          setCloneProgress(`Downloading: ${mb}MB${total ? ` of ${(total / 1024 / 1024).toFixed(1)}MB` : ''}`);
        } else if (phase === 'Resolving deltas') {
          setCloneProgress(`Resolving: ${loaded}${totalStr}`);
        } else {
          setCloneProgress(`${phase}: ${loaded}${totalStr}`);
        }
      });
      setIsConnected(true);
      setHasCredentials(true);
      await refreshTree();
      Alert.alert('Success', 'Repository connected and cloned successfully');
    } catch (error: unknown) {
      let message = 'Unknown error occurred';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        message = String((error as {message: unknown}).message);
      }
      Alert.alert('Connection Failed', message);
      console.error('Failed to clone repository:', error);
    } finally {
      setIsCloning(false);
      setCloneProgress('');
    }
  }, [token, username, repoUrl, refreshTree]);

  const handleClear = useCallback(async () => {
    Alert.alert(
      'Clear Credentials',
      'Are you sure you want to remove your Git credentials?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearToken();
              setToken('');
              setUsername('');
              setRepoUrl('');
              setHasCredentials(false);
              Alert.alert('Success', 'Credentials cleared');
            } catch {
              Alert.alert('Error', 'Failed to clear credentials');
            }
          },
        },
      ],
    );
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Git Authentication</Text>
        <Text style={styles.sectionDescription}>
          Configure your GitHub Personal Access Token (PAT) for syncing your vault.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>GitHub Username</Text>
          <TextInput
            style={[styles.input, focusedInput === 'username' && styles.inputFocused]}
            value={username}
            onChangeText={setUsername}
            placeholder="your-username"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedInput('username')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Personal Access Token</Text>
          <TextInput
            style={[styles.input, focusedInput === 'token' && styles.inputFocused]}
            value={token}
            onChangeText={setToken}
            placeholder="ghp_xxxxxxxxxxxx"
            placeholderTextColor="#555"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedInput('token')}
            onBlur={() => setFocusedInput(null)}
          />
          <Text style={styles.hint}>
            Create a token at GitHub → Settings → Developer settings → Personal access tokens
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Repository URL</Text>
          <TextInput
            style={[styles.input, focusedInput === 'repoUrl' && styles.inputFocused]}
            value={repoUrl}
            onChangeText={setRepoUrl}
            placeholder="https://github.com/user/vault.git"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onFocus={() => setFocusedInput('repoUrl')}
            onBlur={() => setFocusedInput(null)}
          />
          <Text style={styles.hint}>
            The HTTPS URL of your GitHub repository
          </Text>
        </View>

        {isConnected && (
          <View style={styles.connectedBadge}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Repository connected</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable
            style={({pressed}) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              (isSaving || isCloning) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving || isCloning}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Credentials</Text>
            )}
          </Pressable>

          {hasCredentials && (
            <Pressable
              style={({pressed}) => [
                styles.button,
                styles.dangerButton,
                pressed && styles.dangerButtonPressed,
              ]}
              onPress={handleClear}>
              <Text style={styles.dangerButtonText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {!isConnected && (
          <Pressable
            style={({pressed}) => [
              styles.connectButton,
              pressed && styles.connectButtonPressed,
              isCloning && styles.buttonDisabled,
            ]}
            onPress={handleConnect}
            disabled={isCloning}>
            {isCloning ? (
              <View style={styles.connectButtonContent}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.connectButtonText}>
                  {cloneProgress || 'Cloning repository...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.connectButtonText}>Connect Repository</Text>
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto Sync</Text>
        <Text style={styles.sectionDescription}>
          Automatically sync your vault at regular intervals.
        </Text>

        <View style={styles.intervalRow}>
          {SYNC_INTERVAL_OPTIONS.map(option => (
            <Pressable
              key={option.value}
              style={({pressed}) => [
                styles.intervalButton,
                syncInterval === option.value && styles.intervalButtonActive,
                pressed && styles.intervalButtonPressed,
              ]}
              onPress={() => setSyncInterval(option.value)}>
              <Text
                style={[
                  styles.intervalButtonText,
                  syncInterval === option.value &&
                    styles.intervalButtonTextActive,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Obsidian Git Mobile v1.0.0</Text>
        <Text style={styles.aboutText}>Sync your Obsidian vault via Git</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.lg,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTargets.comfortable,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  hint: {
    fontSize: 12,
    color: colors.textPlaceholder,
    marginTop: 6,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: touchTargets.comfortable,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    flex: 1,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    color: colors.textPlaceholder,
    marginBottom: 4,
  },
  intervalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  intervalButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  intervalButtonPressed: {
    opacity: 0.7,
  },
  intervalButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  intervalButtonTextActive: {
    color: colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: radius.sm,
    marginBottom: 20,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  connectedText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '500',
  },
  connectButton: {
    marginTop: 16,
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargets.comfortable,
  },
  connectButtonPressed: {
    opacity: 0.8,
  },
  connectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
