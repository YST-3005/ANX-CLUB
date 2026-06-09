"use client";

import { useAuth } from "@/modules/module3/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/modules/module3/lib/firebase/client";

interface UserData {
  uid: string;
  email: string;
  fullName: string;
  role: string;
  membershipType: string;
  membershipExpiry?: string;
}

export default function AdminUsers() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [fetching, setFetching] = useState(true);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editMembership, setEditMembership] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || profile?.role !== "Admin") {
        router.push("/module3/dashboard");
      } else {
        fetchUsers();
      }
    }
  }, [loading, user, profile, router]);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users", error);
      alert("Failed to fetch users. Check Firestore rules.");
    } finally {
      setFetching(false);
    }
  };

  const handleEdit = (u: UserData) => {
    setEditingUser(u);
    setEditMembership(u.membershipType || "Free");
    
    if (u.membershipExpiry) {
      // Format to YYYY-MM-DD for date input
      const date = new Date(u.membershipExpiry);
      setEditExpiry(date.toISOString().split('T')[0]);
    } else {
      setEditExpiry("");
    }
  };

  const handleSave = async () => {
    if (!editingUser || !user) return;
    setSaving(true);
    try {
      const response = await fetch('/api/v1/module3/admin/users/update', {
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
        throw new Error(data.error);
      }

      alert("User updated successfully");
      setEditingUser(null);
      fetchUsers(); // Refresh list
    } catch (error: any) {
      alert("Error updating user: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || fetching) return <div className="container" style={{ padding: "4rem 0" }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1>Manage Users</h1>
      <div className="glass-panel" style={{ marginTop: '2rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Email</th>
              <th style={{ padding: '1rem' }}>Role</th>
              <th style={{ padding: '1rem' }}>Membership</th>
              <th style={{ padding: '1rem' }}>Expiry Date</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.uid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>{u.fullName}</td>
                <td style={{ padding: '1rem' }}>{u.email}</td>
                <td style={{ padding: '1rem' }}>{u.role}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    backgroundColor: u.membershipType === 'Premium' ? 'var(--primary-color)' : 'var(--surface-hover)',
                    color: u.membershipType === 'Premium' ? '#fff' : 'inherit',
                    fontSize: '0.875rem'
                  }}>
                    {u.membershipType || 'Free'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {u.membershipExpiry ? new Date(u.membershipExpiry).toLocaleDateString() : 'N/A'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => handleEdit(u)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '400px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
            <h2>Edit {editingUser.fullName}</h2>
            
            <div className="input-group" style={{ marginTop: '1.5rem' }}>
              <label className="input-label">Membership Type</label>
              <select className="input-field" value={editMembership} onChange={(e) => setEditMembership(e.target.value)}>
                <option value="Free">Free</option>
                <option value="Premium">Premium</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Expiry Date</label>
              <input type="date" className="input-field" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditingUser(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
