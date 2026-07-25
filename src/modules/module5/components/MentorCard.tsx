import Link from "next/link";
import Image from "next/image";

interface MentorCardProps {
  mentor: {
    id: string;
    name: string;
    role: string;
    company: string;
    imageUrl?: string;
    topics: string[];
  };
}

export default function MentorCard({ mentor }: MentorCardProps) {
  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          {mentor.imageUrl ? (
            <Image src={mentor.imageUrl} alt={mentor.name} width={60} height={60} style={{ borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--surface-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              {mentor.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>{mentor.name}</h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{mentor.role} at {mentor.company}</div>
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Topics:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {mentor.topics.map((topic: string) => (
              <span key={topic} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <Link href={`/mentors/${mentor.id}`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
        View Profile
      </Link>
    </div>
  );
}
