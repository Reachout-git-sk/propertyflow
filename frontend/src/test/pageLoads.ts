import { vi } from 'vitest';

// jsdom cannot open another page: setting window.location.href only prints "Not implemented".
// So this puts a stand-in for window.location in its place, which writes down every address
// the app sends the browser to (a real browser would reload the page there).
// Call vi.unstubAllGlobals() after the test to put the real one back.
export function watchPageLoads() {
  const pageLoads: string[] = [];
  vi.stubGlobal('location', {
    get href() {
      return 'http://localhost:5173/login';
    },
    set href(url: string) {
      pageLoads.push(url);
    },
  });
  return pageLoads;
}
