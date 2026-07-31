'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Edit } from 'lucide-react';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');

  // Users come from Firestore via admin SDK; use the dashboard mock for now
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch from Firestore directly (client SDK)
      const { db } = await import('@/lib/firebase/client');
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const q = query(collection(db, 'users'), orderBy('joinedDate', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateUser({ userId: editUser?.id, role: newRole }),
    onSuccess: () => {
      toast.success('User updated!');
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Failed to update user'),
  });

  const users = data || [];
  const ROLES = ['Member', 'Mentor', 'Admin', 'Premium Member'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Users Management</h1>
        <p className="text-sm text-foreground-muted mt-0.5">{users.length} registered users</p>
      </div>

      {isLoading ? (
        <Card><SkeletonTable rows={5} cols={4} /></Card>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : users.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No users found" />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-hover">
                  {['User', 'Email', 'Phone', 'Role', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.fullName || user.email} size="sm" />
                        <span className="font-medium text-foreground truncate max-w-[150px]">
                          {user.fullName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">{user.email || '—'}</td>
                    <td className="px-4 py-3 text-foreground-secondary">{user.phoneNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === 'Admin' ? 'danger' : user.role === 'Mentor' ? 'primary' : user.role === 'Premium Member' ? 'premium' : 'success'} dot>
                        {user.role || 'Member'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary text-xs">{user.joinedDate ? new Date(user.joinedDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Edit className="h-3.5 w-3.5" />}
                        onClick={() => { setEditUser(user); setNewRole(user.role || 'Member'); }}
                      >
                        Edit Role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User Role" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-foreground-secondary">
            Changing role for: <strong className="text-foreground">{editUser?.fullName || editUser?.email}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-surface text-foreground text-sm px-3 outline-none focus:border-primary"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="primary" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
