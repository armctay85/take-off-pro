import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

// ── Session setup ────────────────────────────────────────────────────────────
export function getSession() {
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: SESSION_TTL / 1000,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL,
    },
  });
}

// ── Auth middleware ───────────────────────────────────────────────────────────
export const isAuthenticated: RequestHandler = (req, res, next) => {
  const userId = (req.session as any).userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Attach a minimal user object so downstream routes that use req.user still work
  (req as any).user = { id: userId };
  next();
};

// ── Auth routes + setup ───────────────────────────────────────────────────────
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // GET /api/auth/user — return current user
  app.get("/api/auth/user", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, userId));
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/register
  app.post("/api/register", async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    try {
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (existing.length > 0) {
        return res.status(409).json({ message: "Email already registered" });
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const [user] = await db.insert(users).values({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        passwordHash,
      }).returning({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName });
      (req.session as any).userId = user.id;
      res.status(201).json(user);
    } catch (err: any) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // POST /api/login
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      (req.session as any).userId = user.id;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (err) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // POST /api/logout
  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  // Legacy GET /api/logout redirect (for any old links)
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });

  // GET /api/login — redirect to frontend (Replit used this as OIDC redirect)
  app.get("/api/login", (_req, res) => {
    res.redirect("/?login=1");
  });
}
