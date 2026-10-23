import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRegisterSW = vi.fn();

vi.mock('virtual:pwa-register', () => ({
  registerSW: (...args: any[]) => mockRegisterSW(...args),
}));

describe('PWA Registration and Lifecycle (src/pwa.ts)', () => {
  let docListeners: Record<string, ((e?: any) => void)[]> = {};
  let winListeners: Record<string, ((e?: any) => void)[]> = {};
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocumentDesc = Object.getOwnPropertyDescriptor(globalThis, 'document');

  beforeEach(() => {
    vi.clearAllMocks();
    docListeners = {};
    winListeners = {};

    const mockDocument = {
      visibilityState: 'visible',
      addEventListener: vi.fn((event: string, cb: (e?: any) => void) => {
        if (!docListeners[event]) docListeners[event] = [];
        docListeners[event].push(cb);
      }),
    };

    const mockWindow = {
      location: {
        pathname: '/',
        reload: vi.fn(),
      },
      addEventListener: vi.fn((event: string, cb: (e?: any) => void) => {
        if (!winListeners[event]) winListeners[event] = [];
        winListeners[event].push(cb);
      }),
    };

    const mockNavigator = {
      serviceWorker: {},
      onLine: true,
    };

    Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true, writable: true });
    Object.defineProperty(globalThis, 'document', { value: mockDocument, configurable: true, writable: true });
    Object.defineProperty(globalThis, 'navigator', { value: mockNavigator, configurable: true, writable: true });
  });

  afterEach(() => {
    if (originalWindowDesc) Object.defineProperty(globalThis, 'window', originalWindowDesc);
    if (originalDocumentDesc) Object.defineProperty(globalThis, 'document', originalDocumentDesc);
    if (originalNavigatorDesc) Object.defineProperty(globalThis, 'navigator', originalNavigatorDesc);
  });

  it('registers the service worker with immediate: true and callbacks', async () => {
    const { registerPWA } = await import('../pwa');
    registerPWA();

    expect(mockRegisterSW).toHaveBeenCalledTimes(1);
    const options = mockRegisterSW.mock.calls[0][0];
    expect(options.immediate).toBe(true);
    expect(typeof options.onNeedReload).toBe('function');
    expect(typeof options.onRegisteredSW).toBe('function');
  });

  it('immediately calls registration.update() and handles foreground visibility & online events', async () => {
    const { registerPWA } = await import('../pwa');
    registerPWA();

    const options = mockRegisterSW.mock.calls[0][0];
    const mockRegistration = {
      update: vi.fn().mockResolvedValue(undefined),
      installing: null,
    };

    options.onRegisteredSW('/sw.js', mockRegistration);

    // Initial check on mount
    expect(mockRegistration.update).toHaveBeenCalledTimes(1);

    // Visibility change check (simulate returning to app on Android)
    (globalThis as any).document.visibilityState = 'visible';
    for (const handler of docListeners['visibilitychange'] || []) {
      handler();
    }
    expect(mockRegistration.update).toHaveBeenCalledTimes(2);

    // Online event check
    for (const handler of winListeners['online'] || []) {
      handler();
    }
    expect(mockRegistration.update).toHaveBeenCalledTimes(3);
  });

  it('reloads the page immediately when onNeedReload is invoked on non-watch routes', async () => {
    const { registerPWA } = await import('../pwa');
    registerPWA();

    const options = mockRegisterSW.mock.calls[0][0];
    (globalThis as any).window.location.pathname = '/';

    options.onNeedReload();

    expect((globalThis as any).window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('defers reload when onNeedReload is invoked while on /watch route until navigation or backgrounding', async () => {
    const { registerPWA } = await import('../pwa');
    registerPWA();

    const options = mockRegisterSW.mock.calls[0][0];
    (globalThis as any).window.location.pathname = '/watch/movie/123';

    options.onNeedReload();

    // Should not reload immediately while watching
    expect((globalThis as any).window.location.reload).not.toHaveBeenCalled();

    // Simulating app being minimized/backgrounded
    (globalThis as any).document.visibilityState = 'hidden';
    for (const handler of docListeners['visibilitychange'] || []) {
      handler();
    }

    expect((globalThis as any).window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('gracefully exits in non-browser or non-serviceWorker environments', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });
    const { registerPWA } = await import('../pwa');
    mockRegisterSW.mockClear();
    registerPWA();

    expect(mockRegisterSW).not.toHaveBeenCalled();
  });
});
