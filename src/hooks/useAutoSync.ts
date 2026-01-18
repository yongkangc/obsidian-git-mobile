import {useEffect, useRef} from 'react';
import {useVaultStore} from '../store';
import {gitSync} from '../services/git-sync';

export function useAutoSync() {
  const syncInterval = useVaultStore(state => state.syncInterval);
  const setSyncStatus = useVaultStore(state => state.setSyncStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (syncInterval <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sync = async () => {
      try {
        await gitSync.pull();
        const queue = useVaultStore.getState().syncQueue;
        if (queue.length > 0) {
          await gitSync.commitAndPush('Auto-sync from Obsidian Git Mobile');
          useVaultStore.getState().clearSyncQueue();
        }
        const status = await gitSync.status();
        setSyncStatus(status);
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    };

    intervalRef.current = setInterval(sync, syncInterval * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncInterval, setSyncStatus]);
}
