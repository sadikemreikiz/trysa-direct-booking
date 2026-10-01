import { createAuthClient } from "better-auth/react";

// Browser side: sign in / out with Google. The base URL is the site's own address.
export const authClient = createAuthClient();
