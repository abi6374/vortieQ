import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import ThemeToggle from '../ui/ThemeToggle'

/**
 * PathFinder sign-in / create-account screen. Split-panel design.
 * All styles are scoped under `.pfa` to avoid colliding with the rest of the app.
 */

const STYLES = `
.pfa { --violet:#0066cc; --violet-2:#0071e3; --violet-dark:#004fa3; --navy:#1d1d1f;
  --slate:#333333; --muted:#7a7a7a; --input-bd:#d3d4d5; --divider:#f0f0f0;
  --app-bd:#f0f0f0; --lav-circle:#dbeafc;
  min-height:100vh; position:relative; overflow:hidden; display:flex; align-items:center;
  justify-content:center; padding:clamp(16px,3vw,40px);
  background:
    radial-gradient(1100px 680px at 8% -8%, #e1edff 0%, rgba(225,237,255,0) 55%),
    radial-gradient(900px 560px at 112% 112%, #e8f1ff 0%, rgba(232,241,255,0) 52%),
    #f4f6fb;
  font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif; color:var(--navy); }
.pfa *{ box-sizing:border-box; }
/* Ambient drifting orbs for depth (disabled under reduced motion). */
.pfa::before, .pfa::after{ content:""; position:absolute; border-radius:50%; z-index:0;
  pointer-events:none; filter:blur(64px); opacity:.5; }
.pfa::before{ width:460px; height:460px; left:-100px; top:-140px;
  background:radial-gradient(circle,#b9d6ff 0%,rgba(185,214,255,0) 70%); animation:pfa-drift 22s ease-in-out infinite; }
.pfa::after{ width:420px; height:420px; right:-100px; bottom:-130px;
  background:radial-gradient(circle,#cbe1ff 0%,rgba(203,225,255,0) 70%); animation:pfa-drift 27s ease-in-out infinite reverse; }
@keyframes pfa-drift{ 0%,100%{ transform:translate(0,0); } 50%{ transform:translate(30px,-24px); } }
.pfa .app{ position:relative; z-index:1; width:100%; max-width:1120px;
  background:rgba(255,255,255,0.88); border:1px solid rgba(255,255,255,0.7);
  border-radius:22px;
  box-shadow:0 28px 70px -24px rgba(20,40,80,.30), 0 2px 6px rgba(20,40,80,.04), inset 0 1px 0 rgba(255,255,255,.7);
  -webkit-backdrop-filter:blur(30px) saturate(1.5); backdrop-filter:blur(30px) saturate(1.5);
  display:grid; grid-template-columns:44% 56%; grid-template-rows:740px; overflow:hidden; height:740px; min-height:740px; max-height:740px; }
.pfa .brand-panel{ position:relative; overflow:hidden; padding:40px 44px;
  background:linear-gradient(160deg,rgba(255,255,255,0.6) 0%,rgba(234,242,252,0.5) 100%);
  border-right:1px solid rgba(255,255,255,0.55); display:flex; flex-direction:column; height:740px; min-height:740px; max-height:740px; box-sizing:border-box; }

/* Subtle roadmap background styling */
.pfa .path-deco{ position:absolute; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; }
.pfa .path-deco .path-line{ stroke:#deecfb; stroke-width:2.5; stroke-dasharray:4 10; stroke-linecap:round; }
.pfa .path-deco .node-ring{ fill:#dbeafc; stroke:#cfe4fa; stroke-width:1.5; }
.pfa .path-deco .node-dest{ fill:#eaf2fc; stroke:#bcd8f6; stroke-width:2; }
.pfa .path-deco .node-dest-inner{ fill:#bcd8f6; }

.pfa .brand-inner{ position:relative; z-index:1; display:flex; flex-direction:column; justify-content:space-between; height:100%; }
.pfa .logo-row{ display:flex; align-items:center; gap:14px; margin-bottom:0; flex:none; }
.pfa .logo-mark{ width:48px; height:48px; border-radius:14px; flex:none;
  background:linear-gradient(160deg,var(--violet-2),var(--violet)); display:grid; place-items:center;
  box-shadow:0 6px 18px rgba(0,102,204,.28); }
.pfa .logo-name{ font-family:"Manrope",sans-serif; font-weight:800; font-size:clamp(24px,2.2vw,30px); letter-spacing:-.02em; }
.pfa .hero{ margin:0; padding:16px 0; display:flex; flex-direction:column; justify-content:center; }
.pfa .hero h1{ font-family:"Manrope",sans-serif; font-weight:800; font-size:clamp(26px,2.6vw,36px);
  line-height:1.14; letter-spacing:-.025em; margin:0 0 14px; text-wrap:balance; color:var(--navy); }
.pfa .hero p{ font-size:15px; line-height:1.55; color:var(--slate); margin:0; max-width:32ch; }
.pfa .privacy{ display:flex; align-items:center; justify-content:flex-start; gap:10px; color:var(--slate); font-size:13px; font-weight:500; flex:none; }
.pfa .privacy svg{ color:var(--violet); flex:none; }

.pfa .form-panel{ background:rgba(255,255,255,0.55); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px);
  padding:36px 48px;
  display:flex; flex-direction:column; align-items:center; justify-content:flex-start; height:740px; min-height:740px; max-height:740px; box-sizing:border-box; overflow:hidden; }
.pfa .form{ width:100%; max-width:400px; height:100%; display:flex; flex-direction:column; }
.pfa .form-tabs-header{ flex:none; width:100%; }
.pfa .form-body{ flex:1; display:flex; flex-direction:column; justify-content:center; width:100%; }
.pfa .tabs{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:2px; }
.pfa .tab{ background:none; border:none; cursor:pointer; padding:6px 4px 10px;
  font:600 16px/1 "Inter",sans-serif; color:var(--navy); position:relative; text-align:center; }
.pfa .tab.active{ color:var(--violet); }
.pfa .tab.active::after{ content:""; position:absolute; left:50%; transform:translateX(-50%); bottom:0;
  height:3px; width:100%; max-width:180px; border-radius:999px; background:var(--violet); }
.pfa .tab-help{ text-align:center; font-size:12px; color:var(--muted); line-height:1.3; margin:2px 0 0; min-height:1.8em; }
.pfa .tab-help.left{ visibility:hidden; }
.pfa .welcome{ text-align:center; margin:12px 0 16px; min-height:58px; display:flex; flex-direction:column; justify-content:center; }
.pfa .welcome h2{ font-family:"Manrope",sans-serif; font-weight:800; font-size:24px; line-height:1.2; letter-spacing:-.02em; margin:0 0 4px; }
.pfa .welcome p{ font-size:13.5px; line-height:1.4; color:var(--slate); margin:0; }
.pfa .field{ margin-bottom:11px; }
.pfa .field > label{ display:block; font-size:13.5px; font-weight:600; margin-bottom:5px; }
.pfa .input{ position:relative; display:flex; align-items:stretch; border:1.5px solid var(--input-bd);
  border-radius:10px; background:#fff; min-height:46px; transition:border-color .15s,box-shadow .15s; overflow:hidden; }
.pfa .input:focus-within{ border-color:var(--violet); box-shadow:0 0 0 3px rgba(0,102,204,.15); }
.pfa .input .lead{ position:absolute; left:12px; top:0; bottom:0; color:var(--muted); display:grid; place-items:center; pointer-events:none; z-index:1; }
.pfa .input input{ border:none; outline:none; background:transparent; flex:1; width:100%; min-width:0; align-self:stretch;
  padding:0 14px 0 36px; font:400 14.5px/1.2 "Inter",sans-serif; color:var(--navy); border-radius:8px; }
.pfa .input input::placeholder{ color:var(--muted); }
.pfa .input:has(.toggle) input{ padding-right:42px; }
.pfa .input input:-webkit-autofill,
.pfa .input input:-webkit-autofill:hover, 
.pfa .input input:-webkit-autofill:focus, 
.pfa .input input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
  -webkit-text-fill-color: var(--navy) !important;
  caret-color: var(--navy) !important;
  border-radius: 8px !important;
  transition: background-color 5000s ease-in-out 0s;
}
.pfa .input .toggle{ position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--muted); padding:6px;
  display:grid; place-items:center; border-radius:6px; z-index:1; }
.pfa .input .toggle:hover{ color:var(--slate); }
.pfa .utility{ display:flex; align-items:center; justify-content:space-between; margin:2px 0 14px; min-height:20px; }
.pfa .remember{ display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; font-size:13px; color:var(--slate); position:relative; }
.pfa .checkbox{ width:17px; height:17px; border-radius:5px; border:1.5px solid var(--input-bd); background:#fff;
  display:grid; place-items:center; color:#fff; transition:background .15s,border-color .15s; }
.pfa .remember input{ position:absolute; opacity:0; pointer-events:none; }
.pfa .remember input:checked + .checkbox{ background:var(--violet); border-color:var(--violet); }
.pfa .forgot{ color:var(--violet); font-size:13px; font-weight:600; text-decoration:none; background:none; border:none; cursor:pointer; }
.pfa .forgot:hover{ color:var(--violet-dark); text-decoration:underline; }
.pfa .btn{ width:100%; height:46px; border-radius:10px; border:none; cursor:pointer;
  font:700 15px/1 "Inter",sans-serif; display:inline-flex; align-items:center; justify-content:center; gap:9px;
  transition:background .15s,box-shadow .15s,transform .1s; }
.pfa .btn:disabled{ opacity:.6; cursor:not-allowed; }
.pfa .btn-primary{ background:linear-gradient(180deg,var(--violet-2),var(--violet)); color:#fff; box-shadow:0 8px 18px rgba(0,102,204,.24); }
.pfa .btn-primary:hover:not(:disabled){ background:linear-gradient(180deg,var(--violet),var(--violet-dark)); box-shadow:0 10px 22px rgba(0,102,204,.32); }
.pfa .btn-primary:active:not(:disabled){ transform:translateY(1px); }
.pfa .divider-row{ display:flex; align-items:center; gap:12px; margin:14px 0; }
.pfa .divider-row .line{ flex:1; height:1px; background:var(--divider); }
.pfa .divider-row .or{ font-size:11.5px; font-weight:600; letter-spacing:.1em; color:var(--muted); }
.pfa .btn-google{ background:#fff; color:var(--navy); border:1.5px solid var(--input-bd); font-weight:600; height:42px; font-size:13.5px; }
.pfa .btn-google:hover:not(:disabled){ background:#FBFCFE; border-color:#c6c6c7; }
.pfa .btn-github{ background:#181717; color:#fff; font-weight:600; margin-bottom:8px; height:42px; font-size:13.5px; box-shadow:0 3px 10px rgba(24,23,23,0.12); }
.pfa .btn-github:hover:not(:disabled){ background:#000000; }
.pfa .signup-foot{ text-align:center; margin-top:14px; font-size:13.5px; color:var(--slate); }
.pfa .signup-foot button{ color:var(--violet); font-weight:600; background:none; border:none; cursor:pointer; font-size:13.5px; }
.pfa .signup-foot button:hover{ color:var(--violet-dark); text-decoration:underline; }
.pfa .err{ margin-top:10px; text-align:center; color:#DC2626; font-size:13px; font-weight:500; }
.pfa .spin{ width:16px; height:16px; border:2px solid rgba(255,255,255,.5); border-top-color:#fff; border-radius:50%; animation:pfaspin .7s linear infinite; }
@keyframes pfaspin{ to{ transform:rotate(360deg); } }

/* Dark mode styles for AuthScreen */
html.dark .pfa {
  --navy: #F8FAFC;
  --slate: #CBD5E1;
  --muted: #A1A1AA;
  --input-bd: #27272F;
  --divider: #27272F;
  --app-bd: #27272F;
  --lav-circle: rgba(201, 208, 214, 0.12);
  background:
    radial-gradient(1100px 680px at 8% -8%, rgba(201,208,214,0.06) 0%, transparent 55%),
    radial-gradient(900px 560px at 112% 112%, rgba(24,24,29,0.5) 0%, transparent 52%),
    #09090B;
}
html.dark .pfa .app {
  background: rgba(18, 18, 22, 0.95);
  border: 1px solid #27272F;
  box-shadow: 0 28px 70px -24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06);
}
html.dark .pfa .brand-panel {
  background: linear-gradient(160deg, #18181D 0%, #121216 100%);
  border-right: 1px solid #27272F;
}
html.dark .pfa .form-panel {
  background: #121216;
}
html.dark .pfa .input {
  background: #0E0E12;
  border-color: #27272F;
}
html.dark .pfa .input input {
  color: #F8FAFC;
}
html.dark .pfa .input input:-webkit-autofill,
html.dark .pfa .input input:-webkit-autofill:hover, 
html.dark .pfa .input input:-webkit-autofill:focus, 
html.dark .pfa .input input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #0E0E12 inset !important;
  -webkit-text-fill-color: #F8FAFC !important;
  caret-color: #F8FAFC !important;
}
html.dark .pfa .btn-google {
  background: #18181D;
  color: #F8FAFC;
  border-color: #27272F;
}
html.dark .pfa .btn-google:hover:not(:disabled) {
  background: #202026;
  border-color: #C9D0D6;
}
html.dark .pfa .btn-github {
  background: #18181D;
  border: 1.5px solid #27272F;
}
html.dark .pfa .btn-github:hover:not(:disabled) {
  background: #202026;
  border-color: #C9D0D6;
}
html.dark .pfa .checkbox {
  background: #0E0E12;
  border-color: #27272F;
}
html.dark .pfa .logo-name {
  color: #F8FAFC;
}
html.dark .pfa .tab {
  color: #A1A1AA;
}
html.dark .pfa .tab.active {
  color: #C9D0D6;
}
html.dark .pfa .hero h1 {
  color: #F8FAFC;
}
html.dark .pfa .hero p {
  color: #A1A1AA;
}

/* Subtle dark mode roadmap styling */
html.dark .pfa .path-deco .path-line {
  stroke: rgba(201, 208, 214, 0.2);
  stroke-width: 2.5;
}
html.dark .pfa .path-deco .node-ring {
  fill: #18181D;
  stroke: rgba(201, 208, 214, 0.35);
  stroke-width: 1.5;
}
html.dark .pfa .path-deco .node-dest {
  fill: rgba(201, 208, 214, 0.15);
  stroke: rgba(201, 208, 214, 0.5);
  stroke-width: 2;
}
html.dark .pfa .path-deco .node-dest-inner {
  fill: #C9D0D6;
}

@media (max-width:900px){ .pfa .app{ grid-template-columns:1fr; min-height:0; height:auto; max-height:none; } .pfa .brand-panel{ border-right:none; border-bottom:1px solid var(--divider); padding:28px 24px; min-height:220px; } .pfa .hero{ padding:16px 0; } .pfa .form-panel{ padding:28px 20px; height:auto; } }
@media (prefers-reduced-motion:reduce){ .pfa *{ transition:none !important; } .pfa .spin{ animation:none; } }
`

