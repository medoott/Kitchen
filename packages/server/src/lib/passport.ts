import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import prisma from './db.js';

export function initPassport() {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
  const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: `${BASE_URL}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email in Google profile'));

            let customer = await prisma.customer.findUnique({ where: { email } });
            if (!customer) {
              customer = await prisma.customer.create({
                data: {
                  email,
                  name: profile.displayName || email,
                  password: null,
                },
              });
            }
            done(null, { id: customer.id, email: customer.email, type: 'customer' as const });
          } catch (err) {
            done(err as Error);
          }
        }
      )
    );
  }

  if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: FACEBOOK_APP_ID,
          clientSecret: FACEBOOK_APP_SECRET,
          callbackURL: `${BASE_URL}/api/auth/facebook/callback`,
          profileFields: ['id', 'emails', 'name', 'displayName'],
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email in Facebook profile'));

            let customer = await prisma.customer.findUnique({ where: { email } });
            if (!customer) {
              customer = await prisma.customer.create({
                data: {
                  email,
                  name: profile.displayName || email,
                  password: null,
                },
              });
            }
            done(null, { id: customer.id, email: customer.email, type: 'customer' as const });
          } catch (err) {
            done(err as Error);
          }
        }
      )
    );
  }

  return passport;
}
