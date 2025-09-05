// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for Web APIs in Node.js environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Web APIs
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers);
    this.body = init.body;
  }
};

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Headers(init.headers);
  }

  async json() {
    return JSON.parse(this.body);
  }
};

global.Headers = class Headers {
  constructor(init = {}) {
    this.map = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.map.set(key.toLowerCase(), value);
      });
    }
  }

  get(name) {
    return this.map.get(name.toLowerCase());
  }

  set(name, value) {
    this.map.set(name.toLowerCase(), value);
  }

  has(name) {
    return this.map.has(name.toLowerCase());
  }

  delete(name) {
    this.map.delete(name.toLowerCase());
  }
};

global.FormData = class FormData {
  constructor() {
    this.data = new Map();
  }

  append(name, value) {
    if (!this.data.has(name)) {
      this.data.set(name, []);
    }
    this.data.get(name).push(value);
  }

  getAll(name) {
    return this.data.get(name) || [];
  }
};

global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.name = filename;
    this.type = options.type || '';
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    this.chunks = chunks;
  }

  async arrayBuffer() {
    const buffer = new ArrayBuffer(this.size);
    const view = new Uint8Array(buffer);
    let offset = 0;
    for (const chunk of this.chunks) {
      const chunkBytes = new TextEncoder().encode(chunk);
      view.set(chunkBytes, offset);
      offset += chunkBytes.length;
    }
    return buffer;
  }
};

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Global test setup
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
});

// Global test teardown
afterEach(() => {
  // Clean up any side effects
});
