'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Award, Star, Calendar,
  Clock, X, Check, ArrowRight, ShieldCheck,
  MessageSquare, Video, CreditCard, Sparkles,
  Building, ChevronRight, Briefcase, Filter,
  CheckCircle2, AlertCircle, Info, ExternalLink,
} from 'lucide-react';
import { SKILLS } from '@/lib/constants';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/module3/components/AuthContext';
import { mentorsApi } from '@/lib/api';
import { PremiumGateModal } from '@/components/common/PremiumGateModal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const SLOT_TIMINGS = [
  '09:00 AM - 10:00 AM',
  '11:30 AM - 12:30 PM',
  '02:00 PM - 03:00 PM',
  '04:30 PM - 05:30 PM',
  '07:00 PM - 08:00 PM',
];

const EXPERTISE_OPTIONS = [
  'all',
  'Full-Stack',
  'System Design',
  'AI/ML',
  'DevOps',
  'Cloud Architecture',
  'Frontend',
  'Backend',
  'Web3',
];

const COMPANY_OPTIONS = [
  'all',
  'Google',
  'Microsoft',
  'Amazon',
  'Meta',
  'Stripe',
  'Startups',
];

export default function MentorsPage() {
  const { user, profile } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'free' | 'paid'>('all');

  const [activeBookingMentor, setActiveBookingMentor] = useState<any | null>(null);
  const [activeProfileMentor, setActiveProfileMentor] = useState<any | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Premium Gate Modal
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [premiumModalDetail, setPremiumModalDetail] = useState<{ title: string; desc: string }>({
    title: 'Unlock 1-on-1 Expert Mentorship',
    desc: 'Book private mentoring sessions with staff engineers and engineering leaders from top tech firms.',
  });

  // Request Form State
  const [bookingDetails, setBookingDetails] = useState({
    topic: '',
    message: '',
    date: '',
    time: SLOT_TIMINGS[0],
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Submission State
  const [paymentStep, setPaymentStep] = useState<'details' | 'payment' | 'confirmed'>('details');
  const [confirmedBookingData, setConfirmedBookingData] = useState<any | null>(null);

  // Fetch mentors list
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const res = await mentorsApi.list();
        if (res.data && Array.isArray(res.data)) {
          setMentors(res.data);
        } else {
          setMentors([]);
        }
      } catch (err) {
        console.error('Failed to fetch mentors', err);
        setMentors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMentors();
  }, []);

  // Filtered mentors list
  const filteredMentors = useMemo(() => {
    const sourceList = mentors;
    return sourceList.filter((men: any) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (men.name || '').toLowerCase().includes(q) ||
        (men.company || '').toLowerCase().includes(q) ||
        (men.role || '').toLowerCase().includes(q) ||
        (men.bio || '').toLowerCase().includes(q);

      const mentorSkills = men.skills || men.expertise || [];
      const matchesExpertise =
        selectedExpertise === 'all' ||
        mentorSkills.some((s: string) => s.toLowerCase().includes(selectedExpertise.toLowerCase()));

      const mentorCompany = (men.company || '').toLowerCase();
      const matchesCompany =
        selectedCompany === 'all' ||
        (selectedCompany === 'Startups'
          ? !['google', 'microsoft', 'amazon', 'meta', 'stripe', 'apple'].some(c => mentorCompany.includes(c))
          : mentorCompany.includes(selectedCompany.toLowerCase()));

      const rate = Number(men.hourlyRate || men.rate || 0);
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'free' ? rate === 0 : rate > 0);

      return matchesSearch && matchesExpertise && matchesCompany && matchesAvailability;
    });
  }, [mentors, search, selectedExpertise, selectedCompany, availabilityFilter]);

  const openBookingModal = (men: any) => {
    const isUserPremium =
      profile?.role === 'Premium Member' || profile?.role === 'Admin' || profile?.membershipType === 'premium';
    if (men.isPremiumOnly && !isUserPremium) {
      setPremiumModalDetail({
        title: `Book Session with ${men.name}`,
        desc: `1-on-1 mentorship with ${men.name} (${men.role} @ ${men.company}) is exclusively available to ANX Premium members.`,
      });
      setIsPremiumModalOpen(true);
      return;
    }

    setActiveBookingMentor(men);
    setPaymentStep('details');
    setFormErrors({});
    setBookingDetails({
      topic: '',
      message: '',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Default tomorrow
      time: SLOT_TIMINGS[0],
    });
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!bookingDetails.topic.trim()) {
      errors.topic = 'Mentorship topic is required';
    } else if (bookingDetails.topic.trim().length < 3) {
      errors.topic = 'Topic must be at least 3 characters';
    }

    if (!bookingDetails.message.trim()) {
      errors.message = 'Please provide context on what you want to achieve';
    } else if (bookingDetails.message.trim().length < 10) {
      errors.message = 'Please provide at least 10 characters of context';
    }

    if (bookingDetails.date) {
      const today = new Date().toISOString().split('T')[0];
      if (bookingDetails.date < today) {
        errors.date = 'Cannot request dates in the past';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBookingSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    if (!user) {
      toast.error('Please sign in to book mentorship');
      return;
    }

    const mentorRate = Number(activeBookingMentor.hourlyRate || activeBookingMentor.rate || 0);

    // If paid mentor and user hasn't confirmed payment step yet
    if (mentorRate > 0 && paymentStep === 'details') {
      setPaymentStep('payment');
      return;
    }

    setIsSubmitting(true);
    try {
      const isPaid = mentorRate > 0;
      const payload = {
        memberId: user.uid,
        studentId: user.uid,
        memberName: profile?.fullName || user.displayName || 'Student Member',
        studentName: profile?.fullName || user.displayName || 'Student Member',
        memberEmail: user.email || profile?.email || '',
        studentEmail: user.email || profile?.email || '',
        mentorId: activeBookingMentor.id,
        mentorName: activeBookingMentor.name,
        topic: bookingDetails.topic.trim(),
        message: bookingDetails.message.trim(),
        preferredDate: bookingDetails.date,
        preferredTime: bookingDetails.time,
        preferredTimes: bookingDetails.date ? [`${bookingDetails.date} ${bookingDetails.time}`] : [],
        dateTime: `${bookingDetails.date} ${bookingDetails.time}`,
        date: bookingDetails.date,
        time: bookingDetails.time,
        status: 'pending',
        isPaid,
        amount: mentorRate,
        meetingLink: null,
      };

      const res = await mentorsApi.book(activeBookingMentor.id, payload);

      setConfirmedBookingData({
        ...payload,
        id: res?.data?.id || `req_${Date.now()}`,
        meetingLink: null,
      });
      setPaymentStep('confirmed');
      toast.success('Mentoring request submitted successfully!');
    } catch (err: any) {
      console.error('Error booking mentor:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto w-full pb-16">
      {/* Hero Header */}
      <div className="relative rounded-3xl p-8 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-500/20 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Verified 1-on-1 Mentorship</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
              Learn Directly From Senior Engineers
            </h1>
            <p className="text-sm md:text-base text-gray-300 mt-2">
              Book private 1-on-1 sessions for system design reviews, coding guidance, resume breakdowns, and mock interviews with engineers at top tech companies.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link href="/mentors/my-sessions">
              <Button
                variant="outline"
                size="md"
                className="gap-2 text-xs border-purple-500/40 text-purple-200 hover:bg-purple-500/10 w-full sm:w-auto"
              >
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>My Mentoring Sessions</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by mentor name, company, role, or skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Company Filter */}
          <div>
            <select
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">All Companies</option>
              {COMPANY_OPTIONS.filter(c => c !== 'all').map(comp => (
                <option key={comp} value={comp}>{comp}</option>
              ))}
            </select>
          </div>

          {/* Rate Filter */}
          <div>
            <select
              value={availabilityFilter}
              onChange={e => setAvailabilityFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">All Rates (Free & Paid)</option>
              <option value="free">Community Free Sessions</option>
              <option value="paid">Senior Executive Paid</option>
            </select>
          </div>
        </div>

        {/* Expertise Tag Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-gray-400 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-purple-400" /> Topic:
          </span>
          {EXPERTISE_OPTIONS.map(exp => (
            <button
              key={exp}
              onClick={() => setSelectedExpertise(exp)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedExpertise === exp
                  ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {exp === 'all' ? 'All Specializations' : exp}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Showing {filteredMentors.length} verified mentors</span>
        {(search || selectedExpertise !== 'all' || selectedCompany !== 'all' || availabilityFilter !== 'all') && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedExpertise('all');
              setSelectedCompany('all');
              setAvailabilityFilter('all');
            }}
            className="text-purple-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mentors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-black/40 border border-white/10 max-w-lg mx-auto space-y-3">
          <Users className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Mentors Match Your Search</h3>
          <p className="text-xs text-gray-400">
            Try adjusting your search keywords, clearing company filters, or selecting "All Specializations".
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setSelectedExpertise('all');
              setSelectedCompany('all');
              setAvailabilityFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor: any) => {
            const rate = Number(mentor.hourlyRate || mentor.rate || 0);
            return (
              <div
                key={mentor.id}
                className="group relative rounded-3xl bg-black/40 border border-white/10 hover:border-purple-500/40 backdrop-blur-xl p-6 transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
              >
                <div className="space-y-4">
                  {/* Top Mentor Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={mentor.name || 'Mentor'} size="lg" className="ring-2 ring-purple-500/30" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                            {mentor.name}
                          </h3>
                          {mentor.isPremiumOnly && (
                            <Badge variant="primary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] px-1 py-0 border-none">
                              PRO
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 font-medium flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 text-purple-400 shrink-0" />
                          <span>{mentor.role}</span>
                        </p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>{mentor.company}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{mentor.rating || 5.0}</span>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                    {mentor.bio || 'Senior engineering mentor passionate about system architecture, scalable web apps, and junior dev acceleration.'}
                  </p>

                  {/* Skills Tag Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(mentor.skills || mentor.expertise || ['System Design', 'Full-Stack']).slice(0, 4).map((sk: string) => (
                      <span
                        key={sk}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-gray-300 font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                    {(mentor.skills || mentor.expertise || []).length > 4 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] text-gray-500">
                        +{(mentor.skills || mentor.expertise || []).length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Strip */}
                <div className="pt-5 mt-5 border-t border-white/5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Session Fee</span>
                    <span className="text-sm font-bold text-white">
                      {rate > 0 ? `₹${rate}` : <span className="text-emerald-400 font-semibold">Free</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveProfileMentor(mentor)}
                      className="text-xs text-gray-400 hover:text-white px-2.5"
                    >
                      Profile
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openBookingModal(mentor)}
                      className="text-xs gap-1.5"
                    >
                      Request <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mentor Profile Details Modal */}
      <AnimatePresence>
        {activeProfileMentor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0f1123] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={activeProfileMentor.name} size="lg" className="ring-2 ring-purple-500/40" />
                  <div>
                    <h3 className="text-base font-bold text-white">{activeProfileMentor.name}</h3>
                    <p className="text-xs text-purple-300 font-medium">{activeProfileMentor.role} @ {activeProfileMentor.company}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" /> {activeProfileMentor.rating || 5.0}
                      </span>
                      <span>•</span>
                      <span>{activeProfileMentor.sessionsCompleted || 12} completed sessions</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveProfileMentor(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">About Mentor</h4>
                <p className="text-xs text-gray-300 leading-relaxed bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl">
                  {activeProfileMentor.bio || 'Senior engineering mentor with extensive track record.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Technical Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {(activeProfileMentor.skills || activeProfileMentor.expertise || ['System Design', 'Full-Stack']).map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Rate</span>
                  <span className="text-sm font-bold text-white">
                    {Number(activeProfileMentor.hourlyRate || activeProfileMentor.rate || 0) > 0
                      ? `₹${activeProfileMentor.hourlyRate || activeProfileMentor.rate} / session`
                      : 'Free'}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const m = activeProfileMentor;
                    setActiveProfileMentor(null);
                    openBookingModal(m);
                  }}
                  className="text-xs"
                >
                  Request Mentoring
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* "Request Mentoring" Form Modal */}
      <AnimatePresence>
        {activeBookingMentor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0f1123] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={activeBookingMentor.name} size="md" className="ring-2 ring-purple-500/30" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Request Mentoring: {activeBookingMentor.name}</h3>
                    <p className="text-xs text-gray-400">{activeBookingMentor.role} @ {activeBookingMentor.company}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveBookingMentor(null);
                    setPaymentStep('details');
                  }}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: Request Details */}
              {paymentStep === 'details' && (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  {/* Topic */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Session Topic <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. System Design for Distributed Chat, Resume Audit, Next.js review..."
                      value={bookingDetails.topic}
                      onChange={e => setBookingDetails(prev => ({ ...prev, topic: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    {formErrors.topic && (
                      <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.topic}
                      </p>
                    )}
                  </div>

                  {/* Message / Goals */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Context & Learning Goals <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Briefly describe what you are building, your current roadblocks, and specific questions for the mentor..."
                      value={bookingDetails.message}
                      onChange={e => setBookingDetails(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                    />
                    {formErrors.message && (
                      <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.message}
                      </p>
                    )}
                  </div>

                  {/* Preferred Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Preferred Date (Optional)
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingDetails.date}
                        onChange={e => setBookingDetails(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                      {formErrors.date && (
                        <p className="text-[11px] text-rose-400 mt-1">{formErrors.date}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Preferred Window
                      </label>
                      <select
                        value={bookingDetails.time}
                        onChange={e => setBookingDetails(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        {SLOT_TIMINGS.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notice on Real Google Meet */}
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>
                      Submitting sends your request to the mentor. When accepted, the mentor will schedule the official calendar slot, and a Google Meet link will be automatically generated.
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveBookingMentor(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting}
                      className="text-xs"
                    >
                      {isSubmitting
                        ? 'Submitting...'
                        : Number(activeBookingMentor.hourlyRate || activeBookingMentor.rate || 0) > 0
                        ? `Proceed to Payment (₹${activeBookingMentor.hourlyRate || activeBookingMentor.rate})`
                        : 'Submit Mentoring Request'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 2: Payment (for paid sessions) */}
              {paymentStep === 'payment' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mentor:</span>
                      <span className="font-bold text-white">{activeBookingMentor.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Topic:</span>
                      <span className="font-medium text-white">{bookingDetails.topic}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10 text-sm">
                      <span className="text-gray-300 font-bold">Total Fee:</span>
                      <span className="font-bold text-emerald-400">₹{activeBookingMentor.hourlyRate || activeBookingMentor.rate}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentStep('details')}
                      className="text-xs"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => handleBookingSubmit()}
                      className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500"
                    >
                      {isSubmitting ? 'Processing...' : `Pay ₹${activeBookingMentor.hourlyRate || activeBookingMentor.rate} & Submit`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmed Request Screen */}
              {paymentStep === 'confirmed' && confirmedBookingData && (
                <div className="space-y-5 text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Mentoring Request Submitted!</h3>
                    <p className="text-xs text-gray-300 mt-1 max-w-sm mx-auto">
                      Your request with <strong className="text-white">{confirmedBookingData.mentorName}</strong> has been sent for review.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Topic:</span>
                      <span className="font-medium text-white">{confirmedBookingData.topic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <Badge variant="warning" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                        Pending Review
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">XP Awarded:</span>
                      <span className="font-bold text-purple-400">+40 XP</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link href="/mentors/my-sessions" className="flex-1">
                      <Button variant="primary" size="sm" className="w-full text-xs">
                        View in My Sessions →
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveBookingMentor(null);
                        setPaymentStep('details');
                        setConfirmedBookingData(null);
                      }}
                      className="text-xs"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PremiumGateModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        title={premiumModalDetail.title}
        description={premiumModalDetail.desc}
      />
    </div>
  );
}
