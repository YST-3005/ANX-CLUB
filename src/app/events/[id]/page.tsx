"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import toast from "react-hot-toast";
import { Event } from "@/types";

export default function EventDetail({ params }: { params: { id: string } }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    teamName: '',
    teamMembers: ''
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/v1/events/${params.id}`);
        if (!res.ok) throw new Error('Event not found');
        const result = await res.json();
        setEvent(result.data || result);
      } catch (err: any) {
        toast.error(err.message);
        router.push('/events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [params.id, router]);

  if (loading) {
    return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading event details...</div>;
  }
  
  if (!event) return null;

  const isPremium = profile?.membershipType?.toLowerCase() === "premium" || profile?.role === "Premium Member";
  const finalPrice = isPremium && event.premiumPrice !== undefined ? event.premiumPrice : event.price;
  
  const seatsAvailable = event.seatsAvailable ?? event.seats ?? 0;
  const seatsBooked = event.seatsBooked ?? event.registeredCount ?? 0;
  const isSoldOut = seatsBooked >= seatsAvailable;

  const handleOpenModal = () => {
    if (!user) {
      toast.error("Please log in to register");
      router.push("/login");
      return;
    }
    
    if (event.eventType === "member-only" && !isPremium) {
      toast.error("This event is for Premium Members only. Please upgrade your membership.");
      router.push("/membership");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      name: profile?.fullName || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phoneNumber || ''
    }));
    setIsModalOpen(true);
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setRegistering(true);

    const token = await user.getIdToken();

    try {
      const res = await fetch(`/api/v1/events/${event.id}/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          college: formData.college,
          teamName: formData.teamName,
          teamMembers: formData.teamMembers
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to register');

      if (data.paymentRequired) {
        const options = {
          key: data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_dummykey",
          amount: data.amount * 100,
          currency: data.currency || "INR",
          name: "ANX Platform",
          description: `Registration for ${event.title}`,
          order_id: data.orderId,
          handler: async function (response: any) {
            try {
              setRegistering(true);
              const verifyRes = await fetch("/api/v1/payments/verify", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  eventId: event.id,
                  name: formData.name,
                  email: formData.email,
                  phone: formData.phone,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyData.success) throw new Error(verifyData.message);
              
              toast.success("Registration and payment successful!");
              setIsModalOpen(false);
              setEvent((prev: any) => {
                if (!prev) return null;
                return {
                  ...prev,
                  seatsBooked: (prev.seatsBooked ?? 0) + 1,
                  registeredCount: (prev.registeredCount ?? 0) + 1
                };
              });
            } catch (err: any) {
              toast.error("Verification failed: " + err.message);
            } finally {
              setRegistering(false);
            }
          },
          prefill: data.prefill || {
            name: formData.name,
            email: formData.email,
            contact: formData.phone
          },
          theme: {
            color: "#0f1f4a",
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          toast.error("Payment Failed: " + response.error.description);
        });
        rzp.open();
      } else {
        toast.success("Registered successfully!");
        setIsModalOpen(false);
        setEvent((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            seatsBooked: (prev.seatsBooked ?? 0) + 1,
            registeredCount: (prev.registeredCount ?? 0) + 1
          };
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to register.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="glass-panel">
        <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
          {new Date(event.date).toLocaleDateString()}
        </span>
        <h1 style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>{event.title}</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {event.speakerName || event.speaker ? `By ${event.speakerName || event.speaker}` : ""}
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)' }}>
            <strong>Type:</strong> {event.eventType || event.type || "Event"}
          </div>
          <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)' }}>
            <strong>Seats:</strong> {isSoldOut ? "0" : seatsAvailable - seatsBooked} Available
          </div>
          {event.eventType === "member-only" && (
            <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--secondary-color)', color: 'white', borderRadius: 'var(--radius-md)' }}>
              <strong>Members Only</strong>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '3rem' }}>
          <h3>About this event</h3>
          <p style={{ marginTop: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.description}</p>
        </div>

        <div style={{ padding: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Registration Fee</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              {finalPrice === 0 ? "Free" : `₹${finalPrice}`}
            </div>
            {isPremium && event.price > 0 && event.premiumPrice !== undefined && event.premiumPrice < event.price && (
              <div style={{ color: 'var(--primary-color)', fontSize: '0.875rem', fontWeight: 600 }}>Premium Discount Applied! (Regular: ₹{event.price})</div>
            )}
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleOpenModal} 
            disabled={registering || isSoldOut} 
            style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}
          >
            {registering ? "Processing..." : isSoldOut ? "Sold Out" : "Register Now"}
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Complete Registration</h2>
            
            <form onSubmit={submitRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Name <span style={{ color: 'var(--accent-color)' }}>*</span></label>
                <input 
                  className="form-input" 
                  type="text" 
                  required
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address <span style={{ color: 'var(--accent-color)' }}>*</span></label>
                <input 
                  className="form-input" 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Where should we send your ticket?"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input 
                  className="form-input" 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="form-group">
                <label className="form-label">College / University</label>
                <input 
                  className="form-input" 
                  type="text" 
                  value={formData.college}
                  onChange={(e) => setFormData(prev => ({ ...prev, college: e.target.value }))}
                  placeholder="Your college name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Team Name (if applicable)</label>
                <input 
                  className="form-input" 
                  type="text" 
                  value={formData.teamName}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                  placeholder="Enter team name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Team Members (comma separated)</label>
                <textarea 
                  className="form-input" 
                  rows={2}
                  value={formData.teamMembers}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamMembers: e.target.value }))}
                  placeholder="Names of other team members"
                  style={{ fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={registering}
                  style={{ flex: 1, opacity: registering ? 0.7 : 1 }}
                >
                  {registering ? 'Processing...' : (finalPrice > 0 ? `Pay ₹${finalPrice}` : "Confirm Registration")}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
