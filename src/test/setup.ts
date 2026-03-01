import '@testing-library/jest-dom/vitest'

// Polyfill ResizeObserver for jsdom (required by Radix ScrollArea, Popover, Dialog)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
