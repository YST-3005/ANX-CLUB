'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Video,
  AlertCircle,
  Clock4,
  RefreshCw,
  Plus,
  Send,
  CalendarDays,
  Check,
  ChevronRight,
  Filter,
  Sparkles,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/module3/components/AuthContext';
import { getAuthToken } from '@/lib/auth-helpers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function MentorDashboardPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'sessions' | 'history'>('requests');

  const [calendarConnected, setCalendarConnected] = useState<boolean>(false);
  const [calendarConnecting, setCalendarConnecting] = useState<boolean>(false);

  // Modal States
  const [schedulingRequest, setSchedulingRequest] = useState<any | null>(null);
  const [scheduleData, setScheduleData] = useState({
    scheduledDate: '',
    startTime: '10:00 AM',
    durationMinutes: 60,
  });
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const [declineRequest, setDeclineRequest] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [submittingDecline, setSubmittingDecline] = useState(false);

  const [reschedulingSession, setReschedulingSession] = useState<any | null>(null);
  const [rescheduleData, setRescheduleData] = useState({
    scheduledDate: '',
    startTime: '10:00 AM',
    durationMinutes: 60,
  });

  const [cancellingSession, setCancellingSession] = useState<any | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const fetchMentorData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getAuthToken(user);
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch incoming requests
      const reqRes = await fetch('/api/v1/mentoring/requests?as=mentor', { headers });
      if (reqRes.ok) {
        const reqJson = await reqRes.json();
        setRequests(reqJson.requests || []);
      }

      // 2. Fetch sessions
      const sesRes = await fetch('/api/v1/mentoring/sessions?as=mentor', { headers });
      if (sesRes.ok) {
        const sesJson = await sesRes.json();
        setSessions(sesJson.sessions || []);
      }

      // 3. Fetch Google Calendar connection status
      const calRes = await fetch('/api/auth/google/status', { headers });
      if (calRes.ok) {
        const calJson = await calRes.json();
        setCalendarConnected(Boolean(calJson.connected));
      }
    } catch (err) {
      console.error('Failed to load mentor dashboard data', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorData();

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const calStatus = searchParams.get('calendar');
      const message = searchParams.get('message');

      if (calStatus === 'connected') {
        toast.success('Google Calendar connected! Automatic Google Meet creation is enabled.');
        window.history.replaceState({}, '', '/mentor/dashboard');
      } else if (calStatus === 'error') {
        toast.error(`Google Calendar connection failed: ${message || 'Unknown error'}`);
        window.history.replaceState({}, '', '/mentor/dashboard');
      }
    }
  }, [user]);

  const handleConnectCalendar = async () => {
    setCalendarConnecting(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch('/api/auth/google', {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to initiate Google Calendar connection.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not connect Google Calendar');
      setCalendarConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Google Meet conferences will not be created automatically.')) {
      return;
    }
    try {
      const token = await getAuthToken(user);
      const res = await fetch('/api/auth/google/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      if (res.ok) {
        setCalendarConnected(false);
        toast.success('Google Calendar disconnected.');
      }
    } catch (err: any) {
      toast.error('Failed to disconnect Google Calendar.');
    }
  };

  // Request actions
  const handleAcceptRequest = async (requestId: string) => {
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentoring/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept request');

      toast.success('Request accepted! You can now propose a meeting schedule.');
      fetchMentorData();
    } catch (err: any) {
      toast.error(err.message || 'Error accepting request');
    }
  };

  const handleDeclineRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineRequest) return;
    setSubmittingDecline(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentoring/requests/${declineRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'decline', declineReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline request');

      toast.success('Request declined.');
      setDeclineRequest(null);
      setDeclineReason('');
      fetchMentorData();
    } catch (err: any) {
      toast.error(err.message || 'Error declining request');
    } finally {
      setSubmittingDecline(false);
    }
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingRequest) return;
    setSubmittingSchedule(true);
    try {
      const token = await getAuthToken(user);
      const res = await fetch('/api/v1/mentoring/sessions/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          requestId: schedulingRequest.id,
          scheduledDate: scheduleData.scheduledDate,
          startTime: scheduleData.startTime,
          durationMinutes: Number(scheduleData.durationMinutes),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule session');

      if (data.session?.meeting_link) {
        toast.success('🎉 Session scheduled and Google Meet confirmed!');
      } else {
        toast.success('Session scheduled. Calendar integration active.');
      }

      setSchedulingRequest(null);
      fetchMentorData();
    } catch (err: any) {
      toast.error(err.message || 'Error scheduling session');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentoring/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete session');

      toast.success(`Session completed! +${data.xpAwarded || 75} XP awarded to student.`);
      fetchMentorData();
    } catch (err: any) {
      toast.error(err.message || 'Error completing session');
    }
  };

  const handleCancelSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSession) return;
    try {
      const token = await getAuthToken(user);
      const res = await fetch(`/api/v1/mentoring/sessions/${cancellingSession.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: cancellationReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel session');

      toast.success('Session cancelled.');
      setCancellingSession(null);
      setCancellationReason('');
      fetchMentorData();
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling session');
    }
  };

  // Metrics
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const acceptedRequests = requests.filter((r) => r.status === 'accepted');
  const upcomingSessions = sessions.filter((s) => s.status === 'confirmed' || s.status === 'pending_conference');
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const cancelledSessions = sessions.filter((s) => s.status === 'cancelled');

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto w-full pb-16 select-none">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 uppercase tracking-wider">
              Mentor Operating Console
            </span>
            <span className="text-xs text-muted-foreground">• Turso Edge SQLite</span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">Mentor Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review student inquiries, accept topics, confirm Google Meet conference schedules, and guide the next generation of engineers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {calendarConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Google Calendar Connected</span>
              <button
                onClick={handleDisconnectCalendar}
                className="ml-1 text-[11px] text-gray-400 hover:text-rose-400 underline transition-colors"
                title="Disconnect Google Calendar"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <Button
              onClick={handleConnectCalendar}
              disabled={calendarConnecting}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              {calendarConnecting ? 'Redirecting to Google...' : 'Connect Google Calendar'}
            </Button>
          )}

          <Button onClick={fetchMentorData} className="bg-white/10 hover:bg-white/15 text-white text-xs border border-white/10">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Link href="/mentors" className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 text-xs font-semibold border border-purple-500/30">
            View Public Profile
          </Link>
        </div>
      </div>

      {/* Alert banner if calendar not connected */}
      {!calendarConnected && (
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Google Calendar is not connected</p>
              <p className="text-[11px] text-blue-200/70 mt-0.5">
                Connect your Google Calendar so genuine Google Meet conference links are generated automatically when you schedule student sessions.
              </p>
            </div>
          </div>
          <Button
            onClick={handleConnectCalendar}
            disabled={calendarConnecting}
            className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs"
          >
            Connect Now
          </Button>
        </div>
      )}

      {/* 2. Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Pending Requests', value: pendingRequests.length, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Awaiting Schedule', value: acceptedRequests.length, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          { label: 'Confirmed Sessions', value: upcomingSessions.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Completed', value: completedSessions.length, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Cancelled', value: cancelledSessions.length, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        ].map((stat, i) => (
          <div key={i} className={`p-4 rounded-2xl border ${stat.border} ${stat.bg} backdrop-blur-xl flex flex-col justify-between`}>
            <span className="text-[11px] font-medium text-slate-400">{stat.label}</span>
            <span className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'requests' ? 'text-white border-b-2 border-fuchsia-500' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Requests Queue ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'sessions' ? 'text-white border-b-2 border-fuchsia-500' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Active Sessions ({upcomingSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'history' ? 'text-white border-b-2 border-fuchsia-500' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Completed History ({completedSessions.length})
        </button>
      </div>

      {/* 4. Tab Contents */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 mt-3">Loading mentor requests and sessions from Turso...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: REQUESTS QUEUE */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-white/10 bg-black/30">
                  <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white mt-3">No Mentoring Requests</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    When students submit requests for 1-on-1 consultations with you, they will appear here for review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-white/20 transition-all"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{req.student_name || 'Student'}</span>
                          <span className="text-xs text-slate-400">({req.student_email})</span>
                          <Badge
                            variant="primary"
                            className={`text-[10px] px-2 py-0 border-none ${
                              req.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300'
                                : req.status === 'accepted'
                                ? 'bg-purple-500/20 text-purple-300'
                                : req.status === 'declined'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-500/20 text-slate-300'
                            }`}
                          >
                            {req.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-slate-200">{req.topic}</p>
                        {req.message && (
                          <p className="text-xs text-slate-400 italic bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                            "{req.message}"
                          </p>
                        )}
                        <div className="text-[11px] text-slate-500">
                          Submitted: {new Date(req.created_at).toLocaleString()}
                        </div>
                      </div>

                      {/* Request Action Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptRequest(req.id)}
                              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept Request
                            </button>
                            <button
                              onClick={() => setDeclineRequest(req)}
                              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {req.status === 'accepted' && (
                          <button
                            onClick={() => {
                              setSchedulingRequest(req);
                              setScheduleData({
                                scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                                startTime: '10:00 AM',
                                durationMinutes: 60,
                              });
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5" /> Propose & Confirm Schedule
                          </button>
                        )}

                        {req.status === 'declined' && (
                          <span className="text-xs text-rose-400 font-medium">Declined: {req.decline_reason}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-white/10 bg-black/30">
                  <CalendarDays className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white mt-3">No Confirmed Upcoming Sessions</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Accept student requests and confirm the meeting schedule to populate your upcoming sessions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingSessions.map((ses) => (
                    <div
                      key={ses.id}
                      className="p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl flex flex-col justify-between gap-4 hover:border-white/20 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            {ses.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-mono text-purple-300">
                            {ses.duration_minutes} mins
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-base">{ses.topic}</h4>
                        <div className="text-xs text-slate-300">
                          Student: <strong className="text-white">{ses.student_name}</strong> ({ses.student_email})
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" /> {ses.scheduled_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-purple-400" /> {ses.start_time} - {ses.end_time}
                          </span>
                        </div>

                        {/* Verified Google Meet link */}
                        {ses.meeting_link ? (
                          <div className="pt-2">
                            <a
                              href={ses.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 text-xs font-mono hover:bg-fuchsia-600/30 transition-all"
                            >
                              <Video className="w-3.5 h-3.5 text-fuchsia-400" /> Join Google Meet Conference
                            </a>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-400/90 flex items-center gap-1 pt-1">
                            <Clock4 className="w-3.5 h-3.5 shrink-0" />
                            Google Meet conference creation pending server credential configuration.
                          </div>
                        )}
                      </div>

                      {/* Session Action Buttons */}
                      <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                        <button
                          onClick={() => handleCompleteSession(ses.id)}
                          className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed (+75 XP)
                        </button>
                        <button
                          onClick={() => setCancellingSession(ses)}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPLETED SESSIONS */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {completedSessions.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-white/10 bg-black/30">
                  <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white mt-3">No Completed Sessions Yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Completed mentoring sessions will be archived here along with student XP grants.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {completedSessions.map((ses) => (
                    <div
                      key={ses.id}
                      className="p-4 rounded-xl border border-white/10 bg-black/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white text-sm">{ses.topic}</span>
                        <div className="text-slate-400 mt-0.5">
                          Student: {ses.student_name} • Date: {ses.scheduled_date} ({ses.start_time})
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-purple-400">+75 XP Granted</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                          COMPLETED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: SCHEDULE SESSION */}
      {schedulingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-purple-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Propose & Confirm Mentoring Schedule</h3>
            <p className="text-xs text-slate-400">
              Student: <strong className="text-white">{schedulingRequest.student_name}</strong>
              <br />
              Topic: <strong className="text-purple-300">{schedulingRequest.topic}</strong>
            </p>

            <form onSubmit={handleConfirmSchedule} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">Session Date</label>
                <input
                  type="date"
                  required
                  value={scheduleData.scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduleData((p) => ({ ...p, scheduledDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">Start Time</label>
                <select
                  value={scheduleData.startTime}
                  onChange={(e) => setScheduleData((p) => ({ ...p, startTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '05:30 PM', '07:00 PM'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">Session Duration</label>
                <select
                  value={scheduleData.durationMinutes}
                  onChange={(e) => setScheduleData((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (Standard)</option>
                  <option value={90}>90 Minutes (Extended)</option>
                </select>
              </div>

              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-[11px] text-slate-300 leading-normal flex items-start gap-2">
                <Video className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  Confirming this schedule creates an authoritative Calendar record and initiates Google Meet conference creation.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSchedulingRequest(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSchedule}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  {submittingSchedule ? (
                    <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirm Schedule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DECLINE REQUEST */}
      {declineRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Decline Mentoring Request</h3>
            <p className="text-xs text-slate-400">
              Please provide a polite reason for student <strong>{declineRequest.student_name}</strong>.
            </p>

            <form onSubmit={handleDeclineRequestSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="e.g. Current workload capacity exceeded; recommend re-applying next month."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeclineRequest(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecline}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                >
                  {submittingDecline ? 'Declining...' : 'Decline Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCEL SESSION */}
      {cancellingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Cancel Confirmed Session</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to cancel the session scheduled for {cancellingSession.scheduled_date}?
            </p>

            <form onSubmit={handleCancelSessionSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="Cancellation reason (dispatched to student and recorded in audit log)..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCancellingSession(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Cancel Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
