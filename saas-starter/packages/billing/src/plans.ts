export type PlanId = 'free' | 'pro';

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceMonthlyCents: number | null;
  priceId: string | null;
  features: string[];
  highlight?: boolean;
};

export function getPlans(): PlanConfig[] {
  const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() || null;
  return [
    {
      id: 'free',
      name: 'Free',
      priceMonthlyCents: 0,
      priceId: null,
      features: ['1 organization', 'Up to 3 team members', 'Community support'],
    },
    {
      id: 'pro',
      name: 'Pro',
      priceMonthlyCents: 2900,
      priceId,
      features: ['Unlimited team members', 'Advanced analytics', 'Priority support'],
      highlight: true,
    },
  ];
}

export function isMockMode(): boolean {
  return !process.env.STRIPE_SECRET_KEY;
}

export function appUrl(): string {
  return process.env.APP_URL ?? 'http://localhost:3000';
}
