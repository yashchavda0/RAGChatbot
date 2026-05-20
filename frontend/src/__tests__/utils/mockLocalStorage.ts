/* eslint-disable @typescript-eslint/no-explicit-any */
type MockStorage = {
  store: Record<string, string>;
  length: number;
  clear: () => void;
  key: (key: string) => string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string) {
    this.store[key] = value;
    this.length = Object.keys(this.store).length;
  }

  removeItem(key: string) => void {
    delete this.store[key];
    this.length = Object.keys(this.store).length;
  }

  clear() {
    this.store = {};
    this.length = 0;
  }
}

export const createMockLocalStorage = (): MockStorage => {
  return new MockStorage();
};

