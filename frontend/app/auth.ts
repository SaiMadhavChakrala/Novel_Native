
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      checks: ['none'], // Keep this if you added it earlier to fix the PKCE issue
    }),
  ],
  // 👇 ADD THIS CALLBACKS SECTION 👇
  callbacks: {
    jwt({ token, user }) {
      if (user) { // User is available during sign-in
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        // Inject the Google User ID (token.sub) into the session
        session.user.id = token.sub; 
      }
      return session;
    },
  },
})