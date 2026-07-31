'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Check, Zap, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/lib/api';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect to get started with A.N.X.',
    badge: null,
    features: [
      'Access to community discussions',
      'Browse events & mentors',
      'View public projects',
      'Basic profile',
    ],
    cta: 'Current Plan',
    disabled: true,
    variant: 'secondary' as const,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 999,
    period: '/year',
    description: 'Unlock the full A.N.X experience.',
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'Register for paid events at discount',
      'Book unlimited mentor sessions',
      'Priority community support',
      'Exclusive workshops & masterclasses',
      'Project collaboration hub',
      'Certificate of membership',
      'Direct access to hiring partners',
    ],
    cta: 'Upgrade to Premium',
    disabled: false,
    variant: 'premium' as const,
  },
];

export default function MembershipPage() {
  const { user, isAuthenticated } = useAuth();

  const handleUpgrade = async (plan: typeof PLANS[0]) => {
    if (!isAuthenticated) {
      toast.error('Please sign in first');
      return;
    }
    if (plan.price === 0) return;

    try {
      const orderRes = await paymentsApi.createOrder({
        amount: plan.price * 100,
        membershipType: 'Premium',
      });
      const order = orderRes.data;

      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'A.N.X Platform',
          description: 'Premium Membership',
          order_id: order.id,
          handler: async (response: any) => {
            try {
              await paymentsApi.verify(response);
              toast.success('🎉 Welcome to Premium!');
            } catch {
              toast.error('Payment verification failed');
            }
          },
          prefill: { email: user?.email || '' },
          theme: { color: '#6366f1' },
        });
        rzp.open();
      } else {
        toast.error('Payment system not available. Refresh and try again.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to initiate payment');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      <div className="flex flex-col items-center text-center mb-10 mt-6">
        <Badge variant="premium" className="mb-4">
          <Star className="h-3 w-3 mr-1" /> A.N.X PRO
        </Badge>
        <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 mb-4 tracking-tight">
          Supercharge your career
        </h1>
        <p className="text-gray-400 max-w-2xl text-lg">
          Join the exclusive community of top builders and access premium mentorship, events, and resources.
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card
              padding="lg"
              className={`flex flex-col h-full relative ${plan.badge ? 'border-primary ring-1 ring-primary/30' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="primary" className="shadow-sm">
                    <Star className="h-3 w-3" />
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                  {plan.id === 'premium' && (
                    <div className="p-1.5 rounded-lg bg-yellow-500/20">
                      <Zap className="h-4 w-4 text-yellow-400" />
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">
                    {plan.price === 0 ? 'Free' : formatCurrency(plan.price)}
                  </span>
                  {plan.period && (
                    <span className="text-gray-400 mb-1.5">{plan.period}</span>
                  )}
                </div>
                {plan.price > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Only {formatCurrency(Math.round(plan.price / 12))}/month
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 rounded-full bg-emerald-500/10 p-0.5 shrink-0">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.variant}
                className="w-full"
                disabled={plan.disabled}
                onClick={() => handleUpgrade(plan)}
                rightIcon={!plan.disabled ? <ArrowRight className="h-4 w-4" /> : undefined}
              >
                {plan.cta}
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Guarantee */}
      <div className="text-center py-4">
        <p className="text-sm text-foreground-muted">
          🔒 Secure payment via Razorpay · 30-day money-back guarantee ·{' '}
          <Link href="/community" className="text-primary hover:underline">Have questions? Ask the community</Link>
        </p>
      </div>
    </div>
  );
}
