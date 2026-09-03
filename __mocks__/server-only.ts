// __mocks__/server-only.ts
//
// Vitest runs in plain Node, not Next.js's server compiler, so the real
// "server-only" package's guard throws unconditionally when imported here.
// vitest.config.ts aliases "server-only" to this no-op stub during tests.
export {};

