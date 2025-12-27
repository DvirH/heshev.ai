const STORAGE_PREFIX = 'heshev-chat-';

export function saveToStorage<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

export function loadFromStorage<T>(key: string): T | null {
  try {
    const serialized = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (serialized) {
      return JSON.parse(serialized) as T;
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
  }
  return null;
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
  }
}

export function clearAllStorage(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}
