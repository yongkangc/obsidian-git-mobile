import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {getToken, storeToken, clearToken} from '../services/auth';
import type {GitAuth} from '../types';
import {colors, radius, touchTargets} from '../theme';

export function SettingsScreen(): React.JSX.Element {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const auth = await getToken();
      if (auth) {
        setToken(auth.token);
        setUsername(auth.username || '');
        setHasCredentials(true);
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
  }, [token, username]);

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
          <Text style={styles.label}>Repository URL (optional)</Text>
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
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSave}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Credentials</Text>
            )}
          </TouchableOpacity>

          {hasCredentials && (
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleClear}>
              <Text style={styles.dangerButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
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
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
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
});
