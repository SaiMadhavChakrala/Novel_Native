
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createHmac } from "crypto";

const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function getInternalUserId(provider: string, providerAccountId: string) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is required for stable user ids.");
  }

  return `${provider}:${createHmac("sha256", secret).update(providerAccountId).digest("hex")}`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  // 👇 ADD THIS CALLBACKS SECTION 👇
  callbacks: {
    jwt({ token, user, account }) {
      if (account?.provider === "google") {
        token.id = getInternalUserId(account.provider, account.providerAccountId);
        token.legacyUserIds = uniqueStrings([
          account.providerAccountId,
          user?.id,
          typeof token.sub === "string" ? token.sub : undefined,
        ]).filter((id) => id !== token.id);
      } else if (user?.id) {
        token.id = user.id;
      }

      return token
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
        session.user.legacyUserIds = Array.isArray(token.legacyUserIds) ? token.legacyUserIds : [];
      }

      return session;
    },
  },
})
