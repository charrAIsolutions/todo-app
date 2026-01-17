import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TODOS: 'todos',
} as const;

/**
 * Storage wrapper for todo persistence
 * Uses AsyncStorage which works across iOS, Android, and web
 */
export const storage = {
  async getTodos<T>(): Promise<T | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TODOS);
    return data ? JSON.parse(data) : null;
  },

  async setTodos<T>(todos: T): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
  },

  async clearTodos(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.TODOS);
  },
};
