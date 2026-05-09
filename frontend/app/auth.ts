
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createHmac } from "crypto";

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
      } else if (user?.id) {
        token.id = user.id;
      }

      return token
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }

      return session;
    },
  },
})
