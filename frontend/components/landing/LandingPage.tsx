'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Zap, Users, Calendar, BookOpen, Star, ChevronRight, Check, Sparkles, Trophy, Target, Shield } from 'lucide-react'
import { ThemeToggle } from '@/frontend/components/ui/theme-toggle'

const features = [
  { icon: Calendar, title: 'Events & Workshops', description: 'Discover and register for exclusive workshops, webinars, hackathons, and networking events curated for students.', color: 'from-blue-500 to-cyan-500' },
  { icon: Users, title: 'Expert Mentorship', description: 'Book 1-on-1 sessions with industry professionals from Google, Stripe, Vercel, and top startups.', color: 'from-purple-500 to-pink-500' },
  { icon: BookOpen, title: 'Resource Library', description: 'Access exclusive courses, templates, handbooks, and recordings curated by our expert community.', color: 'from-green-500 to-emerald-500' },
  { icon: Trophy, title: 'Competitions', description: 'Participate in hackathons, design sprints, and coding competitions with real prizes and recognition.', color: 'from-orange-500 to-red-500' },
  { icon: Target, title: 'Career Growth', description: 'Get personalized guidance on internships, placements, and building your professional presence.', color: 'from-yellow-500 to-orange-500' },
  { icon: Shield, title: 'Verified Community', description: 'A curated community of verified students and mentors — quality over quantity, always.', color: 'from-teal-500 to-blue-500' },
]

const stats = [
  { value: '2,400+', label: 'Active Members' },
  { value: '180+', label: 'Events Hosted' },
  { value: '85+', label: 'Expert Mentors' },
  { value: '94%', label: 'Satisfaction Rate' },
]

const testimonials = [
  { name: 'Arjun Sharma', role: '3rd Year, IIT Madras', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face', text: 'ANX completely changed my trajectory. The mentorship I got here helped me land my dream internship at Google.', rating: 5 },
  { name: 'Priya Nambiar', role: '4th Year, NIT Trichy', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face', text: 'The quality of events is unmatched. Every workshop feels premium and the speakers are literally top-tier engineers.', rating: 5 },
  { name: 'Rahul Dev', role: '2nd Year, BITS Pilani', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face', text: 'Premium membership was worth every rupee. The exclusive content library alone is a goldmine.', rating: 5 },
]

export function LandingPage() {
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroY = useTransform(scrollY, [0, 400], [0, -80])

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-foreground tracking-tight">A.N.X</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#testimonials" className="hover:text-foreground transition-colors">Community</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:60px_60px] opacity-20" />
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Now with AI-powered mentor matching
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl font-bold text-foreground leading-tight tracking-tight mb-6">
            The platform where{' '}
            <span className="text-gradient">student careers</span>{' '}are built
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Events, mentorship, and community — everything you need to go from student to professional, all in one premium platform.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-base">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 border border-border bg-card/50 text-foreground font-medium rounded-xl hover:bg-card transition-all text-base backdrop-blur-sm">
              Sign in to dashboard <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-6 text-sm text-muted-foreground">
            Free forever • No credit card required • 2,400+ students already joined
          </motion.p>
        </motion.div>

        {/* Hero visual */}
        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent z-10" />
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border/40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="text-center">
                <div className="font-display text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">Everything you need to level up</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">From exclusive events to personalized mentorship, ANX gives you the tools and community to grow fast.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all hover:shadow-lg group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">Simple, honest pricing</h2>
            <p className="text-lg text-muted-foreground">Start free, upgrade when you're ready.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border bg-card">
              <div className="mb-6">
                <div className="text-lg font-semibold text-foreground mb-1">Free</div>
                <div className="font-display text-4xl font-bold text-foreground">₹0</div>
                <div className="text-sm text-muted-foreground mt-1">Forever free</div>
              </div>
              <ul className="space-y-3 mb-8">
                {['Public events access', 'Basic member profile', 'Community chat', 'Monthly newsletter'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="w-full block text-center py-3 border border-border rounded-xl font-medium text-foreground hover:bg-muted transition-colors">
                Get started free
              </Link>
            </motion.div>
            {/* Premium */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="p-8 rounded-2xl border-2 border-primary bg-primary/5 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">Most Popular</div>
              <div className="mb-6">
                <div className="text-lg font-semibold text-foreground mb-1">Premium</div>
                <div className="font-display text-4xl font-bold text-foreground">₹299<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                <div className="text-sm text-muted-foreground mt-1">or ₹2,990/year (save 17%)</div>
              </div>
              <ul className="space-y-3 mb-8">
                {['Everything in Free', 'Premium events access', 'Mentor booking (5hr/month)', 'Early event registration', 'Exclusive content library', '24/7 priority support'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="w-full block text-center py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg">
                Start 7-day free trial
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">Loved by students everywhere</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex gap-1 mb-4">{Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="p-12 rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-cyan-500/10 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-display text-4xl font-bold text-foreground mb-4">Ready to level up?</h2>
              <p className="text-muted-foreground mb-8 text-lg">Join 2,400+ students building their careers on A.N.X</p>
              <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg text-base">
                Create your free account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-foreground">A.N.X</span>
              <span className="text-muted-foreground text-sm">Club & Member Ecosystem</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <div className="text-sm text-muted-foreground">© 2026 A.N.X. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
