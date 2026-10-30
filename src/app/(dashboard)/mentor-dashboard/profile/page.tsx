'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  User, Briefcase, Building, DollarSign, Globe, Award,
  ArrowLeft, Check, AlertCircle, Loader2, Plus, X, Sparkles,
  Calendar, Clock, Video, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/modules/module3/components/AuthContext';
import { getAuthToken } from '@/lib/auth-helpers';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface MentorProfileData {
  id: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  skills: string[];
  topics: string[];
  hourlyRate: number;
  linkedin: string;
  timezone: string;
  availableDays: string[];
  availableHours: { start: string; end: string };
  googleCalendarConnected?: boolean;
  googleCalendarNeedsReconnect?: boolean;
  googleCalendarEmail?: string;
  rating?: number;
  totalReviews?: number;
}

const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Asia/Tokyo',
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MentorProfilePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<MentorProfileData>({
    id: '',
    name: '',
    role: '',
    company: '',
    bio: '',
    skills: [],
    topics: [],
    hourlyRate: 0,
    linkedin: '',
    timezone: 'Asia/Kolkata',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    availableHours: { start: '09:00', end: '18:00' },
  });

  const [newSkill, setNewSkill] = useState('');
  const [newTopic, setNewTopic] = useState('');

  const isMentor = profile?.role === 'Mentor' || profile?.role === 'Admin';

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);
        const token = await getAuthToken(user);
        const res = await fetch('/api/v1/mentor/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error('Failed to load mentor profile');
        }

        const data = await res.json();
        if (data.data) {
          setFormData({
            id: data.data.id || '',
            name: data.data.name || '',
            role: data.data.role || '',
            company: data.data.company || '',
            bio: data.data.bio || '',
            skills: Array.isArray(data.data.skills) ? data.data.skills : [],
            topics: Array.isArray(data.data.topics) ? data.data.topics : [],
            hourlyRate: typeof data.data.hourlyRate === 'number' ? data.data.hourlyRate : 0,
            linkedin: data.data.linkedin || '',
            timezone: data.data.timezone || 'Asia/Kolkata',
            availableDays: Array.isArray(data.data.availableDays) ? data.data.availableDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            availableHours: data.data.availableHours || { start: '09:00', end: '18:00' },
            googleCalendarConnected: data.data.googleCalendarConnected,
            googleCalendarNeedsReconnect: data.data.googleCalendarNeedsReconnect,
            googleCalendarEmail: data.data.googleCalendarEmail,
            rating: data.data.rating,
            totalReviews: data.data.totalReviews,
          });
        }
      } catch (err: any) {
        console.error('Error fetching mentor profile:', err);
        setError(err.message || 'Error fetching mentor profile');
      } finally {
        setLoading(false);
      }
    }

    if (user && !authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const val = newSkill.trim();
    if (val && !formData.skills.includes(val)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, val] }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove),
    }));
  };

  const handleAddTopic = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const val = newTopic.trim();
    if (val && !formData.topics.includes(val)) {
      setFormData(prev => ({ ...prev, topics: [...prev.topics, val] }));
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.filter(t => t !== topicToRemove),
    }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await getAuthToken(user);
      const res = await fetch('/api/v1/mentor/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          company: formData.company,
          bio: formData.bio,
          skills: formData.skills,
          topics: formData.topics,
          hourlyRate: formData.hourlyRate,
          linkedin: formData.linkedin,
          timezone: formData.timezone,
          availableDays: formData.availableDays,
          availableHours: formData.availableHours,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update mentor profile');
      }

      setSuccess('Profile and availability settings updated successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error updating mentor profile:', err);
      setError(err.message || 'Error updating mentor profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400 text-xs gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span>Loading profile settings...</span>
      </div>
    );
  }

  if (!isMentor) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Mentor Access Required</h1>
        <p className="text-xs text-gray-400">
          This settings page is reserved for verified mentors.
        </p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto w-full pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/mentor-dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Mentor Workspace
          </Link>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Mentor Profile & Availability
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage your public bio, expertise tags, hourly rate, working hours, and calendar integrations.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold self-start sm:self-center">
          <Sparkles className="w-4 h-4 text-purple-400" /> Verified Mentor
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Google Calendar Integration Card */}
      <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Google Calendar & Google Meet</h3>
                {formData.googleCalendarConnected ? (
                  <Badge variant="success" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Connected
                  </Badge>
                ) : formData.googleCalendarNeedsReconnect ? (
                  <Badge variant="warning" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                    Reconnect Needed
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[10px] bg-white/10 text-gray-400 border-white/10">
                    Not Connected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {formData.googleCalendarConnected
                  ? `Connected to ${formData.googleCalendarEmail || user?.email}. Confirmed sessions will generate authentic Google Meet conference links.`
                  : 'Connect your Google account to automatically schedule calendar invites with verified Google Meet links.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {formData.googleCalendarConnected ? (
              <a href="/api/v1/google/disconnect">
                <Button variant="ghost" size="sm" className="text-xs text-rose-400 hover:text-rose-300">
                  Disconnect Google
                </Button>
              </a>
            ) : (
              <a href="/api/v1/google/connect">
                <Button variant="primary" size="sm" className="text-xs bg-blue-600 hover:bg-blue-500">
                  Connect with Google
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-black/40 border border-white/10 space-y-6">
          {/* Section: Public Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-white/10">
              <User className="w-4 h-4 text-purple-400" /> Public Profile Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Job Title / Role *</label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Google, Stripe"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Bio & Mentorship Philosophy</label>
              <textarea
                rows={4}
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Share your engineering background, specializations, and what students can expect in a 1-on-1 session..."
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Section: Timezone & Working Availability */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-white/10">
              <Clock className="w-4 h-4 text-cyan-400" /> Timezone & Availability Windows
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Operating Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {COMMON_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Hourly Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.hourlyRate}
                  onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">Set 0 for pro-bono community sessions.</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Available Days</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map(day => {
                  const isSelected = formData.availableDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Technical Skills */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" /> Technical Skills
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. System Design, Kubernetes, TypeScript"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={handleAddSkill}
                className="flex-1 px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddSkill} className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {formData.skills.map(s => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-1.5">
                  {s}
                  <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Section: Mentorship Topics */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-fuchsia-400" /> Mentorship Topics Offered
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Architecture Critique, Resume Breakdown"
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={handleAddTopic}
                className="flex-1 px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTopic} className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {formData.topics.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs flex items-center gap-1.5">
                  {t}
                  <button type="button" onClick={() => handleRemoveTopic(t)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/mentor-dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-white">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
            className="text-xs"
          >
            {saving ? 'Saving Changes...' : 'Save Profile Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
