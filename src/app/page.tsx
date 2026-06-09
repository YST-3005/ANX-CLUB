import Link from "next/link";

export default function RootLandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0f1d',
      color: '#f8fafc',
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: '4rem 2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Orbs */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(0,0,0,0) 70%)',
        top: '-100px',
        left: '-100px',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(0,0,0,0) 70%)',
        bottom: '-100px',
        right: '-100px',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(0,0,0,0) 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />

      {/* Main Header */}
      <header style={{ textAlign: 'center', marginBottom: '4rem', zIndex: 10 }}>
        <span style={{
          textTransform: 'uppercase',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: '#10b981',
          letterSpacing: '0.15em',
          display: 'block',
          marginBottom: '0.75rem'
        }}>
          Multi-Module Aggregator
        </span>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          margin: 0,
          background: 'linear-gradient(to right, #10b981, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.03em'
        }}>
          A.N.X V1 Platform
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.25rem', marginTop: '1rem', maxWidth: '600px' }}>
          An integrated hub uniting specialized engineering modules into a single, cohesive portal.
        </p>
      </header>

      {/* Grid of Modules */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
        gap: '2rem',
        width: '100%',
        maxWidth: '1200px',
        zIndex: 10
      }}>
        {/* Module 1 Card */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '1.5rem',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.3s ease, border-color 0.3s ease'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 600 }}>
                Active & Integrated
              </span>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Module 1</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
              User Onboarding Portal
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
              React + Vite single-page client authentication flow featuring visitor signup, profiles, and administrative user controls.
            </p>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <Link href="/module1" style={{
              display: 'block',
              textAlign: 'center',
              padding: '1rem',
              background: 'linear-gradient(to right, #10b981, #059669)',
              borderRadius: '0.75rem',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              Launch Onboarding Portal
            </Link>
          </div>
        </div>

        {/* Module 2 Card */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '1.5rem',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.3s ease, border-color 0.3s ease'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 600 }}>
                Active & Verified
              </span>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Module 2</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
              Member Dashboard APIs
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
              Aggregation BFF endpoint providing user profiles, registrations, advisor bookings, custom project reviews, and mock/live database states.
            </p>
          </div>

          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/api/v1/module2/dashboard?userId=user_rohit&mock=true" target="_blank" style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '0.75rem',
              color: '#f8fafc',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              transition: 'background-color 0.2s'
            }}>
              Test Dashboard Endpoint (JSON)
            </Link>
            <Link href="/api/v1/module2/auth?email=rohit@example.com" target="_blank" style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '0.75rem',
              color: '#f8fafc',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              transition: 'background-color 0.2s'
            }}>
              Test Auth Endpoint (JSON)
            </Link>
          </div>
        </div>

        {/* Module 3 Card */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '1.5rem',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.3s ease, border-color 0.3s ease'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 600 }}>
                Active & Integrated
              </span>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Module 3</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
              Community Platform
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
              Full frontend portal featuring a real-time conversational AI assistant, custom project creation feeds, interactive roadmaps, and online booking scheduling.
            </p>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <Link href="/module3" style={{
              display: 'block',
              textAlign: 'center',
              padding: '1rem',
              background: 'linear-gradient(to right, #8b5cf6, #6d28d9)',
              borderRadius: '0.75rem',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              Launch Community Platform
            </Link>
          </div>
        </div>

        {/* Module 4 Card */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '1.5rem',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.3s ease, border-color 0.3s ease'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 600 }}>
                Active & Integrated
              </span>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Module 4</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
              Forge Alumnus Events
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
              Alumni networking and events ticketing portal featuring user registrations, Razorpay order payment flows, and transactional email confirmations.
            </p>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <Link href="/module4" style={{
              display: 'block',
              textAlign: 'center',
              padding: '1rem',
              background: 'linear-gradient(to right, #3b82f6, #1d4ed8)',
              borderRadius: '0.75rem',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              Launch Alumnus Events
            </Link>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: '5rem', color: '#475569', fontSize: '0.875rem', zIndex: 10 }}>
        A.N.X Platform Core &bull; Local Environment Verified
      </footer>
    </div>
  );
}
