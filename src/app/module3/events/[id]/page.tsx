"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { createRazorpayOrder } from "@/modules/module3/lib/razorpay";
import toast from "react-hot-toast";
import { COLLEGES_BY_STATE } from "@/modules/module3/lib/data/colleges";
import { auth } from "@/modules/module3/lib/firebase/client";

export default function EventDetail({ params }: { params: { id: string } }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    state: '',
    selectedCollege: '',
    customCollege: '',
    mobile: '',
    teamName: '',
    teamMembers: ''
  });
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/v1/module3/events/${params.id}`);
        if (!res.ok) throw new Error('Event not found');
        const data = await res.json();
        setEvent(data);
      } catch (err: any) {
        toast.error(err.message);
        router.push('/module3/events');
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

  const isPremium = profile?.membershipType === "Premium";
  const finalPrice = isPremium && event.premiumPrice !== undefined ? event.premiumPrice : event.price;
  
  const isSoldOut = (event.registeredCount || 0) >= event.seats;

  const handleOpenModal = () => {
    if (!user) {
      toast.error("Please log in to register");
      router.push("/module3/login");
      return;
    }
    
    if (event.memberOnly && !isPremium) {
      toast.error("This event is for Premium Members only. Please upgrade your membership.");
      router.push("/module3/membership");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      name: profile?.fullName || 'User',
      email: profile?.email || user?.email || ''
    }));
    setIsModalOpen(true);
  };



  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setRegistering(true);
    
    const finalCollege = formData.selectedCollege === 'Other' ? formData.customCollege : formData.selectedCollege;
    const fullCollegeString = formData.state ? `${finalCollege}, ${formData.state}` : finalCollege;

    if (finalPrice > 0) {
      try {
        const order = await createRazorpayOrder(finalPrice, 'INR', {
          userId: user.uid,
          email: formData.email,
          purpose: 'event_registration',
          eventId: event.id,
          name: formData.name,
          college: fullCollegeString,
          mobile: formData.mobile,
          teamName: formData.teamName,
          teamMembers: formData.teamMembers
        });
  
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
          amount: order.amount,
          currency: order.currency,
          name: "Community Platform",
          description: `Registration for ${event.title}`,
          order_id: order.id,
          handler: async function () {
            try {
              // Wait a few seconds for the webhook to process
              toast.success("Payment successful! Processing registration...");
              setTimeout(() => {
                router.refresh();
              }, 3000);
            } catch (err: any) {
              toast.error("Payment error: " + err.message);
            }
          },
          prefill: {
            name: formData.name,
            email: formData.email,
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
        setRegistering(false);
      }
    } else {
      // Free Registration
      try {
        const res = await fetch('/api/v1/module3/events/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            userId: user.uid,
            userEmail: formData.email,
            userName: formData.name,
            college: fullCollegeString,
            mobile: formData.mobile,
            teamName: formData.teamName,
            teamMembers: formData.teamMembers
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to register');
        
        toast.success("Registered successfully!");
        setIsModalOpen(false);
        setEvent((prev: any) => ({ ...prev, registeredCount: prev.registeredCount + 1 }));
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setRegistering(false);
      }
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="glass-panel">
        <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
          {new Date(event.date).toLocaleDateString()} • {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
        <h1 style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>{event.title}</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          By {event.speaker}
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)' }}>
            <strong>Type:</strong> {event.type}
          </div>
          <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)' }}>
            <strong>Seats:</strong> {event.seats - (event.registeredCount || 0)} Available
          </div>
          {event.memberOnly && (
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
            {isPremium && event.price > 0 && event.premiumPrice < event.price && (
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
              <div className="input-group">
                <label className="input-label">Name <span style={{ color: 'var(--accent-color)' }}>*</span></label>
                <input 
                  className="input-field" 
                  type="text" 
                  required
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Email Address <span style={{ color: 'var(--accent-color)' }}>*</span></label>
                <input 
                  className="input-field" 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Where should we send your ticket?"
                />
              </div>

              <div className="input-group">
                <label className="input-label">State <span style={{ color: 'var(--accent-color)' }}>*</span></label>
                <select 
                  className="input-field" 
                  required 
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value, selectedCollege: '', customCollege: '' }))}
                >
                  <option value="" disabled>Select your State</option>
                  {Object.keys(COLLEGES_BY_STATE).map((stateName) => (
                    <option key={stateName} value={stateName}>{stateName}</option>
                  ))}
                </select>
              </div>

              {formData.state && (
                <div className="input-group">
                  <label className="input-label">College / University <span style={{ color: 'var(--accent-color)' }}>*</span></label>
                  <select 
                    className="input-field" 
                    required 
                    value={formData.selectedCollege}
                    onChange={(e) => setFormData(prev => ({ ...prev, selectedCollege: e.target.value }))}
                  >
                    <option value="" disabled>Select your College</option>
                    {COLLEGES_BY_STATE[formData.state]?.map((collegeName) => (
                      <option key={collegeName} value={collegeName}>{collegeName}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.selectedCollege === 'Other' && (
                <div className="input-group">
                  <label className="input-label">Enter College Name <span style={{ color: 'var(--accent-color)' }}>*</span></label>
                  <input 
                    className="input-field" 
                    type="text" 
                    required 
                    value={formData.customCollege}
                    onChange={(e) => setFormData(prev => ({ ...prev, customCollege: e.target.value }))}
                    placeholder="Type your college name..."
                  />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Mobile Number <span style={{ color: 'var(--accent-color)' }}>*</span></label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    className="input-field" 
                    type="tel" 
                    required 
                    value={formData.mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="+91 9876543210"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Team Name <span style={{color: 'red'}}>*</span></label>
                <input 
                  className="input-field" 
                  type="text" 
                  value={formData.teamName}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                  placeholder="Enter your team name"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Team Members <span style={{color: 'red'}}>*</span></label>
                <textarea 
                  className="input-field" 
                  rows={2}
                  value={formData.teamMembers}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamMembers: e.target.value }))}
                  placeholder="Comma separated names of your team members"
                  required
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
