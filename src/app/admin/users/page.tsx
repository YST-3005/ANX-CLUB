"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { UserProfile } from "@/modules/module3/components/AuthContext";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editMembership, setEditMembership] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile?.role !== "Admin") {
        router.push("/profile");
      } else {
        fetchUsers();
      }
    }
  }, [user, profile, loading, router]);

  const fetchUsers = async () => {
    try {
      setFetching(true);
      const snapshot = await getDocs(collection(db, "users"));
      const usersList = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersList);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users list.");
    } finally {
      setFetching(false);
    }
  };

  const getBadgeClass = (role: string) => {
    switch (role) {
      case "Admin": return "badge-admin";
      case "Premium Member": return "badge-premium";
      case "Mentor": return "badge-mentor";
      case "Member": return "badge-member";
      default: return "badge-visitor";
    }
  };

  const handleEditClick = (u: UserProfile) => {
    setEditingUser(u);
    setEditRole(u.role || "Member");
    setEditMembership(u.membershipType || "Free");
    
    if (u.membershipExpiry) {
      const date = new Date(u.membershipExpiry);
      setEditExpiry(date.toISOString().split('T')[0]);
    } else {
      setEditExpiry("");
    }
  };

  const handleSaveChanges = async () => {
    if (!editingUser || !user) return;
    setSaving(true);
    try {
      // 1. Update role directly in Firestore users collection
      const userRef = doc(db, "users", editingUser.uid);
      await updateDoc(userRef, { 
        role: editRole,
        membershipType: editMembership,
        membershipExpiry: editExpiry ? new Date(editExpiry).toISOString() : null
      });

      // 2. Call the admin API endpoint to sync/activate membership and logs
      const response = await fetch('/api/v1/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUid: user.uid,
          targetUid: editingUser.uid,
          membershipType: editMembership,
          membershipExpiry: editExpiry ? new Date(editExpiry).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sync membership updates.");
      }

      toast.success(`Successfully updated details for ${editingUser.fullName}`);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to save changes:", error);
      toast.error("Error saving updates: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || fetching || !user || profile?.role !== "Admin") {
    return (
      <div className="auth-container">
        <div className="glass-panel" style={{ textAlign: "center", padding: "2rem" }}>
          Loading users management...
        </div>
      </div>
    );
  }

  return (
    <div className="main-content animate-fade-in" style={{ padding: "2rem 0" }}>
      <div className="glass-panel">
        <h2 style={{ marginBottom: "2rem" }}>Admin Dashboard: User Management</h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                <th style={{ padding: "1rem", color: "var(--text-secondary)" }}>Name</th>
                <th style={{ padding: "1rem", color: "var(--text-secondary)" }}>Email</th>
                <th style={{ padding: "1rem", color: "var(--text-secondary)" }}>Joined</th>
                <th style={{ padding: "1rem", color: "var(--text-secondary)" }}>Role</th>
                <th style={{ padding: "1rem", color: "var(--text-secondary)" }}>Membership</th>
                <th style={{ padding: "1rem", color: "var(--text-secondary)" }}>Expiry Date</th>
                <th style={{ padding: "1rem", color: "var(--text-secondary)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid} style={{ borderBottom: "1px solid var(--surface-border)" }}>
                  <td style={{ padding: "1rem" }}>{u.fullName} {u.uid === user.uid && "(You)"}</td>
                  <td style={{ padding: "1rem" }}>{u.email}</td>
                  <td style={{ padding: "1rem" }}>
                    {u.joinedDate ? new Date(u.joinedDate).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span className={`badge ${getBadgeClass(u.role)}`}>{u.role}</span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      backgroundColor: u.membershipType === 'Premium' ? 'var(--primary-color)' : 'var(--surface-hover)',
                      color: u.membershipType === 'Premium' ? '#fff' : 'inherit',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      {u.membershipType || 'Free'}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {u.membershipExpiry ? new Date(u.membershipExpiry).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} 
                      onClick={() => handleEditClick(u)}
                      disabled={u.uid === user.uid}
                    >
                      Edit Settings
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No users found.
            </div>
          )}
        </div>
      </div>

      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '400px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
            <h2>Edit Settings: {editingUser.fullName}</h2>
            
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Role</label>
              <select className="form-input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="Visitor">Visitor</option>
                <option value="Member">Member</option>
                <option value="Premium Member">Premium Member</option>
                <option value="Mentor">Mentor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Membership Type</label>
              <select className="form-input" value={editMembership} onChange={(e) => setEditMembership(e.target.value)}>
                <option value="Free">Free</option>
                <option value="Premium">Premium</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input type="date" className="form-input" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditingUser(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveChanges} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
