import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {SyncQueueItem} from '../types';

interface SyncQueueState {
  queue: SyncQueueItem[];
  addToQueue: (path: string, action: 'add' | 'modify' | 'delete') => void;
  getQueue: () => SyncQueueItem[];
  clearQueue: () => void;
  removeFromQueue: (path: string) => void;
}

export const useSyncQueueStore = create<SyncQueueState>()(
  persist(
    (set, get) => ({
      queue: [],

      addToQueue: (path, action) => {
        set(state => {
          const existing = state.queue.find(item => item.path === path);
          if (existing) {
            if (action === 'delete' && existing.action === 'add') {
              return {
                queue: state.queue.filter(item => item.path !== path),
              };
            }
            return {
              queue: state.queue.map(item =>
                item.path === path
                  ? {...item, action, queuedAt: Date.now()}
                  : item,
              ),
            };
          }
          return {
            queue: [
              ...state.queue,
              {path, action, queuedAt: Date.now()},
            ],
          };
        });
      },

      getQueue: () => get().queue,

      clearQueue: () => set({queue: []}),

      removeFromQueue: path => {
        set(state => ({
          queue: state.queue.filter(item => item.path !== path),
        }));
      },
    }),
    {
      name: 'sync-queue-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function addToQueue(
  path: string,
  action: 'add' | 'modify' | 'delete',
): void {
  useSyncQueueStore.getState().addToQueue(path, action);
}

export function getQueue(): SyncQueueItem[] {
  return useSyncQueueStore.getState().getQueue();
}

export function clearQueue(): void {
  useSyncQueueStore.getState().clearQueue();
}
