import Stripe from 'stripe';

// API version pinned per spec. The installed SDK type for `apiVersion` may not
// include this preview version; cast as any to avoid a type error.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  // SDK type for apiVersion may not include the .clover preview; cast as any per spec.
  apiVersion: '2025-09-30.clover' as never,
});
