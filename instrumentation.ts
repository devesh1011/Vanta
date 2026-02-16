import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({ serviceName: "ai-chatbot" });

  // Fix for Node.js v22+ which exposes a broken localStorage global
  // when --localstorage-file is not provided with a valid path.
  // The object exists but getItem/setItem/removeItem are not functions,
  // which breaks @near-wallet-selector/core and other libraries that
  // check `typeof localStorage === "undefined"` (passes) then call getItem (fails).
  if (
    typeof globalThis.localStorage !== "undefined" &&
    typeof globalThis.localStorage.getItem !== "function"
  ) {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      get length() {
        return store.size;
      },
    } as Storage;
  }
}
