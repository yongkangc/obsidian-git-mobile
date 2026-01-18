import {useEffect} from 'react';
import {InteractionManager} from 'react-native';
import {useVaultStore} from '../store';
import {vaultFS} from '../services/vault-fs';
import {treeCache} from '../services/tree-cache';

export function useVaultLoader() {
  const setFileTree = useVaultStore(state => state.setFileTree);
  const setIsLoading = useVaultStore(state => state.setIsLoading);

  useEffect(() => {
    let cancelled = false;

    async function loadFromCache() {
      const cached = await treeCache.get();
      if (cached && !cancelled) {
        setFileTree(cached);
        setIsLoading(false);
      }
      return cached !== null;
    }

    async function refreshFromFS() {
      const tree = await vaultFS.listTree();
      if (!cancelled) {
        setFileTree(tree);
        await treeCache.set(tree);
      }
    }

    setIsLoading(true);

    // Load from cache first (instant)
    loadFromCache().then(hadCache => {
      // Refresh from FS in background after animations
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          await refreshFromFS();
        } catch (error) {
          console.error('Failed to load vault:', error);
        } finally {
          if (!cancelled && !hadCache) {
            setIsLoading(false);
          }
        }
      });

      return () => task.cancel();
    });

    return () => {
      cancelled = true;
    };
  }, [setFileTree, setIsLoading]);
}
