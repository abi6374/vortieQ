import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * PathFinder sign-in / create-account screen. Split-panel violet design.
 * All styles are scoped under `.pfa` to avoid colliding with the rest of the app.
 */

const STYLES = `
.pfa { --violet:#5B36E9; --violet-2:#6236EF; --violet-dark:#4826C9; --navy:#0E1B38;
  --slate:#52617D; --muted:#74819A; --input-bd:#C9D1DF; --divider:#E6EAF2;
  --app-bd:#E1E6F0; --lav-circle:#EEE9FF;
  min-height:100vh; background:#F5F7FC; display:flex; align-items:center;
  justify-content:center; padding:clamp(16px,3vw,48px);
  font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif; color:var(--navy); }
.pfa *{ box-sizing:border-box; }
.pfa .app{ width:100%; max-width:1400px; background:#fff; border:1px solid var(--app-bd);
  border-radius:20px; box-shadow:0 14px 38px rgba(25,40,75,.12);
  display:grid; grid-template-columns:43% 57%; overflow:hidden; min-height:760px; }
.pfa .brand-panel{ position:relative; overflow:hidden; padding:clamp(36px,4vw,60px);
  background:linear-gradient(160deg,#fff 0%,#FBFAFF 55%,#F7F5FF 100%);
  border-right:1px solid var(--divider); display:flex; flex-direction:column; }
.pfa .path-deco{ position:absolute; inset:0; z-index:0; pointer-events:none; }
.pfa .brand-inner{ position:relative; z-index:1; display:flex; flex-direction:column; height:100%; }
.pfa .logo-row{ display:flex; align-items:center; gap:16px; margin-bottom:clamp(28px,5vh,56px); }
.pfa .logo-mark{ width:60px; height:60px; border-radius:16px; flex:none;
  background:linear-gradient(160deg,var(--violet-2),var(--violet)); display:grid; place-items:center;
  box-shadow:0 8px 20px rgba(91,54,233,.32); }
.pfa .logo-name{ font-family:"Manrope",sans-serif; font-weight:800; font-size:clamp(26px,2.4vw,36px); letter-spacing:-.02em; }
.pfa .hero{ margin-top:auto; }
.pfa .hero h1{ font-family:"Manrope",sans-serif; font-weight:800; font-size:clamp(32px,3.6vw,50px);
  line-height:1.08; letter-spacing:-.03em; margin:0 0 22px; text-wrap:balance; }
.pfa .hero p{ font-size:clamp(16px,1.5vw,21px); line-height:1.55; color:var(--slate); margin:0 0 clamp(28px,4vh,44px); max-width:30ch; }
.pfa .journey{ display:flex; flex-direction:column; gap:clamp(18px,3vh,30px); margin-bottom:auto; }
.pfa .j-item{ display:flex; align-items:center; gap:18px; }
.pfa .j-icon{ width:64px; height:64px; border-radius:50%; flex:none; background:var(--lav-circle);
  color:var(--violet); display:grid; place-items:center; }
.pfa .j-text{ font-size:clamp(16px,1.5vw,20px); font-weight:600; line-height:1.3; }
.pfa .privacy{ display:flex; align-items:center; gap:11px; margin-top:clamp(28px,4vh,44px); color:var(--slate); font-size:17px; }
.pfa .privacy svg{ color:var(--violet); flex:none; }
.pfa .form-panel{ background:#fff; padding:clamp(40px,5vw,72px) clamp(28px,5vw,80px);
  display:flex; flex-direction:column; align-items:center; }
.pfa .form{ width:100%; max-width:500px; }
.pfa .tabs{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:6px; }
.pfa .tab{ background:none; border:none; cursor:pointer; padding:8px 4px 14px;
  font:600 clamp(18px,1.6vw,21px)/1 "Inter",sans-serif; color:var(--navy); position:relative; text-align:center; }
.pfa .tab.active{ color:var(--violet); }
.pfa .tab.active::after{ content:""; position:absolute; left:50%; transform:translateX(-50%); bottom:0;
  height:4px; width:100%; max-width:235px; border-radius:999px; background:var(--violet); }
.pfa .tab-help{ text-align:center; font-size:13px; color:var(--muted); line-height:1.4; margin:2px 0 0; min-height:2.6em; }
.pfa .tab-help.left{ visibility:hidden; }
.pfa .welcome{ text-align:center; margin:clamp(18px,3vh,26px) 0 clamp(28px,4vh,40px); }
.pfa .welcome h2{ font-family:"Manrope",sans-serif; font-weight:800; font-size:clamp(30px,3.2vw,44px); letter-spacing:-.025em; margin:0 0 10px; }
.pfa .welcome p{ font-size:clamp(16px,1.5vw,20px); color:var(--slate); margin:0; }
.pfa .field{ margin-bottom:20px; }
.pfa .field > label{ display:block; font-size:16px; font-weight:600; margin-bottom:9px; }
.pfa .input{ position:relative; display:flex; align-items:center; border:1.5px solid var(--input-bd);
  border-radius:12px; background:#fff; height:62px; padding:0 14px; gap:11px; transition:border-color .15s,box-shadow .15s; }
.pfa .input:focus-within{ border-color:var(--violet); box-shadow:0 0 0 4px rgba(91,54,233,.18); }
.pfa .input .lead{ color:var(--muted); flex:none; display:grid; place-items:center; }
.pfa .input input{ border:none; outline:none; background:none; flex:1; min-width:0;
  font:400 16.5px/1 "Inter",sans-serif; color:var(--navy); }
.pfa .input input::placeholder{ color:var(--muted); }
.pfa .input .toggle{ background:none; border:none; cursor:pointer; color:var(--muted); padding:6px;
  display:grid; place-items:center; border-radius:8px; }
.pfa .input .toggle:hover{ color:var(--slate); }
.pfa .utility{ display:flex; align-items:center; justify-content:space-between; margin:4px 0 26px; }
.pfa .remember{ display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; font-size:15.5px; color:var(--slate); position:relative; }
.pfa .checkbox{ width:20px; height:20px; border-radius:6px; border:1.5px solid var(--input-bd); background:#fff;
  display:grid; place-items:center; color:#fff; transition:background .15s,border-color .15s; }
.pfa .remember input{ position:absolute; opacity:0; pointer-events:none; }
.pfa .remember input:checked + .checkbox{ background:var(--violet); border-color:var(--violet); }
.pfa .forgot{ color:var(--violet); font-size:15.5px; font-weight:600; text-decoration:none; background:none; border:none; cursor:pointer; }
.pfa .forgot:hover{ color:var(--violet-dark); text-decoration:underline; }
.pfa .btn{ width:100%; height:62px; border-radius:12px; border:none; cursor:pointer;
  font:700 19px/1 "Inter",sans-serif; display:inline-flex; align-items:center; justify-content:center; gap:11px;
  transition:background .15s,box-shadow .15s,transform .1s; }
.pfa .btn:disabled{ opacity:.6; cursor:not-allowed; }
.pfa .btn-primary{ background:linear-gradient(180deg,var(--violet-2),var(--violet)); color:#fff; box-shadow:0 10px 24px rgba(91,54,233,.30); }
.pfa .btn-primary:hover:not(:disabled){ background:linear-gradient(180deg,var(--violet),var(--violet-dark)); box-shadow:0 12px 28px rgba(91,54,233,.38); }
.pfa .btn-primary:active:not(:disabled){ transform:translateY(1px); }
.pfa .divider-row{ display:flex; align-items:center; gap:16px; margin:26px 0; }
.pfa .divider-row .line{ flex:1; height:1px; background:var(--divider); }
.pfa .divider-row .or{ font-size:12.5px; font-weight:600; letter-spacing:.1em; color:var(--muted); }
.pfa .btn-google{ background:#fff; color:var(--navy); border:1.5px solid var(--input-bd); font-weight:600; }
.pfa .btn-google:hover:not(:disabled){ background:#FBFCFE; border-color:#B9C2D4; }
.pfa .signup-foot{ text-align:center; margin-top:26px; font-size:17px; color:var(--slate); }
.pfa .signup-foot button{ color:var(--violet); font-weight:600; background:none; border:none; cursor:pointer; font-size:17px; }
.pfa .signup-foot button:hover{ color:var(--violet-dark); text-decoration:underline; }
.pfa .err{ margin-top:16px; text-align:center; color:#DC2626; font-size:14.5px; font-weight:500; }
.pfa .spin{ width:18px; height:18px; border:2px solid rgba(255,255,255,.5); border-top-color:#fff; border-radius:50%; animation:pfaspin .7s linear infinite; }
@keyframes pfaspin{ to{ transform:rotate(360deg); } }
@media (max-width:900px){ .pfa .app{ grid-template-columns:1fr; min-height:0; } .pfa .brand-panel{ border-right:none; border-bottom:1px solid var(--divider); } .pfa .hero{ margin-top:28px; } }
@media (prefers-reduced-motion:reduce){ .pfa *{ transition:none !important; } .pfa .spin{ animation:none; } }
`

