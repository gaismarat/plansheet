import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { storage } from "./storage";
import type { Express, Request, Response, NextFunction } from "express";
import type { User, SafeUser, UserWithPermissions } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";

declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Trust proxy for correct HTTPS detection behind Replit's proxy
  app.set('trust proxy', 1);

  app.use(
    session({
      store: new PgSession({
        pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "construction-tracker-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Неверный логин или пароль" });
        }
        
        const isValid = await storage.validatePassword(user, password);
        if (!isValid) {
          return done(null, false, { message: "Неверный логин или пароль" });
        }
        
        const { passwordHash: _, ...safeUser } = user;
        return done(null, safeUser);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserWithPermissions(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SafeUser | false, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Ошибка авторизации" });
      }
      
      // Regenerate session before login to prevent session fixation
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          return next(regenerateErr);
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          
          // Save session to ensure new session ID is persisted
          req.session.save((saveErr) => {
            if (saveErr) {
              return next(saveErr);
            }
            return res.json({ user });
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((logoutErr) => {
      if (logoutErr) {
        return res.status(500).json({ message: "Ошибка выхода" });
      }
      
      // Destroy session completely on logout to ensure clean state
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        // Clear session cookie
        res.clearCookie('connect.sid');
        res.json({ message: "Выход выполнен" });
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    res.json({ user: req.user });
  });
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }
  next();
}

// Middleware to require admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }
  if (!(req.user as UserWithPermissions)?.isAdmin) {
    return res.status(403).json({ message: "Требуются права администратора" });
  }
  next();
}

// Middleware to check specific permission
export function requirePermission(permissionType: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    const user = req.user as UserWithPermissions;
    if (user.isAdmin) {
      return next();
    }
    
    const hasPermission = await storage.hasPermission(user.id, permissionType, resource);
    if (!hasPermission) {
      return res.status(403).json({ message: "Нет доступа" });
    }
    next();
  };
}
