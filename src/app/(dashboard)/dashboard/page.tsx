'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users2,
  CreditCard,
  FolderGit2,
  ArrowRight,
  Megaphone,
  Zap,
  BookOpen,
  Clock,
  ChevronRight,
  Bot,
  Map,
  Shield,
  MessageSquare,
  Sparkles,
  Video,
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/module3/components/AuthContext';
import { getAuthToken } from '@/lib/auth-helpers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import GamificationWidget from '@/components/dashboard/GamificationWidget';

const fadeUp: any = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchStudentDashboard = async () => {
    if (!user) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    try {
      const token = await getAuthToken(user);
      // Fetch from dedicated student dashboard API
      const res = await fetch('/api/v1/student/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setDashboardData(json.data);
          setLoadingData(false);
          return;
        }
      }

      // Fallback to module2 BFF aggregator if student endpoint not ready
      const bffRes = await fetch('/api/v1/module2/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (bffRes.ok) {
        const bffJson = await bffRes.json();
        setDashboardData(bffJson);
      }
    } catch (err) {
      console.warn('Dashboard fetch notice:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchStudentDashboard();
    } else if (!authLoading && !user) {
      setLoadingData(false);
    }
  }, [user, authLoading]);

  // Derived real data
  const stats = dashboardData?.stats || {};
  const upcomingEvents = dashboardData?.upcomingEvents || [];
  const announcements = dashboardData?.announcements || [];
  const myMentoring = dashboardData?.myMentoring || {};
  const mentoringRequests = myMentoring.requests || [];
  const upcomingSessions = myMentoring.upcomingSessions || dashboardData?.mentorBookings || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const roadmapProgress = dashboardData?.learningProgress || dashboardData?.roadmapProgress || null;
  const earnedBadges = dashboardData?.user?.earnedBadges || profile?.recentBadges || [];

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = profile?.fullName
    ? profile.fullName.split(' ')[0]
    : user?.displayName
    ? user.displayName.split(' ')[0]
    : 'Member';

  // Format UTC date into user's local timezone
  const formatLocalDateTime = (utcString: string) => {
    try {
      const date = new Date(utcString);
      if (isNaN(date.getTime())) return utcString;
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return utcString;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-10">
      {/* 1. HERO BANNER */}
      <motion.div
        initial="hidden"
        animate="visible"
        custom={0}
        variants={fadeUp}
        className="relative w-full rounded-3xl overflow-hidden border border-primary/20 shadow-[0_0_30px_rgba(139,92,246,0.15)] bg-[#0d0a1b] min-h-[340px]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0a1b] via-[#1a0b2e] to-[#0d0a1b] z-0" />
        <div className="absolute top-[-50%] left-[20%] w-[800px] h-[800px] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen z-0" />
        <div className="absolute top-[-30%] right-[10%] w-[600px] h-[600px] rounded-full bg-fuchsia-600/20 blur-[100px] mix-blend-screen z-0" />

        <div className="relative z-10 p-8 flex flex-col h-full justify-between gap-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                {user ? (
                  <>
                    {getGreeting()}, {displayName}! <span className="text-2xl">👋</span>
                  </>
                ) : (
                  <>
                    Welcome to A.N.X Platform <span className="text-2xl">🚀</span>
                  </>
                )}
              </h1>
              <p className="text-sm md:text-base text-gray-300 mt-2 max-w-lg">
                {user
                  ? 'Your single dashboard for hackathons, verified mentoring, real-world incubator sprints, and career prep.'
                  : 'Explore events, connect with senior engineering mentors, and build projects.'}
              </p>

              {!user ? (
                <div className="flex items-center gap-4 mt-6">
                  <Link href="/login">
                    <Button variant="primary" size="md">Sign In to Dashboard</Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="outline" size="md">Create Account</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full font-mono">
                    Role: {profile?.role || 'Member'}
                  </span>
                  <span className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full font-mono">
                    XP: {stats.xpTotal ?? profile?.xpTotal ?? 0}
                  </span>
                  <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-mono">
                    Stage: {stats.leadershipStage ?? profile?.leadershipStage ?? 'Member'}
                  </span>
                </div>
              )}
            </div>

            <div className="hidden lg:flex flex-col items-end">
              <div
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="cursor-pointer border border-white/10 hover:border-fuchsia-500/50 bg-black/40 backdrop-blur-xl p-3 rounded-2xl flex items-center gap-3 shadow-xl transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    Search & Ask AI <Badge variant="primary" className="bg-fuchsia-500 text-white border-none text-[9px] px-1.5 py-0">Ctrl+K</Badge>
                  </div>
                  <div className="text-[10px] text-gray-400">Find mentors, events, and roadmaps</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Real Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              {
                label: 'Events Registered',
                value: (stats.eventsRegisteredCount ?? dashboardData?.registeredEvents?.length ?? 0).toString(),
                subtext: 'Upcoming campus workshops',
                icon: Calendar,
                color: 'text-purple-400',
                bg: 'bg-purple-500/20',
              },
              {
                label: 'Upcoming Sessions',
                value: (stats.upcomingSessionsCount ?? upcomingSessions.length ?? 0).toString(),
                subtext: mentoringRequests.length > 0
                  ? `${mentoringRequests.length} requests in review`
                  : 'Scheduled 1-on-1 calls',
                icon: Users2,
                color: 'text-blue-400',
                bg: 'bg-blue-500/20',
              },
              {
                label: 'Projects Submitted',
                value: (stats.projectsCount ?? dashboardData?.projects?.length ?? 0).toString(),
                subtext: 'Incubator ideas & repos',
                icon: FolderGit2,
                color: 'text-orange-400',
                bg: 'bg-orange-500/20',
              },
              {
                label: 'Community Discussions',
                value: (stats.communityPostsCount ?? 0).toString(),
                subtext: 'Topics authored by you',
                icon: MessageSquare,
                color: 'text-green-400',
                bg: 'bg-green-500/20',
              },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={cn('p-2.5 rounded-xl', stat.bg)}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-[11px] font-medium text-gray-400">
                  {stat.subtext}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 2. THREE COLUMN BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1 */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card padding="none" className="glass border-white/10 overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.05)] transition-all">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-400" /> Upcoming Events
              </h2>
              <Link href="/events" className="text-xs font-medium text-purple-400 hover:text-purple-300">View All →</Link>
            </div>
            <div className="p-3 space-y-2">
              {upcomingEvents.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-xs font-semibold text-gray-300">No Upcoming Events</p>
                  <p className="text-[11px] text-gray-500">Check back soon for hackathons and workshops.</p>
                </div>
              ) : (
                upcomingEvents.slice(0, 3).map((ev: any) => (
                  <Link href={`/events/${ev.id}`} key={ev.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {ev.date ? new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'EV'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{ev.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Map className="h-3 w-3 text-purple-400 shrink-0" /> {ev.location || 'Online'}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Announcements */}
          <Card padding="none" className="glass border-white/10 overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-blue-400" /> Platform Announcements
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {announcements.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <Megaphone className="w-7 h-7 text-gray-600 mx-auto" />
                  <p className="text-xs font-semibold text-gray-300">No Announcements</p>
                  <p className="text-[11px] text-gray-500">Stay tuned for campus announcements and release notes.</p>
                </div>
              ) : (
                announcements.slice(0, 3).map((ann: any) => (
                  <div key={ann.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate">{ann.title}</p>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2">{ann.content}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* COLUMN 2 */}
        <div className="space-y-6">
          {/* Gamification Widget */}
          <GamificationWidget
            xpTotal={stats.xpTotal ?? profile?.xpTotal ?? 0}
            leadershipStage={stats.leadershipStage ?? profile?.leadershipStage ?? 'Member'}
            recentBadges={earnedBadges}
          />

          {/* Learning Progress / Career Roadmap */}
          <Card padding="none" className="glass border-white/10 overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.05)] transition-all">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" /> Learning Progress
              </h2>
              <Link href="/resources" className="text-xs font-medium text-cyan-400 hover:text-cyan-300">View Roadmaps →</Link>
            </div>
            <div className="p-6">
              {roadmapProgress ? (
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full border-[6px] border-[#1e1b4b] relative flex items-center justify-center shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{roadmapProgress.progressPercentage || 0}%</p>
                      <p className="text-[8px] text-gray-400 uppercase">Done</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-white">
                      <span>{roadmapProgress.roadmapTitle || 'Active Roadmap'}</span>
                      <Badge variant="blue" className="text-[9px] bg-blue-500/20 text-blue-400 border-none">Active</Badge>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                        style={{ width: `${roadmapProgress.progressPercentage || 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {roadmapProgress.completedStepIds?.length || 0} checkpoint steps completed
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-cyan-400/60 mx-auto" />
                  <p className="text-xs font-semibold text-white">No Roadmap Track Started</p>
                  <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                    Pick from interactive engineering roadmaps (Full-Stack, AI/ML, DevOps, Cloud) to track verifiable milestones.
                  </p>
                  <Link
                    href="/resources"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold text-xs border border-cyan-500/30 transition-all"
                  >
                    Browse Roadmaps →
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Activity Feed */}
          <Card padding="none" className="glass border-white/10 overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(217,70,239,0.05)] transition-all">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-fuchsia-500" /> Recent Activity
              </h2>
            </div>
            <div className="p-5">
              {recentActivity.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <Clock className="w-7 h-7 text-gray-600 mx-auto" />
                  <p className="text-xs font-semibold text-gray-300">No Recent Activity</p>
                  <p className="text-[11px] text-gray-500">
                    Your event registrations, mentor requests, and XP milestones will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((act: any, i: number) => (
                    <div key={act.id || i} className="flex gap-3 items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center shrink-0">
                          <Zap className="h-3 w-3" />
                        </div>
                        <span className="text-gray-300 truncate font-medium">{act.title || act.reason}</span>
                      </div>
                      {act.xpValue > 0 && (
                        <span className="text-purple-400 font-bold shrink-0 text-[11px]">+{act.xpValue} XP</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* COLUMN 3 */}
        <div className="space-y-6">
          {/* "My Mentoring" Card: Requests & Sessions */}
          <Card padding="none" className="glass border-white/10 overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(217,70,239,0.05)] transition-all">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users2 className="h-4 w-4 text-fuchsia-500" /> My Mentoring
              </h2>
              <Link href="/mentors/my-sessions" className="text-xs font-medium text-fuchsia-400 hover:text-fuchsia-300">
                All Sessions ({upcomingSessions.length + mentoringRequests.length}) →
              </Link>
            </div>
            <div className="p-3 space-y-3">
              {upcomingSessions.length === 0 && mentoringRequests.length === 0 ? (
                <div className="py-8 text-center space-y-2 px-4">
                  <Users2 className="w-8 h-8 text-blue-400/60 mx-auto" />
                  <p className="text-xs font-semibold text-white">No Mentoring Bookings Yet</p>
                  <p className="text-[11px] text-gray-400">
                    Connect 1-on-1 with senior tech leads for architecture reviews, career guidance, and resume checks.
                  </p>
                  <Link
                    href="/mentors"
                    className="inline-block mt-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md transition-all"
                  >
                    Browse Mentors
                  </Link>
                </div>
              ) : (
                <>
                  {/* Scheduled sessions first */}
                  {upcomingSessions.slice(0, 2).map((session: any) => {
                    const hasConfirmedMeet = session.conferenceStatus === 'confirmed' && Boolean(session.meetLink);
                    return (
                      <div key={session.id} className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={session.mentorName || 'Mentor'} size="sm" className="ring-1 ring-purple-500/30 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{session.mentorName}</p>
                              <p className="text-[11px] text-gray-400 truncate">{session.topic}</p>
                            </div>
                          </div>
                          <Badge variant="blue" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 shrink-0">
                            Scheduled
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                          <span className="text-gray-400 flex items-center gap-1 truncate">
                            <Calendar className="h-3 w-3 text-purple-400 shrink-0" />
                            <span className="truncate">{session.startAtUTC ? formatLocalDateTime(session.startAtUTC) : 'Scheduled'}</span>
                          </span>

                          {hasConfirmedMeet ? (
                            <a
                              href={session.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 font-bold hover:underline shrink-0 flex items-center gap-1"
                            >
                              <Video className="w-3 h-3" /> Join Meet →
                            </a>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-medium shrink-0">
                              Link Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Active Requests */}
                  {mentoringRequests.slice(0, 2).map((req: any) => (
                    <div key={req.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={req.mentorName || 'Mentor'} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{req.mentorName}</p>
                            <p className="text-[10px] text-gray-400 truncate">{req.topic}</p>
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className={cn(
                            'text-[9px] shrink-0',
                            req.status === 'accepted_awaiting_scheduling'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                              : req.status === 'declined'
                              ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                              : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          )}
                        >
                          {req.status === 'accepted_awaiting_scheduling'
                            ? 'Accepted'
                            : req.status === 'declined'
                            ? 'Declined'
                            : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>

          {/* Quick Actions (No dead "#" links!) */}
          <Card padding="none" className="glass border-white/10 overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(217,70,239,0.05)] transition-all">
            <div className="p-5 border-b border-white/10">
              <h2 className="text-sm font-bold text-foreground">Quick Shortcuts</h2>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: Calendar, label: 'Events', bg: 'bg-purple-500/20', color: 'text-purple-400', link: '/events' },
                { icon: Users2, label: 'Find Mentor', bg: 'bg-blue-500/20', color: 'text-blue-400', link: '/mentors' },
                { icon: CalendarCheck, label: 'My Sessions', bg: 'bg-indigo-500/20', color: 'text-indigo-400', link: '/mentors/my-sessions' },
                { icon: FolderGit2, label: 'Incubator', bg: 'bg-orange-500/20', color: 'text-orange-400', link: '/incubator' },
                { icon: MessageSquare, label: 'Community', bg: 'bg-emerald-500/20', color: 'text-emerald-400', link: '/community' },
                { icon: Sparkles, label: 'Career Prep', bg: 'bg-pink-500/20', color: 'text-pink-400', link: '/career' },
              ].map((act, i) => (
                <Link href={act.link} key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 transition-all group">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-md', act.bg)}>
                    <act.icon className={cn('h-4 w-4', act.color)} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-300 group-hover:text-white">{act.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Referral Card */}
          <Card padding="none" className="glass border-white/10 overflow-hidden shadow-xl p-5 space-y-3 bg-gradient-to-br from-purple-950/30 to-fuchsia-950/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Refer & Earn +50 XP</h3>
                <p className="text-[10px] text-gray-400">Invite peers to build their dev network.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={user ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${user.uid}` : 'Sign in to get referral link'}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-300 font-mono truncate focus:outline-none"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (user && typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${user.uid}`);
                    toast.success('Referral link copied!');
                  }
                }}
                disabled={!user}
                className="text-[10px] px-2.5 py-1 shrink-0"
              >
                Copy
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
