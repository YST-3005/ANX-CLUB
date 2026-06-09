import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <nav className="nav">
        <div className="nav-brand">Community</div>
        <div className="nav-links">
          <Link href="/module3/events" className="nav-link">Events</Link>
          <Link href="/module3/projects" className="nav-link">Projects</Link>
          <Link href="/module3/mentors" className="nav-link">Mentors</Link>
          <Link href="/module3/members" className="nav-link">Members</Link>
          <Link href="/module3/login" className="btn btn-primary">Sign In</Link>
        </div>
      </nav>

      <main style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Build, Learn, and Grow Together
        </h1>
        <p style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
          Join the premier community for builders and creators. Get access to premium events, mentorship, and showcase your projects.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/module3/signup" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
            Join the Community
          </Link>
          <Link href="/module3/events" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
            Explore Events
          </Link>
        </div>
      </main>

      <section style={{ padding: '4rem 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel">
          <h3>Exclusive Events</h3>
          <p>Attend premium workshops, hackathons, and networking sessions.</p>
        </div>
        <div className="glass-panel">
          <h3>1:1 Mentorship</h3>
          <p>Get guided by industry experts and fast-track your career.</p>
        </div>
        <div className="glass-panel">
          <h3>Project Showcase</h3>
          <p>Show off your builds to the world and get feedback from peers.</p>
        </div>
      </section>
    </div>
  );
}