export default function AuthScreen({ initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', title: '', message: '' }
  const { signIn, signUp, signInWithGoogle, signInWithGithub, oauthError } = useAuth()
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const isCreate = mode === 'create'

  // Requirement 1: When clicking Create Account (or switching tabs), all fields must always be empty
  const switchMode = (m) => {
    setMode(m)
    setError(null)
    setNotice(null)
    setFullName('')
    setEmail('')
    setPassword('')
  }

  const onField = (setter) => (e) => {
    setter(e.target.value)
    if (error) setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setIsLoading(true)

    try {
      if (isCreate) {
        // Email auth registration -> show top verification notice, redirect to Sign In with all fields empty
        const targetEmail = email.trim()
        await signUp(targetEmail, password, fullName.trim())

        // Reset all inputs
        setFullName('')
        setEmail('')
        setPassword('')

        // Redirect to Sign in tab
        setMode('signin')

        // Display prominent top verification notice
        setNotice({
          type: 'success',
          title: 'Verification email sent',
          message: `A verification link has been sent to ${targetEmail}. Please check your inbox (and spam folder) to verify your account, then sign in below.`,
        })
      } else {
        // If email is unverified on Sign in -> pop up error stating email is not verified
        try {
          await signIn(email.trim(), password)
        } catch (authErr) {
          const errMsg = (authErr?.message || '').toLowerCase()
          if (
            errMsg.includes('email not confirmed') ||
            errMsg.includes('not verified') ||
            errMsg.includes('email_not_confirmed') ||
            authErr?.code === 'email_not_confirmed'
          ) {
            setNotice({
              type: 'error',
              title: 'Email not verified',
              message: 'Your email address has not been verified yet. Please check your inbox and click the verification link before signing in.',
            })
            setIsLoading(false)
            return
          }
          throw authErr
        }

        // Check active learning path after successful sign-in
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: paths } = await supabase
              .from('learning_paths')
              .select('id')
              .eq('user_id', user.id)
              .limit(1)

            if (paths && paths.length > 0) {
              navigate('/dashboard')
              return
            }
          }
        } catch {
          // fallback to onboarding if path check fails
        }
        navigate('/onboarding')
      }
    } catch (err) {
      const msg = (err?.message || '').toLowerCase()
      if (
        msg.includes('email not confirmed') ||
        msg.includes('not verified') ||
        msg.includes('email_not_confirmed') ||
        err?.code === 'email_not_confirmed'
      ) {
        setNotice({
          type: 'error',
          title: 'Email not verified',
          message: 'Your email address has not been verified yet. Please check your inbox and click the verification link before signing in.',
        })
      } else {
        setError(err?.message || 'Authentication failed. Please check your credentials.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setNotice(null)
    setIsLoading(true)
    try {
      const res = await signInWithGoogle()
      if (res?.error) {
        setError(res.error.message || 'Google sign-in failed. Please ensure the Google provider is enabled in Supabase.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Google OAuth error:', err)
      setError(err?.message || 'Google sign-in failed. Please ensure the Google provider is enabled in Supabase.')
      setIsLoading(false)
    }
  }

  const handleGithubSignIn = async () => {
    setError(null)
    setNotice(null)
    setIsLoading(true)
    try {
      const res = await signInWithGithub()
      if (res?.error) {
        setError(res.error.message || 'GitHub sign-in failed. Please ensure the GitHub provider is enabled in Supabase.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('GitHub OAuth error:', err)
      setError(err?.message || 'GitHub sign-in failed. Please ensure the GitHub provider is enabled in Supabase.')
      setIsLoading(false)
    }
  }

  return (
    <div className="pfa relative">
      <style>{STYLES}</style>

      {/* Top-Right Theme Toggle */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Top Pop-Up Notice Banner (Dead-center horizontally at the top of the webpage above the container) */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -24, x: '-50%', scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -16, x: '-50%', scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ left: '50%' }}
            className={`fixed top-4 sm:top-6 z-50 w-[92%] max-w-lg p-4 sm:p-4.5 rounded-2xl shadow-2xl border flex items-start gap-3.5 backdrop-blur-xl transition-colors ${
              notice.type === 'success'
                ? 'bg-[#F0FDF4]/95 dark:bg-[#062414]/95 border-[#86EFAC] dark:border-[#166534] text-[#14532D] dark:text-[#BBF7D0] shadow-emerald-900/10 dark:shadow-black/40'
                : 'bg-[#FEF2F2]/95 dark:bg-[#280B0E]/95 border-[#FECACA] dark:border-[#991B1B] text-[#7F1D1D] dark:text-[#FECDD3] shadow-rose-900/10 dark:shadow-black/40'
            }`}
          >
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none mt-0.5 shadow-xs ${
                notice.type === 'success'
                  ? 'bg-[#DCFCE7] dark:bg-[#14532D] text-[#16A34A] dark:text-[#4ADE80] border border-[#BBF7D0] dark:border-[#15803D]'
                  : 'bg-[#FEE2E2] dark:bg-[#7F1D1D] text-[#DC2626] dark:text-[#F87171] border border-[#FECDD3] dark:border-[#B91C1C]'
              }`}
            >
              {notice.type === 'success' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
                  <polyline points="22,6 12,13 2,6" />
                  <polyline points="16 19 19 22 23 18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </span>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="font-['Manrope'] font-bold text-sm sm:text-[15px] leading-snug">
                {notice.title}
              </h4>
              <p className="text-xs sm:text-[13px] mt-1 opacity-90 leading-relaxed font-normal">
                {notice.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer flex-none"
              aria-label="Dismiss notification"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="app"
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* LEFT: Subtle Connected Milestone Roadmap & Clean Hero Branding */}
        <section className="brand-panel">
          <svg className="path-deco" viewBox="0 0 500 740" fill="none" preserveAspectRatio="none" aria-hidden="true">
            {/* Connected subtle roadmap path line */}
            <path
              d="M 440 60 C 470 200, 320 260, 320 380 C 320 500, 140 550, 220 670"
              className="path-line"
            />

            {/* Milestone Node 1 (Start - 440, 60) */}
            <circle cx="440" cy="60" r="9" className="node-ring" />

            {/* Milestone Node 2 (391, 228) */}
            <circle cx="391" cy="228" r="8" className="node-ring" />

            {/* Milestone Node 3 (Mid Waypoint - 320, 380) */}
            <circle cx="320" cy="380" r="9" className="node-ring" />

            {/* Milestone Node 4 (240, 525) */}
            <circle cx="240" cy="525" r="8" className="node-ring" />

            {/* Milestone Node 5 (Destination Target - 220, 670) */}
            <circle cx="220" cy="670" r="14" className="node-dest" />
            <circle cx="220" cy="670" r="6" className="node-dest-inner" />
          </svg>

          <div className="brand-inner">
            <div className="logo-row">
              <span className="logo-mark" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <polygon points="16 8 10.5 10.5 8 16 13.5 13.5" fill="#fff" stroke="none" />
                </svg>
              </span>
              <span className="logo-name">PathFinder</span>
            </div>

            {/* Vertically centered Hero on left panel */}
            <div className="hero">
              <h1>
                Build the path to<br />your next goal.
              </h1>
              <p>
                Discover your strengths, close skill gaps, and follow a learning plan designed around you.
              </p>
            </div>

            <div className="privacy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Your profile and learning data stay private.
            </div>
          </div>
        </section>

        {/* RIGHT: Interactive Authentication Form */}
        <section className="form-panel">
          <div className="form">
            <div className="form-tabs-header">
              <div className="tabs">
                <button type="button" className={`tab ${!isCreate ? 'active' : ''}`} onClick={() => switchMode('signin')}>Sign in</button>
                <button type="button" className={`tab ${isCreate ? 'active' : ''}`} onClick={() => switchMode('create')}>Create account</button>
              </div>
              <div className="tabs" style={{ marginBottom: 0 }}>
                <p className="tab-help left">&nbsp;</p>
                <p className="tab-help">New here? Set up your learner profile in minutes.</p>
              </div>
            </div>

            <div className="form-body">
              <div className="welcome">
                <h2>{isCreate ? 'Create your account' : 'Welcome back'}</h2>
                <p>{isCreate ? 'Set up your learner profile in minutes.' : 'Sign in to continue your learning journey.'}</p>
              </div>

              <form onSubmit={handleSubmit}>
                {isCreate && (
                  <div className="field">
                    <label htmlFor="pfa-name">Full name</label>
                    <div className="input">
                      <span className="lead" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span>
                      <input id="pfa-name" type="text" required value={fullName} onChange={onField(setFullName)} placeholder="HackerEarth Team ?" autoComplete="name" />
                    </div>
                  </div>
                )}

                <div className="field">
                  <label htmlFor="pfa-email">Email address</label>
                  <div className="input">
                    <span className="lead" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m3 6 9 7 9-7" /></svg></span>
                    <input id="pfa-email" type="email" required value={email} onChange={onField(setEmail)} placeholder="you@example.com" autoComplete="email" />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="pfa-pw">Password</label>
                  <div className="input">
                    <span className="lead" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></span>
                    <input id="pfa-pw" type={showPw ? 'text' : 'password'} required minLength={6} value={password} onChange={onField(setPassword)} placeholder="Enter your password" autoComplete={isCreate ? 'new-password' : 'current-password'} />
                    <button type="button" className="toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                      {showPw ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="utility">
                  <label className="remember">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    <span className="checkbox" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                    Remember me
                  </label>
                  <button type="button" className="forgot">Forgot password?</button>
                </div>

                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading && <span className="spin" />}
                  {isCreate ? 'Create account' : 'Sign in'}
                </button>

                <div className="divider-row"><span className="line" /><span className="or">OR</span><span className="line" /></div>

                <button type="button" className="btn btn-github" onClick={handleGithubSignIn} disabled={isLoading}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  Continue with GitHub
                </button>

                <button type="button" className="btn btn-google" onClick={handleGoogleSignIn} disabled={isLoading}>
                  <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
                    <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z" />
                    <path fill="#FBBC05" d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z" />
                    <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7C13.4 14.7 18.2 10.8 24 10.8z" />
                  </svg>
                  Continue with Google
                </button>

                <p className="signup-foot">
                  {isCreate ? 'Already have an account? ' : 'New to PathFinder? '}
                  <button type="button" onClick={() => switchMode(isCreate ? 'signin' : 'create')}>
                    {isCreate ? 'Sign in' : 'Create account'}
                  </button>
                </p>

                {(oauthError || error) && <p className="err">{oauthError || error}</p>}
              </form>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  )
}
