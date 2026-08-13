import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function authenticate(request: NextRequest | Request): Promise<string | null> {
  let token = "";
  
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else if ('cookies' in request) {
    // NextRequest has cookies property
    const req = request as NextRequest;
    const sessionCookie = req.cookies.get("session") || req.cookies.get("__session");
    if (sessionCookie) token = sessionCookie.value;
  } else {
    // Fallback for standard Request, try to parse Cookie header
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:session|__session)=([^;]*)/);
      if (match) token = match[1];
    }
  }

  if (!token) return null;

  if (
    process.env.NODE_ENV === "development" &&
    (token.startsWith("mock_") ||
      token === "user_rohit" ||
      token === "default_user_123" ||
      token === "rohit@example.com" ||
      token === "emma.watson@example.com")
  ) {
    return token;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
}
