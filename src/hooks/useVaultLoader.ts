import {useEffect} from 'react';
import {useVaultStore} from '../store';
import {vaultFS} from '../services/vault-fs';

export function useVaultLoader() {
  const setFileTree = useVaultStore(state => state.setFileTree);
  const setIsLoading = useVaultStore(state => state.setIsLoading);

  useEffect(() => {
    async function loadVault() {
      setIsLoading(true);
      try {
        const tree = await vaultFS.listTree();
        setFileTree(tree);
      } catch (error) {
        console.error('Failed to load vault:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadVault();
  }, [setFileTree, setIsLoading]);
}
