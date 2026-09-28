import { createAuthClient } from "better-auth/react";

// Tarayıcı tarafı: Google ile giriş / çıkış. Adres, sitenin kendi adresidir.
export const authClient = createAuthClient();
