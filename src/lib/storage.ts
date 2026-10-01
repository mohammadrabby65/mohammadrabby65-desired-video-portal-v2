/**
 * Safe localStorage and sessionStorage wrappers that gracefully fallback
 * to in-memory storage if access is denied by browser iframe sandbox restrictions.
 */

class MemoryStorage {
  private data: Record<string, string> = {};

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  }

  setItem(key: string, value: string): void {
    this.data[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  clear(): void {
    this.data = {};
  }
}

const memoryLocalStorage = new MemoryStorage();
const memorySessionStorage = new MemoryStorage();

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage access blocked in cross-origin / third-party iframe
    }
    return memoryLocalStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {}
    memoryLocalStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {}
    memoryLocalStorage.removeItem(key);
  },
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch {}
    return memorySessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch {}
    memorySessionStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
        return;
      }
    } catch {}
    memorySessionStorage.removeItem(key);
  },
};
