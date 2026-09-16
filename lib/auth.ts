import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const FAILED_LOGIN_LOCK_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      orgId: string;
      branchId: string | null;
      roles: Role[];
      mustChangePassword: boolean;
      name: string;
      email: string;
    };
  }
}

interface AppJWT {
  id: string;
  orgId: string;
  branchId: string | null;
  roles: Role[];
  mustChangePassword: boolean;
}

interface AuthorizedUser {
  id: string;
  orgId: string;
  branchId: string | null;
  roles: Role[];
  mustChangePassword: boolean;
  name: string;
  email: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Staff login — email + password against User.passwordHash.
    // Customer-facing OTP + Google/Facebook providers are added in Phase 2
    // (checkout / my-account) once lib/sms.ts and OAuth app credentials exist.
    Credentials({
      id: "staff-credentials",
      name: "Staff login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findFirst({
          where: { email, active: true },
        });
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const failedAttempts = user.failedLoginAttempts + 1;
          const lockingOut = failedAttempts >= FAILED_LOGIN_LOCK_THRESHOLD;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: lockingOut ? 0 : failedAttempts,
              lockedUntil: lockingOut ? new Date(Date.now() + LOCKOUT_DURATION_MS) : user.lockedUntil,
            },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        // TODO: when user.twoFactorEnabled, short-circuit here and require a
        // verified TOTP code before returning the user — 2FA is mandatory
        // for OWNER/ADMIN roles per the build spec §7. Not yet scheduled to
        // a specific build-order phase; needs its own TOTP setup/verify UI.

        return {
          id: user.id,
          orgId: user.orgId,
          branchId: user.branchId,
          roles: user.roles,
          mustChangePassword: user.mustChangePassword,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const appToken = token as unknown as AppJWT;
      if (user) {
        const authorizedUser = user as unknown as AuthorizedUser;
        appToken.id = authorizedUser.id;
        appToken.orgId = authorizedUser.orgId;
        appToken.branchId = authorizedUser.branchId;
        appToken.roles = authorizedUser.roles;
        appToken.mustChangePassword = authorizedUser.mustChangePassword;
      }
      // Lets the client call useSession().update({ mustChangePassword: false })
      // right after a successful password change, instead of forcing a
      // full re-login just to clear the forced-change redirect.
      if (trigger === "update" && session && typeof session === "object" && "mustChangePassword" in session) {
        appToken.mustChangePassword = Boolean((session as { mustChangePassword: unknown }).mustChangePassword);
      }
      return token;
    },
    async session({ session, token }) {
      const appToken = token as unknown as AppJWT;
      session.user.id = appToken.id;
      session.user.orgId = appToken.orgId;
      session.user.branchId = appToken.branchId;
      session.user.roles = appToken.roles;
      session.user.mustChangePassword = appToken.mustChangePassword;
      return session;
    },
  },
});
