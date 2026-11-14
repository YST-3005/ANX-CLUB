'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Award,
  Plus,
  Mail,
  Building,
  Briefcase,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  IndianRupee,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/module3/components/AuthContext';
import { getAuthToken } from '@/lib/auth-helpers';
import { formatCurrency } from '@/lib/utils';

export default function AdminManageMentorsPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState<'mentors' | 'invitations'>('mentors');

  // Add Mentor Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    title: '',
    company: '',
    hourlyRate: 1500,
    experienceYears: 8,
    skills: 'System Design, Cloud Architecture, Distributed Systems',
    bio: '',
    isPremiumOnly: false,
    avatarUrl: '',
  });

  // Edit Mentor Modal State
  const [editingMentor, setEditingMentor] = useState<any | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Invite Link Display Modal (on successful creation)
  const [createdInvite, setCreatedInvite] = useState<{
    mentorName: string;
    email: string;
    link: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchMentors = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch('/api/v1/admin/mentors', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setMentors(data.mentors || []);
      } else {
        toast.error('Failed to load mentors');
      }

      // Also fetch invitations list
      const invRes = await fetch('/api/v1/admin/mentors/invitations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvitations(invData.invitations || []);
      }
    } catch (err) {
      console.error('[AdminManageMentors] Error loading data:', err);
      toast.error('Network error loading mentors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, [user]);

  // Filtered mentors list
  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      const matchesSearch =
        (m.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.skills || []).some((s: string) => s.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && m.isAvailable) ||
        (statusFilter === 'inactive' && !m.isAvailable);

      return matchesSearch && matchesStatus;
    });
  }, [mentors, search, statusFilter]);

  // KPIs
  const totalMentors = mentors.length;
  const activeMentors = mentors.filter((m) => m.isAvailable).length;
  const pendingInvites = invitations.filter((i) => i.status === 'pending').length;
  const avgHourlyRate =
    mentors.length > 0
      ? Math.round(mentors.reduce((acc, m) => acc + (m.hourlyRate || 0), 0) / mentors.length)
      : 0;

  // Toggle Mentor Availability
  const handleToggleAvailability = async (mentor: any) => {
    const nextStatus = !mentor.isAvailable;
    // Optimistic UI update
    setMentors((prev) =>
      prev.map((m) => (m.id === mentor.id ? { ...m, isAvailable: nextStatus } : m))
    );

    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/admin/mentors/${mentor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isAvailable: nextStatus }),
      });

      if (!res.ok) {
        throw new Error('Update failed');
      }

      toast.success(
        nextStatus
          ? `${mentor.fullName} is now Active and available for bookings!`
          : `${mentor.fullName} is now Inactive.`
      );
    } catch {
      // Revert on error
      setMentors((prev) =>
        prev.map((m) => (m.id === mentor.id ? { ...m, isAvailable: mentor.isAvailable } : m))
      );
      toast.error('Failed to update mentor status in database');
    }
  };

  // Resend Invite
  const handleResendInvite = async (mentorId: string, email: string) => {
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/admin/mentors/${mentorId}/resend-invite`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Invitation resent to ${email}!`);
        fetchMentors();
      } else {
        toast.error(data.error || 'Failed to resend invitation');
      }
    } catch (err) {
      toast.error('Network error resending invitation');
    }
  };

  // Create Mentor
  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.title.trim() || !formData.company.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmittingAdd(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch('/api/v1/admin/mentors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Mentor ${formData.fullName} created successfully! ✨`);
        setIsAddModalOpen(false);
        setCreatedInvite({
          mentorName: formData.fullName,
          email: formData.email,
          link: data.invitationLink,
        });
        setFormData({
          fullName: '',
          email: '',
          title: '',
          company: '',
          hourlyRate: 1500,
          experienceYears: 8,
          skills: 'System Design, Cloud Architecture, Distributed Systems',
          bio: '',
          isPremiumOnly: false,
          avatarUrl: '',
        });
        fetchMentors();
      } else {
        toast.error(data.error || 'Failed to create mentor account');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Network error creating mentor account');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Update Mentor Details
  const handleUpdateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMentor) return;

    setSubmittingEdit(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/admin/mentors/${editingMentor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: editingMentor.fullName,
          title: editingMentor.title,
          company: editingMentor.company,
          hourlyRate: Number(editingMentor.hourlyRate || 0),
          bio: editingMentor.bio,
          skills: Array.isArray(editingMentor.skills) ? editingMentor.skills : String(editingMentor.skills).split(','),
          isPremiumOnly: editingMentor.isPremiumOnly,
          experienceYears: Number(editingMentor.experienceYears || 0),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Mentor profile updated successfully!');
        setEditingMentor(null);
        fetchMentors();
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (err) {
      toast.error('Network error updating mentor');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    toast.success('Invitation link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 select-none">
      {/* Top Banner & Header */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-8 text-white shadow-xl shadow-amber-500/5">
        <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:30px_30px]" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold tracking-wide">
              <Award className="w-3.5 h-3.5" />
              Mentor Command Center
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              Manage Platform Mentors
            </h1>
            <p className="text-zinc-400 max-w-xl text-xs md:text-sm leading-relaxed font-medium">
              Provision certified engineering mentors, issue expiring password setup invitations, audit calendar synchronization, and configure consultation availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow shadow-amber-500/15"
            >
              <Plus className="w-4 h-4" /> Add New Mentor
            </button>
            <button
              onClick={fetchMentors}
              disabled={loading}
              className="p-2.5 bg-muted/80 hover:bg-muted text-foreground rounded-xl border border-border transition-colors text-xs flex items-center gap-1.5"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Mentors</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Award className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold text-foreground">{totalMentors}</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Appointed faculty</p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active & Available</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold text-emerald-500">{activeMentors}</h3>
            <p className="text-[10px] text-emerald-500/90 font-semibold">Open for 1-on-1 bookings</p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg. Hourly Rate</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold text-foreground">{formatCurrency(avgHourlyRate)}</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Per 60m session</p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending Invites</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold text-amber-500">{pendingInvites}</h3>
            <p className="text-[10px] text-amber-500/90 font-semibold">Awaiting password activation</p>
          </div>
        </div>
      </section>

      {/* Tabs & Search Controls */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-muted/30 border border-border/60 rounded-xl">
            <button
              onClick={() => setActiveTab('mentors')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'mentors'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Mentors ({totalMentors})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'invitations'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Invitations & Account Setup ({invitations.length})
            </button>
          </div>

          {activeTab === 'mentors' && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search mentors, skills, company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 text-[11px] font-semibold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg ${statusFilter === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-lg ${statusFilter === 'active' ? 'bg-card text-emerald-500 shadow-xs' : 'text-muted-foreground'}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-2.5 py-1 rounded-lg ${statusFilter === 'inactive' ? 'bg-card text-rose-500 shadow-xs' : 'text-muted-foreground'}`}
                >
                  Inactive
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: All Mentors Table */}
        {activeTab === 'mentors' && (
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-[10px] uppercase text-muted-foreground tracking-wider font-bold bg-muted/20">
                    <th className="py-4.5 px-6">Mentor details</th>
                    <th className="py-4.5 px-4">Designation & Company</th>
                    <th className="py-4.5 px-4">Rate & Experience</th>
                    <th className="py-4.5 px-4">Skills & Focus</th>
                    <th className="py-4.5 px-4">Calendar & Auth</th>
                    <th className="py-4.5 px-4">Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-medium">
                  <AnimatePresence>
                    {filteredMentors.map((m) => {
                      const isActive = Boolean(m.isAvailable);

                      return (
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-muted/10 transition-colors"
                        >
                          {/* Mentor Details */}
                          <td className="py-4 px-6 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center shrink-0 border border-amber-500/20">
                              {m.fullName?.charAt(0) || 'M'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-foreground truncate flex items-center gap-1.5">
                                {m.fullName}
                                {m.isPremiumOnly && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    ELITE
                                  </span>
                                )}
                              </h4>
                              <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                <Mail className="w-3.5 h-3.5" /> {m.email}
                              </p>
                            </div>
                          </td>

                          {/* Designation & Company */}
                          <td className="py-4 px-4 text-foreground max-w-[160px]">
                            <div className="font-semibold truncate">{m.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <Building className="w-3.5 h-3.5 text-zinc-400" /> {m.company}
                            </div>
                          </td>

                          {/* Rate & Experience */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-foreground">
                              {m.hourlyRate > 0 ? `${formatCurrency(m.hourlyRate)}/hr` : 'Free Tier'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {m.experienceYears ? `${m.experienceYears} yrs exp.` : 'Senior'}
                            </div>
                          </td>

                          {/* Skills */}
                          <td className="py-4 px-4 max-w-[180px]">
                            <div className="flex flex-wrap gap-1">
                              {(m.skills || []).slice(0, 3).map((s: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-muted text-muted-foreground"
                                >
                                  {s}
                                </span>
                              ))}
                              {(m.skills || []).length > 3 && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] text-muted-foreground">
                                  +{m.skills.length - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Calendar & Auth */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 text-[10px]">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  m.calendarConnected ? 'text-emerald-500' : 'text-zinc-500'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    m.calendarConnected ? 'bg-emerald-500' : 'bg-zinc-500'
                                  }`}
                                />
                                {m.calendarConnected ? 'Google Meet Active' : 'Calendar Unlinked'}
                              </span>
                              <span className="text-muted-foreground/80 text-[9px]">
                                UID: {m.userId ? `${m.userId.substring(0, 8)}...` : 'Orphan'}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleAvailability(m)}
                                className="p-1.5 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                                title={isActive ? 'Deactivate Mentor' : 'Activate Mentor'}
                              >
                                {isActive ? (
                                  <ToggleRight className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-rose-500" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  setEditingMentor({
                                    ...m,
                                    skills: Array.isArray(m.skills) ? m.skills.join(', ') : m.skills,
                                  })
                                }
                                className="p-1.5 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                                title="Edit Profile Details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleResendInvite(m.id, m.email)}
                                className="p-1.5 rounded-lg border border-border/40 hover:bg-amber-500/10 text-amber-500 transition-all shrink-0"
                                title="Resend Setup Invitation"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {filteredMentors.length === 0 && !loading && (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No mentors found matching your filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Invitations Table */}
        {activeTab === 'invitations' && (
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-[10px] uppercase text-muted-foreground tracking-wider font-bold bg-muted/20">
                    <th className="py-4.5 px-6">Invited Email</th>
                    <th className="py-4.5 px-4">Mentor ID</th>
                    <th className="py-4.5 px-4">Link Expiry</th>
                    <th className="py-4.5 px-4">Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-medium">
                  {invitations.map((inv) => {
                    const isExpired = Date.now() > inv.expires_at;

                    return (
                      <tr key={inv.id} className="hover:bg-muted/10">
                        <td className="py-4 px-6 font-bold text-foreground">{inv.email}</td>
                        <td className="py-4 px-4 text-muted-foreground">{inv.mentor_id}</td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {new Date(inv.expires_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              isExpired
                                ? 'bg-rose-500/10 text-rose-500'
                                : inv.status === 'accepted'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {isExpired ? 'Expired' : inv.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleResendInvite(inv.mentor_id, inv.email)}
                            className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-semibold rounded-lg text-[10px] transition-colors inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Reissue Link
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {invitations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">
                        No invitations recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Modal: Add New Mentor */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground text-base">Provision New Mentor</h3>
                    <p className="text-[11px] text-muted-foreground">Creates Firebase Auth identity + Turso Mentor role atomically.</p>
                  </div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMentor} className="p-6 overflow-y-auto space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Sarah Jenkins"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="sarah.jenkins@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Title / Role *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Principal Systems Architect"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Company / Organization *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google / Stripe"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Hourly Rate (₹ INR)</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Core Competencies / Skills (Comma separated)</label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Professional Bio / Overview</label>
                  <textarea
                    rows={3}
                    placeholder="Brief background, mentorship focus, interview prep specialties..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] text-amber-500/90 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    The mentor will be created with <strong>role = &apos;Mentor&apos;</strong> in Turso and an expiring password-setup link (valid for 24h) will be emailed to allow them to activate their own account.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow"
                  >
                    {submittingAdd ? 'Provisioning...' : 'Confirm & Send Invitation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Edit Mentor */}
      <AnimatePresence>
        {editingMentor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground text-base">Edit Mentor Profile</h3>
                    <p className="text-[11px] text-muted-foreground">{editingMentor.email}</p>
                  </div>
                </div>
                <button onClick={() => setEditingMentor(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateMentor} className="p-6 overflow-y-auto space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingMentor.fullName}
                    onChange={(e) => setEditingMentor({ ...editingMentor, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Title / Role</label>
                    <input
                      type="text"
                      required
                      value={editingMentor.title}
                      onChange={(e) => setEditingMentor({ ...editingMentor, title: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Company</label>
                    <input
                      type="text"
                      required
                      value={editingMentor.company}
                      onChange={(e) => setEditingMentor({ ...editingMentor, company: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Hourly Rate (₹ INR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingMentor.hourlyRate}
                      onChange={(e) => setEditingMentor({ ...editingMentor, hourlyRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Experience (Years)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingMentor.experienceYears}
                      onChange={(e) => setEditingMentor({ ...editingMentor, experienceYears: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Skills (Comma separated)</label>
                  <input
                    type="text"
                    value={editingMentor.skills}
                    onChange={(e) => setEditingMentor({ ...editingMentor, skills: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Bio</label>
                  <textarea
                    rows={3}
                    value={editingMentor.bio || ''}
                    onChange={(e) => setEditingMentor({ ...editingMentor, bio: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setEditingMentor(null)}
                    className="px-4 py-2 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl font-bold transition-colors"
                  >
                    {submittingEdit ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Display Created Invite Link */}
      <AnimatePresence>
        {createdInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-base">Mentor Account Activated!</h3>
                  <p className="text-xs text-muted-foreground">{createdInvite.mentorName} ({createdInvite.email})</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-muted-foreground">
                  An activation email has been dispatched. You can also share the direct password setup link below:
                </p>
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 border border-border/60 rounded-xl font-mono text-[11px] select-all break-all text-amber-500">
                  <span className="truncate">{createdInvite.link}</span>
                  <button
                    onClick={() => copyToClipboard(createdInvite.link)}
                    className="p-1.5 hover:bg-card rounded-lg text-foreground shrink-0 border border-border/40"
                    title="Copy Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">Link is valid for 24 hours.</p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setCreatedInvite(null)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
