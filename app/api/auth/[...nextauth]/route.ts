// app/api/auth/[...nextauth]/route.ts
// Auth.js route handlers (sign-in, callback, session, csrf, sign-out).
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
