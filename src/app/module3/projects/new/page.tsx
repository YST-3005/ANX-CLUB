"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/module3/components/AuthContext";
import { db, storage } from "@/modules/module3/lib/firebase/client";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

export default function SubmitProject() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    problemStatement: "",
    techStack: "",
    teamMembers: "",
    github: "",
    demo: "",
    status: "Idea"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to submit a project");
      return;
    }
    setLoading(true);
    
    try {
      let imageUrl = "";
      if (imageFile) {
        const storageRef = ref(storage, `projects/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const projectData = {
        name: formData.name,
        description: formData.description,
        problemStatement: formData.problemStatement,
        techStack: formData.techStack.split(",").map(s => s.trim()).filter(Boolean),
        teamMembers: formData.teamMembers.split(",").map(s => s.trim()).filter(Boolean),
        github: formData.github,
        demo: formData.demo,
        status: formData.status,
        approvalStatus: "pending",
        images: imageUrl ? [imageUrl] : [],
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "projects"), projectData);

      toast.success("Project submitted for review!");
      router.push("/module3/projects");
    } catch (error: any) {
      console.error("Error submitting project:", error);
      toast.error("Failed to submit project: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Submit a Project</h1>
      <div className="glass-panel">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label className="input-label">Project Name</label>
            <input type="text" name="name" className="input-field" required onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label">Short Description</label>
            <input type="text" name="description" className="input-field" required onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label">Problem Statement</label>
            <textarea name="problemStatement" className="input-field" rows={4} required onChange={handleChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Tech Stack (comma separated)</label>
              <input type="text" name="techStack" className="input-field" onChange={handleChange} placeholder="React, Node.js, Firebase" />
            </div>
            <div className="input-group">
              <label className="input-label">Team Members (comma separated)</label>
              <input type="text" name="teamMembers" className="input-field" onChange={handleChange} placeholder="Alice, Bob" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">GitHub Link</label>
              <input type="url" name="github" className="input-field" onChange={handleChange} />
            </div>
            <div className="input-group">
              <label className="input-label">Live Demo Link</label>
              <input type="url" name="demo" className="input-field" onChange={handleChange} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Status</label>
              <select name="status" className="input-field" onChange={handleChange} value={formData.status}>
                <option value="Idea">Idea</option>
                <option value="Building">Building</option>
                <option value="Launched">Launched</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Project Image / Screenshot</label>
              <input type="file" accept="image/*" className="input-field" onChange={handleImageChange} style={{ padding: '0.5rem' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? "Submitting..." : "Submit Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