export default function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'create'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const isCreate = mode === 'create'
  const switchMode = (m) => { setMode(m); setError(null) }
  const onField = (setter) => (e) => { setter(e.target.value); if (error) setError(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (isCreate) {
        await signUp(email, password, fullName)
        navigate('/onboarding')
      } else {
        await signIn(email, password)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await signInWithGoogle() // redirects away on success
    } catch (err) {
      setError('Google sign-in isn’t available yet. Please use email.')
      setIsLoading(false)
    }
  }

  return (
    <div className="pfa">
      <style>{STYLES}</style>
      <div className="app">
        {/* LEFT */}
        <section className="brand-panel">
          <svg className="path-deco" viewBox="0 0 600 850" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M520 40 C 560 200, 300 260, 340 420 S 120 560, 240 760" stroke="#E4DEFB" strokeWidth="2.5" strokeDasharray="3 12" strokeLinecap="round" />
            <circle cx="520" cy="40" r="9" fill="#EEE9FF" stroke="#D9CFFA" strokeWidth="2" />
            <circle cx="336" cy="300" r="9" fill="#EEE9FF" stroke="#D9CFFA" strokeWidth="2" />
            <circle cx="300" cy="470" r="9" fill="#EEE9FF" stroke="#D9CFFA" strokeWidth="2" />
            <circle cx="240" cy="760" r="14" fill="#F5F1FF" stroke="#C9BCF6" strokeWidth="2" />
            <path d="M240 760 v-20 h13 l-4 6 4 6 h-13" fill="#C9BCF6" />
          </svg>
          <div className="brand-inner">
            <div className="logo-row">
              <span className="logo-mark" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polygon points="16 8 10.5 10.5 8 16 13.5 13.5" fill="#fff" stroke="none" /></svg>
              </span>
              <span className="logo-name">PathFinder</span>
            </div>
            <div className="hero">
              <h1>Build the path to<br />your next goal.</h1>
              <p>Discover your strengths, close skill gaps, and follow a learning plan designed around you.</p>
            </div>
            <div className="journey">
              <div className="j-item">
                <span className="j-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></svg></span>
                <span className="j-text">Upload your resume</span>
              </div>
              <div className="j-item">
                <span className="j-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16v-5" /><path d="M12 16V8" /><path d="M17 16v-9" /></svg></span>
                <span className="j-text">Assess your skills</span>
              </div>
              <div className="j-item">
                <span className="j-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="2.4" /><circle cx="18" cy="6" r="2.4" /><path d="M8.4 18C14 17 15.6 8 16.5 8" /><path d="M18 3v3M16.5 4.5h3" /></svg></span>
                <span className="j-text">Get your personal<br />learning path</span>
              </div>
            </div>
            <div className="privacy">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
              Your profile and learning data stay private.
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="form-panel">
          <div className="form">
            <div className="tabs">
              <button type="button" className={`tab ${!isCreate ? 'active' : ''}`} onClick={() => switchMode('signin')}>Sign in</button>
              <button type="button" className={`tab ${isCreate ? 'active' : ''}`} onClick={() => switchMode('create')}>Create account</button>
            </div>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <p className="tab-help left">&nbsp;</p>
              <p className="tab-help">New here? Set up your learner profile in minutes.</p>
            </div>

            <div className="welcome">
              <h2>{isCreate ? 'Create your account' : 'Welcome back'}</h2>
              <p>{isCreate ? 'Set up your learner profile in minutes.' : 'Sign in to continue your learning journey.'}</p>
            </div>

            <form onSubmit={handleSubmit}>
              {isCreate && (
                <div className="field">
                  <label htmlFor="pfa-name">Full name</label>
                  <div className="input">
                    <span className="lead" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span>
                    <input id="pfa-name" type="text" required value={fullName} onChange={onField(setFullName)} placeholder="Alex Smith" autoComplete="name" />
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="pfa-email">Email address</label>
                <div className="input">
                  <span className="lead" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m3 6 9 7 9-7" /></svg></span>
                  <input id="pfa-email" type="email" required value={email} onChange={onField(setEmail)} placeholder="you@example.com" autoComplete="email" />
                </div>
              </div>

              <div className="field">
                <label htmlFor="pfa-pw">Password</label>
                <div className="input">
                  <span className="lead" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></span>
                  <input id="pfa-pw" type={showPw ? 'text' : 'password'} required minLength={6} value={password} onChange={onField(setPassword)} placeholder="Enter your password" autoComplete={isCreate ? 'new-password' : 'current-password'} />
                  <button type="button" className="toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 3.19" /><path d="M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 4.3-1.1" /><path d="m2 2 20 20" /></svg>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>}
                  </button>
                </div>
              </div>

              <div className="utility">
                <label className="remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span className="checkbox" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                  Remember me
                </label>
                <button type="button" className="forgot">Forgot password?</button>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading && <span className="spin" />}
                {isCreate ? 'Create account' : 'Sign in'}
              </button>

              <div className="divider-row"><span className="line" /><span className="or">OR</span><span className="line" /></div>

              <button type="button" className="btn btn-google" onClick={handleGoogle} disabled={isLoading}>
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
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

              {error && <p className="err">{error}</p>}
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
