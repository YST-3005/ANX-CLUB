'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, Clock, Star, ShieldCheck,
  ArrowRight, AlertCircle, ExternalLink, UserCheck,
  Sparkles, CheckCircle2, Video, DollarSign, RefreshCw,
  X, Check, CalendarCheck, Ban, Edit3, Settings,
  CalendarDays, ChevronRight, AlertTriangle, Layers,
} from 'lucide-react';
import { useAuth } from '@/modules/module3/components/AuthContext';
import { getAuthToken } from '@/lib/auth-helpers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function MentorDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'upcoming' | 'history' | 'agenda'>('requests');

  // Interactive Modal States
  const [schedulingRequest, setSchedulingRequest] = useState<any | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('14:00');
  const [scheduleDuration, setScheduleDuration] = useState(45);

  const [reschedulingSession, setReschedulingSession] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('14:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [durationSession, setDurationSession] = useState<any | null>(null);
  const [newDuration, setNewDuration] = useState(45);

  const [decliningRequest, setDecliningRequest] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const [cancellingSession, setCancellingSession] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [completingSession, setCompletingSession] = useState<any | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchMentorDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch('/api/v1/mentor/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setDashboardData(json.data);
      } else {
        const err = await res.json();
        console.warn('Mentor dashboard fetch response:', err);
      }
    } catch (e) {
      console.error('Error fetching mentor dashboard:', e);
      toast.error('Failed to load mentor dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchMentorDashboard();
    }
  }, [user, authLoading]);

  // Role Gate: Must be Mentor or Admin
  const isMentor = profile?.role === 'Mentor' || profile?.role === 'Admin' || (user?.email && user.email.startsWith('admin@'));

  // Format UTC string into local date/time
  const formatLocalDateTime = (utcString: string) => {
    try {
      const date = new Date(utcString);
      if (isNaN(date.getTime())) return utcString;
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(date);
    } catch (e) {
      return utcString;
    }
  };

  // Actions
  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentor/requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to accept');

      toast.success(data.message || 'Request accepted! You can now schedule the session.');
      await fetchMentorDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!decliningRequest) return;
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentor/requests/${decliningRequest.id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to decline');

      toast.success('Request declined.');
      setDecliningRequest(null);
      setDeclineReason('');
      await fetchMentorDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingRequest || !scheduleDate || !scheduleTime) {
      toast.error('Date and time are required.');
      return;
    }
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentor/requests/${schedulingRequest.id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          date: scheduleDate,
          time: scheduleTime,
          durationMin: scheduleDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to schedule');

      toast.success('Session scheduled successfully!');
      setSchedulingRequest(null);
      setScheduleDate('');
      setScheduleTime('14:00');
      await fetchMentorDashboard();
      setActiveTab('upcoming');
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingSession || !rescheduleDate || !rescheduleTime) {
      toast.error('Date and time are required.');
      return;
    }
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentor/sessions/${reschedulingSession.id}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          date: rescheduleDate,
          time: rescheduleTime,
          reason: rescheduleReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reschedule');

      toast.success('Session rescheduled successfully!');
      setReschedulingSession(null);
      setRescheduleDate('');
      setRescheduleTime('14:00');
      setRescheduleReason('');
      await fetchMentorDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reschedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDurationSubmit = async () => {
    if (!durationSession) return;
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentor/sessions/${durationSession.id}/duration`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ durationMin: newDuration }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update duration');

      toast.success(`Duration updated to ${newDuration} min.`);
      setDurationSession(null);
      await fetchMentorDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update duration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSessionSubmit = async () => {
    if (!cancellingSession) return;
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentor/sessions/${cancellingSession.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by mentor' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to cancel session');

      toast.success('Session cancelled.');
      setCancellingSession(null);
      setCancelReason('');
      await fetchMentorDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!completingSession) return;
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentor/sessions/${completingSession.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to complete session');

      toast.success('Session marked completed! +75 XP awarded to student.');
      setCompletingSession(null);
      await fetchMentorDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark complete');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryGoogle = async (sessionId: string) => {
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentor/sessions/${sessionId}/retry-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Retry failed');
      }
      toast.success(data.message || 'Google Meet synced successfully!');
      await fetchMentorDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to retry Google sync');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400 text-xs gap-3">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <span>Loading Mentor Portal...</span>
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
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          This portal is reserved for verified industry mentors and administrators. Contact the A.N.X leadership team if you would like to become a mentor.
        </p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">Return to Student Dashboard</Button>
        </Link>
      </div>
    );
  }

  const mentorProfile = dashboardData?.mentorProfile || {};
  const stats = dashboardData?.stats || {};
  const todayNextSession = dashboardData?.todayNextSession || null;
  const requests = dashboardData?.requests || [];
  const upcomingSessions = dashboardData?.upcomingSessions || [];
  const historySessions = dashboardData?.historySessions || [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full pb-16">
      {/* Top Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <Avatar name={mentorProfile.name || user?.displayName || 'Mentor'} size="xl" className="ring-2 ring-purple-500/40 shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                {mentorProfile.name || 'Mentor Workspace'}
              </h1>
              <Badge variant="purple" className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                Official Mentor
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              {mentorProfile.role || 'Engineering Lead'} • {mentorProfile.company || 'Tech Partner'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {stats.rating || 5.0}
              </span>
              <span>•</span>
              <span>{stats.completedSessionsCount || 0} sessions completed</span>
              <span>•</span>
              <span>{stats.totalStudentsCount || 0} students mentored</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMentorDashboard}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Link href="/mentor-dashboard/profile">
            <Button variant="outline" size="sm" className="gap-2 text-xs border-purple-500/30 text-purple-200 hover:bg-purple-500/10">
              <Settings className="w-3.5 h-3.5" /> Edit Profile & Availability
            </Button>
          </Link>
        </div>
      </div>

      {/* Google Calendar Integration Status Card */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white">Google Calendar & Meet Integration</h4>
              {mentorProfile.googleCalendarConnected ? (
                <Badge variant="success" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Connected
                </Badge>
              ) : mentorProfile.googleCalendarNeedsReconnect ? (
                <Badge variant="warning" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                  Reconnect Needed
                </Badge>
              ) : (
                <Badge variant="default" className="text-[10px] bg-white/10 text-gray-400 border-white/10">
                  Not Connected
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {mentorProfile.googleCalendarConnected
                ? `Syncing events with ${mentorProfile.googleCalendarEmail || 'Google account'}. Google Meet links are generated automatically upon scheduling.`
                : 'Connect your Google account to automatically create Google Calendar events with verified Google Meet links.'}
            </p>
          </div>
        </div>

        <Link href="/mentor-dashboard/profile">
          <Button variant="outline" size="sm" className="text-xs shrink-0 border-white/10">
            {mentorProfile.googleCalendarConnected ? 'Manage Integration' : 'Connect Google Calendar'}
          </Button>
        </Link>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Requests in Inbox',
            value: (stats.pendingRequestsCount || 0).toString(),
            sub: 'Awaiting your review or slot scheduling',
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
          },
          {
            label: 'Upcoming Sessions',
            value: (stats.upcomingSessionsCount || 0).toString(),
            sub: 'Confirmed scheduled 1-on-1s',
            icon: CalendarCheck,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
          {
            label: 'Sessions Completed',
            value: (stats.completedSessionsCount || 0).toString(),
            sub: 'Student earns +75 XP per session',
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Students Mentored',
            value: (stats.totalStudentsCount || 0).toString(),
            sub: 'Distinct campus engineers guided',
            icon: Users,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
        ].map((card, i) => (
          <div key={i} className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{card.label}</span>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Today's / Next Session Spotlight Card */}
      {todayNextSession && (
        <Card className="p-6 bg-gradient-to-r from-purple-950/30 to-indigo-950/20 border-purple-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Next Upcoming Session Spotlight
              </h3>
            </div>
            <span className="text-xs text-purple-300 font-mono">
              {formatLocalDateTime(todayNextSession.startAtUTC)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <Avatar name={todayNextSession.studentName || 'Student'} size="lg" className="ring-2 ring-purple-500/40" />
              <div>
                <h4 className="text-base font-bold text-white">{todayNextSession.studentName}</h4>
                <p className="text-xs text-gray-300">{todayNextSession.topic}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Duration: {todayNextSession.durationMin || 45} mins</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {todayNextSession.conferenceStatus === 'confirmed' && todayNextSession.meetLink ? (
                <a href={todayNextSession.meetLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" size="sm" className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-500">
                    <Video className="w-3.5 h-3.5" /> Join Google Meet <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRetryGoogle(todayNextSession.id)}
                  disabled={actionLoading}
                  className="gap-1.5 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Google Meet
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReschedulingSession(todayNextSession);
                  const dt = new Date(todayNextSession.startAtUTC);
                  setRescheduleDate(dt.toISOString().split('T')[0]);
                  setRescheduleTime(dt.toTimeString().slice(0, 5));
                }}
                className="text-xs"
              >
                Reschedule
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompletingSession(todayNextSession)}
                className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
              >
                Mark Complete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'requests'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Requests Inbox</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-purple-400" />
          <span>Upcoming Sessions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono">
            {upcomingSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Session History</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-300 font-mono">
            {historySessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'agenda'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-cyan-400" />
          <span>Agenda Schedule</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="space-y-4 py-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {/* TAB 1: REQUESTS INBOX */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <Card className="p-12 text-center bg-black/40 border-white/10">
                  <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-white">Your Request Inbox is Empty</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                    When students request 1-on-1 mentorship sessions with you, they will appear here for your review and scheduling.
                  </p>
                </Card>
              ) : (
                requests.map((req: any) => {
                  const isAwaitingScheduling = req.status === 'accepted_awaiting_scheduling';
                  return (
                    <Card key={req.id} className="p-5 bg-black/40 border-white/10 hover:border-purple-500/30 transition-all space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={req.studentName || 'Student'} size="md" className="ring-2 ring-purple-500/30" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{req.studentName}</h3>
                              {isAwaitingScheduling ? (
                                <Badge variant="success" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                  Accepted — Ready to Schedule
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                  Pending Review
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-300 font-medium mt-0.5">{req.topic}</p>
                          </div>
                        </div>

                        <span className="text-[11px] text-gray-500">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>

                      {req.message && (
                        <p className="text-xs text-gray-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed">
                          "{req.message}"
                        </p>
                      )}

                      {(req.preferredDate || req.preferredTime) && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Student preferred slot: {req.preferredDate} {req.preferredTime && `(${req.preferredTime})`}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDecliningRequest(req)}
                            disabled={actionLoading}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            Decline
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isAwaitingScheduling && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcceptRequest(req.id)}
                              disabled={actionLoading}
                              className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                            >
                              Accept Request
                            </Button>
                          )}

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSchedulingRequest(req);
                              setScheduleDate(req.preferredDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                              setScheduleTime(req.preferredTime?.slice(0, 5) || '14:00');
                            }}
                            className="text-xs gap-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Schedule Time & Meeting</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: UPCOMING SESSIONS */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <Card className="p-12 text-center bg-black/40 border-white/10">
                  <CalendarCheck className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-white">No Upcoming Sessions Scheduled</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                    Accept and schedule requests from your inbox to populate your upcoming session agenda.
                  </p>
                </Card>
              ) : (
                upcomingSessions.map((session: any) => {
                  const hasConfirmedMeet = session.conferenceStatus === 'confirmed' && Boolean(session.meetLink);
                  return (
                    <Card key={session.id} className="p-5 bg-black/40 border-white/10 hover:border-purple-500/30 transition-all space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={session.studentName || 'Student'} size="md" className="ring-2 ring-purple-500/30" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{session.studentName}</h3>
                              <Badge variant="blue" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                                {session.status === 'rescheduled' ? 'Rescheduled' : 'Scheduled'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-300 font-medium mt-0.5">{session.topic}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {hasConfirmedMeet ? (
                            <Badge variant="success" className="text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Google Meet Confirmed
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[11px] bg-amber-500/10 text-amber-300 border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Meet Link Pending
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Time and Duration Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>{formatLocalDateTime(session.startAtUTC)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>Duration: {session.durationMin || 45} minutes</span>
                        </div>
                      </div>

                      {/* Action Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReschedulingSession(session);
                              const dt = new Date(session.startAtUTC);
                              setRescheduleDate(dt.toISOString().split('T')[0]);
                              setRescheduleTime(dt.toTimeString().slice(0, 5));
                            }}
                            className="text-xs text-gray-300 hover:text-white"
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDurationSession(session);
                              setNewDuration(session.durationMin || 45);
                            }}
                            className="text-xs text-gray-300 hover:text-white"
                          >
                            Duration ({session.durationMin}m)
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancellingSession(session)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            Cancel
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          {!hasConfirmedMeet && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRetryGoogle(session.id)}
                              disabled={actionLoading}
                              className="gap-1.5 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Retry Google Meet
                            </Button>
                          )}
                          {hasConfirmedMeet && (
                            <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
                              <Button variant="primary" size="sm" className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-500">
                                <Video className="w-3.5 h-3.5" /> Join Meet
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setCompletingSession(session)}
                            className="text-xs bg-purple-600 hover:bg-purple-500"
                          >
                            Mark Complete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: SESSION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {historySessions.length === 0 ? (
                <Card className="p-12 text-center bg-black/40 border-white/10">
                  <CheckCircle2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-white">No Completed or Cancelled Sessions</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                    Archived completed sessions and past cancellations will appear here.
                  </p>
                </Card>
              ) : (
                historySessions.map((session: any) => {
                  const isCompleted = session.status === 'completed';
                  return (
                    <Card key={session.id} className="p-4 bg-black/40 border-white/5 space-y-2 opacity-90 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={session.studentName || 'Student'} size="sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white">{session.studentName}</h4>
                              <Badge
                                variant="default"
                                className={`text-[10px] ${
                                  isCompleted
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {isCompleted ? 'Completed (Student +75 XP)' : 'Cancelled'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-gray-400">{session.topic}</p>
                          </div>
                        </div>

                        <span className="text-[11px] text-gray-500">
                          {session.startAtUTC ? new Date(session.startAtUTC).toLocaleDateString() : ''}
                        </span>
                      </div>

                      {session.cancelReason && (
                        <p className="text-xs text-rose-300/80 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                          Cancellation reason: {session.cancelReason}
                        </p>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: AGENDA SCHEDULE VIEW */}
          {activeTab === 'agenda' && (
            <Card className="p-6 bg-black/40 border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-cyan-400" /> Upcoming Agenda
                </h3>
                <span className="text-xs text-gray-400">
                  Timezone: {mentorProfile.timezone || 'UTC'}
                </span>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No confirmed meetings in your upcoming agenda.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {upcomingSessions.map((s: any) => (
                    <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-purple-300 uppercase">
                            {new Date(s.startAtUTC).toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                          <span className="text-sm font-bold text-white leading-none">
                            {new Date(s.startAtUTC).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{s.studentName} — {s.topic}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {formatLocalDateTime(s.startAtUTC)} ({s.durationMin} mins)
                          </p>
                        </div>
                      </div>

                      {s.conferenceStatus === 'confirmed' && s.meetLink ? (
                        <a href={s.meetLink} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-500/30 text-emerald-300">
                            <Video className="w-3 h-3" /> Join
                          </Button>
                        </a>
                      ) : (
                        <span className="text-[10px] text-amber-400">Link Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* MODAL: SCHEDULE SESSION */}
      <AnimatePresence>
        {schedulingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1123] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Schedule Mentoring Session</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    For {schedulingRequest.studentName}: "{schedulingRequest.topic}"
                  </p>
                </div>
                <button onClick={() => setSchedulingRequest(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Session Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Start Time (24h)</label>
                    <input
                      type="time"
                      required
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Duration</label>
                    <select
                      value={scheduleDuration}
                      onChange={e => setScheduleDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200">
                  <span>
                    Stored in UTC. Converted automatically to the student's local timezone. Google Meet link will be generated automatically.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSchedulingRequest(null)}
                    disabled={actionLoading}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={actionLoading}
                    className="text-xs"
                  >
                    {actionLoading ? 'Scheduling...' : 'Confirm & Schedule'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RESCHEDULE */}
      <AnimatePresence>
        {reschedulingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1123] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Reschedule Session</h3>
                  <p className="text-xs text-gray-400 mt-0.5">With {reschedulingSession.studentName}</p>
                </div>
                <button onClick={() => setReschedulingSession(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">New Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">New Start Time</label>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Reason for reschedule (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Urgent production deployment..."
                    value={rescheduleReason}
                    onChange={e => setRescheduleReason(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReschedulingSession(null)}
                    disabled={actionLoading}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={actionLoading}
                    className="text-xs"
                  >
                    {actionLoading ? 'Updating...' : 'Update Schedule'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CHANGE DURATION */}
      <AnimatePresence>
        {durationSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f1123] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-bold text-white">Adjust Session Duration</h3>
                <button onClick={() => setDurationSession(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {[30, 45, 60, 90].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setNewDuration(dur)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        newDuration === dur
                          ? 'bg-purple-600/30 border-purple-500 text-white'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {dur} mins
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setDurationSession(null)} className="text-xs text-gray-400">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleDurationSubmit} disabled={actionLoading} className="text-xs">
                  {actionLoading ? 'Saving...' : 'Save Duration'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DECLINE REQUEST */}
      <AnimatePresence>
        {decliningRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1123] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Decline Mentoring Request?</h3>
                  <p className="text-xs text-gray-400">For {decliningRequest.studentName}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Reason for declining (optional):
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  placeholder="e.g., Topic outside current specialization, schedule at capacity..."
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setDecliningRequest(null)} className="text-xs text-gray-400">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeclineRequest}
                  disabled={actionLoading}
                  className="text-xs bg-rose-600 hover:bg-rose-700"
                >
                  {actionLoading ? 'Declining...' : 'Confirm Decline'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CANCEL SESSION */}
      <AnimatePresence>
        {cancellingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1123] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cancel Scheduled Session?</h3>
                  <p className="text-xs text-gray-400">The student will be notified immediately.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Reason for cancellation:</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g., Unforeseen conflict, please reschedule..."
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCancellingSession(null)} className="text-xs text-gray-400">
                  Keep Session
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelSessionSubmit}
                  disabled={actionLoading}
                  className="text-xs bg-rose-600 hover:bg-rose-700"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MARK COMPLETE */}
      <AnimatePresence>
        {completingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1123] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/30">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Mark Session as Completed?</h3>
                <p className="text-xs text-gray-300 mt-1 max-w-sm mx-auto">
                  This will archive the session and award <strong className="text-purple-300">+75 XP</strong> to {completingSession.studentName}.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Student:</span>
                  <span className="font-bold text-white">{completingSession.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Topic:</span>
                  <span className="font-medium text-white">{completingSession.topic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">XP Awarded (Student):</span>
                  <span className="font-bold text-purple-400">+75 XP</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCompletingSession(null)} className="text-xs text-gray-400">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCompleteSession}
                  disabled={actionLoading}
                  className="text-xs bg-purple-600 hover:bg-purple-500"
                >
                  {actionLoading ? 'Completing...' : 'Mark Complete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
