'use client'
import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, SlidersHorizontal, BookOpen, Video, 
  FileText, Download, Play, Compass, Award, 
  Eye, CheckCircle 
} from 'lucide-react'
import { MOCK_RESOURCES } from '@/frontend/lib/constants'
import toast from 'react-hot-toast'

const levels = ['all', 'Beginner', 'Intermediate', 'Advanced']
const categories = ['all', 'Frontend', 'Career', 'AI/ML', 'DevOps', 'Startup']

export default function ResourcesPage() {
  const [search, setSearch] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredResources = useMemo(() => {
    return MOCK_RESOURCES.filter(res => {
      const matchesSearch = res.title.toLowerCase().includes(search.toLowerCase()) || 
                            res.category.toLowerCase().includes(search.toLowerCase())
      
      const matchesLevel = selectedLevel === 'all' || res.level === selectedLevel
      const matchesCategory = selectedCategory === 'all' || res.category.toLowerCase() === selectedCategory.toLowerCase()

      return matchesSearch && matchesLevel && matchesCategory
    })
  }, [search, selectedLevel, selectedCategory])

  const handleAccess = (title: string, isPremium: boolean) => {
    if (isPremium) {
      toast.success(`Access granted! Directing to Premium Resource: ${title} 🚀`)
    } else {
      toast.success(`Opening free material: ${title} 🎉`)
    }
  }

  return (
    <div className="space-y-8 select-none">
      {/* Header section */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Resource Spotlight & Library</h1>
        <p className="text-xs text-muted-foreground mt-1">Access curated video masterclasses, system design documentation, and startup templates.</p>
      </div>

      {/* Filters Utility card */}
      <section className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search library assets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border/60 rounded-xl text-xs placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-card transition-all"
            />
          </div>

          {/* Level Filter Dropdowns */}
          <div className="flex gap-3 w-full md:w-auto shrink-0">
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="all">All Difficulty Levels</option>
              {levels.slice(1).map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="all">All Tech Disciplines</option>
              {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Grid Listing */}
      <AnimatePresence mode="wait">
        {filteredResources.length > 0 ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredResources.map((res) => {
              const isVideo = res.type.toLowerCase() === 'video' || res.type.toLowerCase() === 'workshop'
              
              return (
                <div
                  key={res.id}
                  className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all hover:shadow-md group"
                >
                  {/* Image cover overlay */}
                  <div className="relative h-44 w-full bg-muted overflow-hidden">
                    <img
                      src={res.thumbnail}
                      alt={res.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    
                    {/* Floating Level Tag */}
                    <div className="absolute top-3.5 left-3.5 flex gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[9px] text-white font-bold uppercase tracking-wider">
                        {res.category}
                      </span>
                    </div>

                    {/* Premium marker */}
                    <div className="absolute top-3.5 right-3.5">
                      {res.isPremium ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider shadow">
                          <Award className="w-2.5 h-2.5" /> Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wider shadow">
                          Free
                        </span>
                      )}
                    </div>

                    {/* Quick duration indicator */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[10px] text-white font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
                      <ClockIcon resType={res.type} /> <span>{res.duration}</span>
                    </div>
                  </div>

                  {/* Text details body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase">
                        <span>{res.level}</span>
                        <span className="bg-muted px-1.5 py-0.5 rounded text-foreground text-[9px] tracking-wide">
                          {res.type}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {res.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleAccess(res.title, res.isPremium)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        res.isPremium 
                          ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/10'
                          : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10'
                      }`}
                    >
                      {isVideo ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Watch Workshop
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> Access Documents
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </motion.section>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-12 text-center shadow-sm space-y-3 max-w-sm mx-auto"
          >
            <Compass className="w-10 h-10 text-muted-foreground/80 mx-auto animate-pulse" />
            <h3 className="font-display text-sm font-bold text-foreground">No resources match filters</h3>
            <p className="text-xs text-muted-foreground">Adjust your difficulties or discipline options and search again.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ClockIcon({ resType }: { resType: string }) {
  if (resType.toLowerCase() === 'video' || resType.toLowerCase() === 'workshop') {
    return <Video className="w-3 h-3 text-red-500" />
  }
  return <FileText className="w-3 h-3 text-blue-500" />
}
