// app/api/auth/[...nextauth]/route.ts
// next-auth's own endpoints (session, CSRF, sign out).
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
