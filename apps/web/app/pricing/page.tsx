"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Footer } from "@/components/shell/Footer";

interface Plan {
  id: string;
  name: string;
  priceUsdCents: number;
  monthlyCredits: number;
}

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/v1/plans`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setPlans(data.plans || []);
        }
      } catch {
        // Ignore errors, show empty state
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime" />
      </div>
    );
  }

  return (
    <AppShell active="home">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Simple Pricing</h1>
          <p className="text-white/60">Simple, transparent pricing. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-white/[0.08] bg-panel p-6 relative">
              {plan.id === "pro" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime text-black px-2 py-[2px] text-[9px] font-bold">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-[12px] text-white/60 mb-4">${(plan.priceUsdCents / 100).toFixed(2)}/mo</p>
              <div className="mb-6">
                <p className="text-2xl font-bold text-white">${plan.monthlyCredits}</p>
                <p className="text-[11px] text-white/40">credits per month</p>
              </div>
              <ul className="space-y-2 mb-6 text-[12px] text-white/60">
                <li>• Generate videos from text</li>
                <li>• Generate images from text</li>
                <li>• Lip sync videos</li>
                <li>• Auto captions</li>
                <li>• Commercial usage rights</li>
              </ul>
              <button
                className="w-full bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-lime/90 transition"
                disabled={!user}
                title={!user ? "Please sign in to subscribe" : undefined}
              >
                {user ? "Get Started" : "Sign in to subscribe"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </AppShell>
  );
}
