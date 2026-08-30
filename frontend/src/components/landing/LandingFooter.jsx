import React from 'react'
import { Link } from 'react-router-dom'
import { Compass, Github, Twitter, Linkedin, Heart, Shield, Cpu, Sparkles } from 'lucide-react'

/**
 * LandingFooter
 * Comprehensive dark/light footer with platform sitemap, status badge, and legal links.
 */
export default function LandingFooter() {
  return (
    <footer className="w-full border-t border-[#E0E0E0] dark:border-[#27272F] bg-white/60 dark:bg-[#09090B]/90 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#004FA3] flex items-center justify-center text-white shadow-md shadow-[#0066CC]/25">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D1D1F] dark:text-[#F8FAFC]">
                PathFinder
              </span>
            </Link>
            <p className="text-sm text-[#7A7A7A] dark:text-[#94A3B8] leading-relaxed max-w-sm">
              The intelligent, adaptive career acceleration engine. We transform your existing resume & GitHub code into a custom-week mastery roadmap with real-time AI guidance.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#22A06B]/30 text-xs font-semibold text-[#22A06B] dark:text-[#34D399]">
                <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-pulse"></span>
                <span>AI Engine Operational</span>
              </div>
              <span className="text-xs text-[#7A7A7A] dark:text-[#64748B] font-mono">
                v2.4.0
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold tracking-wider uppercase text-[#1D1D1F] dark:text-[#F8FAFC] font-mono">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-[#7A7A7A] dark:text-[#94A3B8]">
              <li>
                <Link to="/onboarding" className="hover:text-[#0066CC] dark:hover:text-[#C9D0D6] transition-colors">
                  Generate Roadmap
                </Link>
              </li>
              <li>
                <Link to="/skills" className="hover:text-[#0066CC] dark:hover:text-[#C9D0D6] transition-colors">
                  Skill Heatmap
                </Link>
              </li>
              <li>
                <Link to="/coach" className="hover:text-[#0066CC] dark:hover:text-[#C9D0D6] transition-colors">
                  AI Career Coach
                </Link>
              </li>
              <li>
                <Link to="/resources" className="hover:text-[#0066CC] dark:hover:text-[#C9D0D6] transition-colors">
                  Curated Catalog
                </Link>
              </li>
            </ul>
          </div>

          {/* Engineering Tracks */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold tracking-wider uppercase text-[#1D1D1F] dark:text-[#F8FAFC] font-mono">
              Tracks
            </h4>
            <ul className="space-y-2 text-sm text-[#7A7A7A] dark:text-[#94A3B8]">
              <li>AI / LLM Systems Engineer</li>
              <li>Full-Stack Cloud Architect</li>
              <li>MLOps & Infrastructure</li>
              <li>Cybersecurity Specialist</li>
              <li>Distributed Backend Lead</li>
            </ul>
          </div>

          {/* Trust & Privacy */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold tracking-wider uppercase text-[#1D1D1F] dark:text-[#F8FAFC] font-mono">
              Trust & Security
            </h4>
            <ul className="space-y-2 text-sm text-[#7A7A7A] dark:text-[#94A3B8]">
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#0066CC] dark:text-[#C9D0D6]" />
                <span>Zero-Retention Resume Parser</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#0066CC] dark:text-[#C9D0D6]" />
                <span>Supabase AES-256 Encryption</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0066CC] dark:text-[#C9D0D6]" />
                <span>Deterministic Skill Gating</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-[#E0E0E0] dark:border-[#27272F] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A7A7A] dark:text-[#64748B]">
          <p>© {new Date().getFullYear()} PathFinder AI Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/auth" className="hover:text-[#0066CC] dark:hover:text-[#C9D0D6] transition-colors">
              Sign In
            </Link>
            <Link to="/onboarding" className="hover:text-[#0066CC] dark:hover:text-[#C9D0D6] transition-colors">
              Get Started
            </Link>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
