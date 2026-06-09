"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Script from "next/script";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/modules/module3/lib/razorpay";
import toast from "react-hot-toast";

export default function Membership() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      router.push("/module3/login");
      return;
    }
    setLoading(true);

    try {
      const order = await createRazorpayOrder(999);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: order.amount,
        currency: order.currency,
        name: "Community Platform",
        description: "Premium Membership",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await verifyRazorpayPayment(response, user.uid, profile?.email, 999, "Premium membership");
            toast.success("Payment successful! You are now a Premium Member.");
            router.push("/module3/dashboard");
          } catch (err: any) {
            toast.error("Payment verification failed: " + err.message);
          }
        },
        prefill: {
          name: profile?.fullName || "",
          email: profile?.email || "",
        },
        theme: {
          color: "#0070f3",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        toast.error("Payment Failed: " + response.error.description);
      });
      rzp.open();
    } catch (error: any) {
      toast.error("Error initiating payment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <h1 style={{ marginBottom: '1rem' }}>Upgrade to Premium</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '3rem', color: 'var(--text-muted)' }}>
        Get exclusive access to events, mentorship, and premium resources.
      </p>

      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Free Plan */}
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', maxWidth: '400px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Basic Member</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem' }}>Free</div>
          
          <ul style={{ listStyle: 'none', marginBottom: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li>✓ Access to public events</li>
            <li>✓ Basic community updates</li>
            <li>✓ Basic dashboard</li>
            <li>✓ Public project showcase</li>
          </ul>

          <button className="btn btn-secondary" disabled style={{ width: '100%' }}>
            {profile?.membershipType === "Free" ? "Current Plan" : "Included"}
          </button>
        </div>

        {/* Premium Plan */}
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', maxWidth: '400px', textAlign: 'left', display: 'flex', flexDirection: 'column', border: '1px solid var(--primary-color)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Premium Member</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem' }}>₹999<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/year</span></div>
          
          <ul style={{ listStyle: 'none', marginBottom: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li>✓ <b>All Free benefits</b></li>
            <li>✓ Event discounts & Priority registration</li>
            <li>✓ Free/basic mentorship sessions</li>
            <li>✓ Premium roadmaps</li>
            <li>✓ Project team opportunities</li>
            <li>✓ Certificates and recognition</li>
          </ul>

          {profile?.membershipType === "Premium" && profile.membershipExpiry && (
            <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              Expires on: {new Date(profile.membershipExpiry).toLocaleDateString()}
            </div>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handleUpgrade} 
            disabled={loading || profile?.membershipType === "Premium"}
            style={{ width: '100%' }}
          >
            {loading ? "Processing..." : profile?.membershipType === "Premium" ? "Current Plan" : "Upgrade Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
