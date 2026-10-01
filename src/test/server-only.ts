// Test stand-in for Next's "server-only" marker: Next resolves it at build time (and fails
// the build if a client component imports server code); in Vitest it is simply a no-op.
export {};
