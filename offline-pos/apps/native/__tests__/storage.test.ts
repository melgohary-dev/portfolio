/**
 * The mobile client ships its own storage tests (the shared core's 100+ tests
 * run from the workspace root). The store falls back to in-memory behaviour
 * and survives broken/missing native storage, which is exactly what makes it
 * safe to use on any platform.
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStorageProvider } from '../src/storage';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(async () => [...mockStore.keys()]),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((key) => [key, mockStore.get(key) ?? null] as [string, string | null]),
  ),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [key, value] of pairs) mockStore.set(key, value);
  }),
}));

describe('NativeStorageProvider', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('hydrates persisted values on startup', async () => {
    mockStore.set('a', JSON.stringify({ n: 1 }));
    const provider = new NativeStorageProvider(0);
    await provider.hydrate();
    expect(provider.get<{ n: number }>('a')).toEqual({ n: 1 });
  });

  it('round-trips through the synchronous contract and flushes to AsyncStorage', async () => {
    const provider = new NativeStorageProvider(0);
    provider.set('key', { hello: 'world' });
    await provider.flush();
    expect(AsyncStorage.multiSet).toHaveBeenCalled();
    expect(mockStore.get('key')).toBe(JSON.stringify({ hello: 'world' }));
  });

  it('returns null for missing keys and removes keys', async () => {
    const provider = new NativeStorageProvider(0);
    await provider.hydrate();
    expect(provider.get('nope')).toBeNull();
    provider.set('x', 1);
    provider.remove('x');
    await provider.flush();
    expect(mockStore.has('x')).toBe(false);
  });

  it('clear wipes every key', async () => {
    const provider = new NativeStorageProvider(0);
    provider.set('a', 1);
    provider.set('b', 2);
    provider.clear();
    await provider.flush();
    expect(mockStore.size).toBe(0);
  });
});
