'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Video,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Sparkles,
  CalendarCheck,
  Ban,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/modules/module3/components/AuthContext';
import { getAuthToken } from '@/lib/auth-helpers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

export default function StudentSessionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'upcoming' | 'history'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionsData, setSessionsData] = useState<{
    requests: any[];
    upcoming: any[];
    history: any[];
    counts: { requests: number; upcoming: number; history: number };
  }>({
    requests: [],
    upcoming: [],
    history: [],
    counts: { requests: 0, upcoming: 0, history: 0 },
  });

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingType, setCancellingType] = useState<'request' | 'session' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken(user);
      const res = await fetch('/api/v1/student/sessions', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load mentoring sessions');
      }
      setSessionsData(data.data);
    } catch (err: any) {
      console.error('Error fetching student sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchSessions();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleCancel = async () => {
    if (!cancellingId || !cancellingType || !user) return;
    setActionLoading(true);
    try {
      const token = await getAuthToken(user);
      const endpoint = cancellingType === 'request'
        ? `/api/v1/student/requests/${cancellingId}/cancel`
        : `/api/v1/student/sessions/${cancellingId}/cancel`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by student' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel');
      }

      toast.success(data.message || 'Cancelled successfully');
      setCancellingId(null);
      setCancellingType(null);
      setCancelReason('');
      await fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  // Format UTC date to user's local timezone
  const formatLocalDateTime = (utcString: string) => {
    try {
      const date = new Date(utcString);
      if (isNaN(date.getTime())) return utcString;
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(date);
    } catch (e) {
      return utcString;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Sign in Required</h2>
        <p className="text-gray-400 mb-6 text-sm">Please sign in to view your mentoring requests and sessions.</p>
        <Link href="/login">
          <Button variant="primary">Sign In to Continue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full pb-16">
      {/* Back button and page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/mentors"
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Mentor Directory
          </Link>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            My Mentoring Sessions
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Track your submitted requests, confirmed 1-on-1 calls, and completed sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSessions}
            disabled={loading}
            className="gap-2 text-xs text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Link href="/mentors">
            <Button variant="primary" size="sm" className="gap-2 text-xs">
              Book a Mentor <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
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
            {sessionsData.counts.upcoming}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'requests'
              ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Requests in Review</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
            {sessionsData.counts.requests}
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
          <span>History & Completed</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-300 font-mono">
            {sessionsData.counts.history}
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="space-y-4 py-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center bg-rose-950/20 border-rose-500/30">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">Failed to Load Sessions</h3>
          <p className="text-xs text-rose-300/80 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            Try Again
          </Button>
        </Card>
      ) : (
        <div>
          {/* TAB 1: UPCOMING SESSIONS */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {sessionsData.upcoming.length === 0 ? (
                <Card className="p-12 text-center bg-black/40 border-white/10">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">No Upcoming Mentorship Sessions</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mb-6">
                    You don't have any confirmed sessions scheduled right now. Browse our verified industry mentors to schedule your next 1-on-1 code or career review.
                  </p>
                  <Link href="/mentors">
                    <Button variant="primary" size="sm">Browse Mentors</Button>
                  </Link>
                </Card>
              ) : (
                sessionsData.upcoming.map(session => {
                  const hasConfirmedMeet = session.conferenceStatus === 'confirmed' && Boolean(session.meetLink);
                  return (
                    <Card
                      key={session.id}
                      className="p-5 bg-black/40 border-white/10 hover:border-purple-500/30 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={session.mentorName || 'Mentor'} size="md" className="ring-2 ring-purple-500/30" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{session.mentorName}</h3>
                              <Badge variant="blue" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                                Scheduled
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">{session.topic}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {hasConfirmedMeet ? (
                            <Badge variant="success" className="text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Google Meet Confirmed
                            </Badge>
                          ) : session.conferenceStatus === 'failed' ? (
                            <Badge variant="danger" className="text-[11px] bg-rose-500/10 text-rose-400 border-rose-500/30">
                              Meet Link Failed
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[11px] bg-amber-500/10 text-amber-300 border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Meet Link Pending
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Details Strip */}
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

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCancellingId(session.id);
                            setCancellingType('session');
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          Cancel Session
                        </Button>

                        <div>
                          {hasConfirmedMeet ? (
                            <a
                              href={session.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="primary" size="sm" className="gap-2 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500">
                                <Video className="w-3.5 h-3.5" /> Join Google Meet <ExternalLink className="w-3 h-3" />
                              </Button>
                            </a>
                          ) : (
                            <Button variant="outline" size="sm" disabled className="gap-2 text-xs text-gray-500 border-white/10 cursor-not-allowed">
                              <Video className="w-3.5 h-3.5" /> Meeting Link Pending
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: REQUESTS IN REVIEW */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {sessionsData.requests.length === 0 ? (
                <Card className="p-12 text-center bg-black/40 border-white/10">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">No Active Requests Pending</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mb-6">
                    You don't have any submitted requests awaiting mentor response. Submit a request to connect with a senior engineer.
                  </p>
                  <Link href="/mentors">
                    <Button variant="primary" size="sm">Request Mentoring</Button>
                  </Link>
                </Card>
              ) : (
                sessionsData.requests.map(req => {
                  const isAwaitingScheduling = req.status === 'accepted_awaiting_scheduling';
                  return (
                    <Card
                      key={req.id}
                      className="p-5 bg-black/40 border-white/10 hover:border-white/20 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={req.mentorName || 'Mentor'} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{req.mentorName}</h3>
                              {isAwaitingScheduling ? (
                                <Badge variant="success" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                  Accepted — Awaiting Scheduling
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                  Pending Review
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{req.topic}</p>
                          </div>
                        </div>

                        <span className="text-[11px] text-gray-500">
                          Submitted {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'recently'}
                        </span>
                      </div>

                      {req.message && (
                        <p className="text-xs text-gray-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                          "{req.message}"
                        </p>
                      )}

                      {(req.preferredDate || req.preferredTime) && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Preferred: {req.preferredDate} {req.preferredTime && `at ${req.preferredTime}`}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[11px] text-gray-400">
                          {isAwaitingScheduling
                            ? 'Mentor has accepted your request. The calendar event is being scheduled.'
                            : 'Mentor has been notified and will review your request.'}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCancellingId(req.id);
                            setCancellingType('request');
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          Cancel Request
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: HISTORY & COMPLETED */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {sessionsData.history.length === 0 ? (
                <Card className="p-12 text-center bg-black/40 border-white/10">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-gray-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">No Mentoring History Yet</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Completed sessions, declined requests, and past cancellations will be archived here.
                  </p>
                </Card>
              ) : (
                sessionsData.history.map((item, idx) => {
                  const isCompleted = item.status === 'completed';
                  const isDeclined = item.status === 'declined';
                  const isCancelled = item.status === 'cancelled';

                  return (
                    <Card
                      key={item.id || idx}
                      className="p-4 bg-black/40 border-white/5 space-y-3 opacity-90 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={item.mentorName || 'Mentor'} size="sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white">{item.mentorName}</p>
                              <Badge
                                variant="default"
                                className={`text-[10px] ${
                                  isCompleted
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : isDeclined
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    : 'bg-gray-500/10 text-gray-400 border-white/10'
                                }`}
                              >
                                {isCompleted ? 'Completed' : isDeclined ? 'Declined' : 'Cancelled'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-gray-400">{item.topic}</p>
                          </div>
                        </div>

                        <span className="text-[11px] text-gray-500">
                          {item.recordDate ? new Date(item.recordDate).toLocaleDateString() : ''}
                        </span>
                      </div>

                      {item.declineReason && (
                        <div className="text-xs text-rose-300/80 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                          <span className="font-semibold text-rose-300">Reason:</span> {item.declineReason}
                        </div>
                      )}

                      {item.cancelReason && (
                        <div className="text-xs text-gray-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                          <span className="font-semibold text-gray-300">Cancellation note:</span> {item.cancelReason}
                        </div>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>+75 XP Awarded for completing session</span>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {cancellingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f1123] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Cancel Mentoring {cancellingType === 'request' ? 'Request' : 'Session'}?
                  </h3>
                  <p className="text-xs text-gray-400">This action cannot be undone.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Reason for cancellation (optional):
                </label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g., Schedule conflict, resolved question independently..."
                  rows={3}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCancellingId(null);
                    setCancellingType(null);
                  }}
                  disabled={actionLoading}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Keep {cancellingType === 'request' ? 'Request' : 'Session'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
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
    </div>
  );
}
