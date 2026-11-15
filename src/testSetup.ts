// Polyfill localStorage / sessionStorage for Node 22+ & jsdom environments
class StorageMock implements Storage {
  [name: string]: any;

  getItem(key: string): string | null {
    const val = (this as Record<string, any>)[key];
    return typeof val !== "undefined" && typeof val !== "function" ? val : null;
  }

  setItem(key: string, value: unknown): void {
    (this as Record<string, any>)[key] = String(value);
  }

  removeItem(key: string): void {
    delete (this as Record<string, any>)[key];
  }

  clear(): void {
    for (const key of Object.keys(this)) {
      delete (this as Record<string, any>)[key];
    }
  }

  key(index: number): string | null {
    return Object.keys(this)[index] ?? null;
  }

  get length(): number {
    return Object.keys(this).length;
  }
}

function ensureStorage(name: "localStorage" | "sessionStorage"): void {
  const current = (globalThis as any)[name];
  const isFunctional = current && typeof current.getItem === "function" && typeof current.clear === "function";

  if (!isFunctional) {
    const mock = new StorageMock();
    Object.defineProperty(globalThis, name, {
      value: mock,
      configurable: true,
      writable: true,
      enumerable: true,
    });
    if (typeof window !== "undefined") {
      Object.defineProperty(window, name, {
        value: mock,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }
  }
}

ensureStorage("localStorage");
ensureStorage("sessionStorage");
