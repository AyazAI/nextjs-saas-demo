import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/server/password";

const providers: NextAuthOptions["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  );
}

export function githubEnabled(): boolean {
  return Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "github" && !user.email) return false;
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "github") {
        const email = user?.email?.toLowerCase();
        if (!email) return token;
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email,
            name: user.name ?? email,
            image: user.image ?? undefined,
          },
        });
        token.id = dbUser.id;
        return token;
      }
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id;
      return session;
    },
  },
};
