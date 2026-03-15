import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/server/db/prisma';
import { z } from 'zod';
import type { UserRole } from '@prisma/client';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const admin = await prisma.adminUser.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            username: true,
            passwordHash: true,
            role: true,
          },
        });

        // H3 fix: always run bcrypt.compare to prevent timing attack.
        // Without this, missing email returns ~5ms vs valid email ~100ms,
        // allowing attackers to enumerate valid admin email addresses.
        const DUMMY_HASH = '$2a$10$dummy.hash.to.prevent.timing.attack.padding00000';
        const passwordValid = await compare(password, admin?.passwordHash ?? DUMMY_HASH);
        if (!admin || !passwordValid) return null;
        if (!passwordValid) return null;

        return {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          role: admin.role as UserRole,
        };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // H2 fix: 8h instead of default 30d
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          username: user.username,
          role: user.role,
        };
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          username: token.username as string,
          role: token.role as UserRole,
        },
      };
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
});
