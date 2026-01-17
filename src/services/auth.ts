import * as Keychain from 'react-native-keychain';
import type {GitAuth} from '../types';

const SERVICE_NAME = 'obsidian-git-mobile';

export async function storeToken(auth: GitAuth): Promise<void> {
  const credentials = JSON.stringify(auth);
  await Keychain.setGenericPassword('git-auth', credentials, {
    service: SERVICE_NAME,
  });
}

export async function getToken(): Promise<GitAuth | null> {
  const result = await Keychain.getGenericPassword({service: SERVICE_NAME});
  if (!result) {
    return null;
  }
  return JSON.parse(result.password) as GitAuth;
}

export async function clearToken(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE_NAME});
}
