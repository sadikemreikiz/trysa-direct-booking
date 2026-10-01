/** The test server's settings, shared by the Playwright config and the tests. */
const DB_PORT = "5434";

export const E2E_ENV = {
  DB_PORT,
  DATABASE_URL: `postgres://postgres@127.0.0.1:${DB_PORT}/postgres`,
  // Used only by the throwaway test server
  BETTER_AUTH_SECRET: "e2e-only-secret-for-the-throwaway-test-server",
  BETTER_AUTH_URL: "http://localhost:3100",
};
