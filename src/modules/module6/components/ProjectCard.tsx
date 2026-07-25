import Link from "next/link";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    images?: string[];
    techStack?: string[];
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      {project.images && project.images.length > 0 && (
        <div style={{ width: '100%', height: '150px', backgroundImage: `url(${project.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{project.name}</h3>
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: project.status === "Launched" ? 'var(--primary-color)' : 'var(--surface-color)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
            {project.status}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>{project.description}</p>
        
        <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tech Stack:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {project.techStack?.map((tech: string) => (
              <span key={tech} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <Link href={`/projects/${project.id}`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>View Details</Link>
    </div>
  );
}
