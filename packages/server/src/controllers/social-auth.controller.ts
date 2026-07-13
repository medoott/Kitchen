import { Request, Response } from 'express';
import { generateToken } from '../middleware/auth.js';

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:5173';

export function handleSocialCallback(req: Request, res: Response): void {
  const customer = req.user as any;

  if (!customer?.id) {
    // Check if the OAuth state indicates a mobile client
    const state = (req.query.state as string) || '';
    const stateParams = new URLSearchParams(state);
    const isMobile = stateParams.get('mobile') === '1';
    const redirectUri = stateParams.get('redirectUri');

    if (isMobile && redirectUri) {
      res.redirect(`${redirectUri}?error=auth_failed`);
    } else {
      res.redirect(`${STOREFRONT_URL}/login?error=auth_failed`);
    }
    return;
  }

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    type: 'customer',
  });

  // Check if the OAuth state indicates a mobile client
  const state = (req.query.state as string) || '';
  const stateParams = new URLSearchParams(state);
  const isMobile = stateParams.get('mobile') === '1';
  const redirectUri = stateParams.get('redirectUri');

  if (isMobile && redirectUri) {
    res.redirect(`${redirectUri}?token=${encodeURIComponent(token)}`);
  } else {
    res.redirect(`${STOREFRONT_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  }
}
