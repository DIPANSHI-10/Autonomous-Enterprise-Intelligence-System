import "@testing-library/jest-dom";

// Mock ResizeObserver for Recharts / ReactFlow in jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

// Mock EventSource
class EventSourceMock {
  onopen: (() => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close() {}
}
(window as unknown as { EventSource: typeof EventSourceMock }).EventSource = EventSourceMock;
