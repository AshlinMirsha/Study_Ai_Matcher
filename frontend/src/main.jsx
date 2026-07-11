import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell, BookOpen, Bot, Check, ChevronRight, Clock, Flame, GraduationCap,
  LayoutDashboard, LogOut, MessageSquare, Moon, Plus, RefreshCw, Search,
  Send, Sparkles, Sun, Trophy, UserRound, UsersRound, Video, PhoneOff,
  Zap, Target, Users, TrendingUp, Play, Pause, RotateCcw, Coffee
} from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/* ─── Storage ─────────────────────────────────────────────────── */
const storage = {
  get access()  { return localStorage.getItem('sam_access'); },
  get refresh() { return localStorage.getItem('sam_refresh'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('sam_user') || 'null'); } catch { return null; }
  },
  get theme() { return localStorage.getItem('sam_theme') || 'dark'; },
  setAuth(data) {
    localStorage.setItem('sam_access',  data.access);
    localStorage.setItem('sam_refresh', data.refresh);
    localStorage.setItem('sam_user',    JSON.stringify(data.user));
  },
  setTheme(t) { localStorage.setItem('sam_theme', t); },
  clear() {
    ['sam_access','sam_refresh','sam_user'].forEach(k => localStorage.removeItem(k));
  }
};

/* ─── HTTP helper ─────────────────────────────────────────────── */
async function request(path, options = {}, retry = true) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };
  if (storage.access) headers.Authorization = `Bearer ${storage.access}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Cannot connect to the server. Make sure the backend is running.');
  }

  if (res.status === 401 && retry && storage.refresh) {
    try {
      const r = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: storage.refresh })
      });
      if (r.ok) {
        const d = await r.json();
        localStorage.setItem('sam_access', d.access);
        return request(path, options, false);
      }
    } catch { /* refresh failed – fall through */ }
    storage.clear();
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }

  if (!res.ok) {
    let msg = '';
    if (data) {
      msg = data.detail
        || data.non_field_errors?.join(' ')
        || (typeof data === 'object' ? Object.entries(data).map(([k,v]) => `${k}: ${[].concat(v).join(', ')}`).join('; ') : String(data));
    }
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return data;
}

const list = (path) => request(path).then(d => d?.results || d || []);

/* ─── API surface ─────────────────────────────────────────────── */
const api = {
  login:              (p) => request('/api/auth/token/',          { method:'POST', body:JSON.stringify(p) }),
  register:           (p) => request('/api/auth/register/',       { method:'POST', body:JSON.stringify(p) }),
  me:                 ()  => request('/api/auth/me/'),
  profile:            ()  => request('/api/profiles/me/'),
  updateProfile:      (p) => request('/api/profiles/me/',         { method:'PATCH', body:JSON.stringify(p) }),
  students:           ()  => list('/api/profiles/students/'),
  subjects:           ()  => list('/api/profiles/subjects/'),
  createSubject:      (n) => request('/api/profiles/subjects/',   { method:'POST', body:JSON.stringify({ name:n }) }),
  availability:       ()  => list('/api/profiles/availability/'),
  createAvailability: (p) => request('/api/profiles/availability/',{ method:'POST', body:JSON.stringify(p) }),
  dashboard:          ()  => request('/api/progress/dashboard/'),
  leaderboard:        ()  => list('/api/progress/leaderboard/'),
  logs:               ()  => list('/api/progress/logs/'),
  createLog:          (p) => request('/api/progress/logs/',       { method:'POST', body:JSON.stringify(p) }),
  topics:             ()  => list('/api/progress/topics/'),
  createTopic:        (p) => request('/api/progress/topics/',     { method:'POST', body:JSON.stringify(p) }),
  findMatches:        ()  => request('/api/matching/find/'),
  matches:            ()  => list('/api/matching/my-matches/'),
  respondMatch:       (id,a)=> request(`/api/matching/${id}/respond/`,{ method:'POST', body:JSON.stringify({ action:a }) }),
  conversations:      ()  => list('/api/chat/conversations/'),
  startConversation:  (pid)=> request('/api/chat/conversations/start/',{ method:'POST', body:JSON.stringify({ partner_id:pid }) }),
  messages:           (id) => list(`/api/chat/conversations/${id}/messages/`),
  sendMessage:        (id,c)=> request(`/api/chat/conversations/${id}/messages/send/`,{ method:'POST', body:JSON.stringify({ content:c, message_type:'text' }) }),
  groups:             ()  => list('/api/groups/'),
  myGroups:           ()  => list('/api/groups/my-groups/'),
  createGroup:        (p) => request('/api/groups/',              { method:'POST', body:JSON.stringify(p) }),
  joinGroup:          (id) => request(`/api/groups/${id}/join/`,  { method:'POST' }),
  leaveGroup:         (id) => request(`/api/groups/${id}/leave/`, { method:'POST' }),
  suggestions:        ()  => list('/api/ai/suggestions/'),
  generateSuggestions:()  => request('/api/ai/suggestions/generate/', { method:'POST' }),
  chatbotHistory:     ()  => list('/api/ai/chatbot/history/'),
  askBot:             (m) => request('/api/ai/chatbot/ask/',      { method:'POST', body:JSON.stringify({ message:m }) }),
  quizzes:            ()  => list('/api/ai/quizzes/'),
  quizDetail:         (id)=> request(`/api/ai/quizzes/${id}/`),
  generateQuiz:       (p) => request('/api/ai/quizzes/generate/', { method:'POST', body:JSON.stringify(p) }),
  generateQuizFromFile:(fd)=> request('/api/ai/quizzes/generate-from-file/', { method:'POST', body:fd }),
  submitQuiz:         (id,p)=> request(`/api/ai/quizzes/${id}/submit/`, { method:'POST', body:JSON.stringify(p) }),
  notifications:      ()  => list('/api/notifications/'),
  unreadCount:        ()  => request('/api/notifications/unread-count/'),
  markAllRead:        ()  => request('/api/notifications/mark-all-read/', { method:'POST' }),
  schedules:          ()  => list('/api/progress/schedules/'),
  createSchedule:     (p) => request('/api/progress/schedules/', { method:'POST', body:JSON.stringify(p) }),
};

/* ─── Hooks ───────────────────────────────────────────────────── */
function useLoad(loader, deps = []) {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await loader()); } catch (e) { setError(e.message); }
    setLoading(false);
  }, deps); // eslint-disable-line
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

/* ─── Small components ─────────────────────────────────────────── */
function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Status({ error, children }) {
  if (error)    return <div className="status error">{error}</div>;
  if (children) return <div className="status">{children}</div>;
  return null;
}

function List({ loading, error, items, empty, children }) {
  if (loading) return (
    <div className="list">
      {[1,2,3].map(i => <div key={i} className="compact-row"><div className="skeleton" style={{height:12,width:'60%'}}/><div className="skeleton" style={{height:10,width:'40%',marginTop:4}}/></div>)}
    </div>
  );
  if (error) return <div className="status error">{error}</div>;
  if (!items || items.length === 0) return <div className="empty">{empty}</div>;
  return <div className="list">{items.map((item, i) => <React.Fragment key={item.id ?? item.rank ?? i}>{children(item)}</React.Fragment>)}</div>;
}

function CompactRow({ title, meta }) {
  return <div className="compact-row"><strong>{title}</strong><small>{meta}</small></div>;
}

function MultiSelect({ options, value, onChange }) {
  const selected = new Set(value.map(Number));
  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange([...next]);
  };
  return (
    <div className="option-grid">
      {options.map(o => (
        <button type="button" key={o.id} className={selected.has(o.id) ? 'selected' : ''} onClick={() => toggle(o.id)}>
          {o.name}
        </button>
      ))}
    </div>
  );
}

function SubjectSelect({ subjects, value, onChange, required = false }) {
  return (
    <Field label="Subject">
      <select value={value} onChange={e => onChange(e.target.value)} required={required}>
        <option value="">{required ? 'Choose subject' : 'General'}</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </Field>
  );
}

/* ─── Auth Screen ─────────────────────────────────────────────── */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email:'', password:'', password2:'', name:'', college:'', department:'', year_of_study:1 });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'register') await api.register(form);
      const auth = await api.login({ email: form.email, password: form.password });
      storage.setAuth(auth);
      onAuth(auth.user);
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-mark"><GraduationCap size={28} /><span>Study AI Matcher</span></div>
        <p className="auth-subtitle">Your AI-powered study partner platform</p>

        <div className="auth-social-proof">
          <span className="auth-social-proof-dot" />
          1,200+ students already learning smarter
        </div>

        <div className="segmented">
          <button className={mode==='login'?'active':''} onClick={() => setMode('login')}>Sign In</button>
          <button className={mode==='register'?'active':''} onClick={() => setMode('register')}>Register</button>
        </div>

        <form onSubmit={submit} className="form-grid">
          {mode === 'register' && <>
            <Field label="Full name"><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Your full name" required /></Field>
            <Field label="College"><input value={form.college} onChange={e=>set('college',e.target.value)} placeholder="Your institution" required /></Field>
            <Field label="Department"><input value={form.department} onChange={e=>set('department',e.target.value)} placeholder="e.g. Computer Science" required /></Field>
            <Field label="Year of study">
              <select value={form.year_of_study} onChange={e=>set('year_of_study',Number(e.target.value))}>
                <option value={1}>1st Year</option><option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option><option value={4}>4th Year</option>
                <option value={5}>Postgraduate</option>
              </select>
            </Field>
          </>}
          <Field label="Email"><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@college.edu" required /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="••••••••" required /></Field>
          {mode==='register' && <Field label="Confirm password"><input type="password" value={form.password2} onChange={e=>set('password2',e.target.value)} placeholder="••••••••" required /></Field>}
          <Status error={error} />
          <button className="primary full" disabled={busy}>
            {busy ? 'Please wait…' : mode==='login' ? '→ Enter Workspace' : '→ Create Account'}
          </button>
        </form>
      </section>
    </main>
  );
}

/* ─── Nav config ──────────────────────────────────────────────── */
const NAV = [
  ['dashboard',     LayoutDashboard, 'Dashboard'],
  ['profile',       UserRound,       'Profile'],
  ['matching',      Sparkles,        'Matching'],
  ['chat',          MessageSquare,   'Chat'],
  ['groups',        UsersRound,      'Groups'],
  ['progress',      Trophy,          'Progress'],
  ['ai',            Bot,             'AI Tools'],
  ['notifications', Bell,            'Notifications'],
];

/* ─── App Shell ───────────────────────────────────────────────── */
function App() {
  const [user,   setUser]   = useState(storage.user);
  const [page,   setPage]   = useState('dashboard');
  const [theme,  setTheme]  = useState(storage.theme);
  const [unread, setUnread] = useState(0);
  const [navigate, setNavigate] = useState(null); // for quick-action cross-page nav

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Poll unread count every 30s
  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      try { const d = await api.unreadCount(); setUnread(d?.unread_count ?? 0); } catch {}
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [user]);

  // Handle cross-page navigation requests from child components
  useEffect(() => {
    if (navigate) { setPage(navigate); setNavigate(null); }
  }, [navigate]);

  if (!user) return <AuthScreen onAuth={setUser} />;

  const logout = () => { storage.clear(); setUser(null); };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next); storage.setTheme(next);
  };

  const goTo = (p) => setPage(p);

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="brand-mark"><GraduationCap size={24} /><span>Study AI</span></div>
        <nav>
          {NAV.map(([id, Icon, label]) => (
            <div key={id} className="nav-item-wrap">
              <button
                className={page===id ? 'active' : ''}
                onClick={() => goTo(id)}
              >
                <Icon size={17} />{label}
              </button>
              {id==='notifications' && unread>0 && (
                <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>
              )}
            </div>
          ))}
        </nav>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme==='dark' ? <Sun size={15}/> : <Moon size={15}/>}
          {theme==='dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button className="logout" onClick={logout}><LogOut size={16}/>Logout</button>
      </aside>

      {/* Main workspace */}
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>{user.name || user.email}</h1>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="ghost" onClick={toggleTheme} title="Toggle theme">
              {theme==='dark' ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
          </div>
        </header>

        <div className="page-section" key={page}>
          {page==='dashboard'     && <Dashboard     goTo={goTo} />}
          {page==='profile'       && <Profile />}
          {page==='matching'      && <Matching />}
          {page==='chat'          && <Chat />}
          {page==='groups'        && <Groups />}
          {page==='progress'      && <Progress />}
          {page==='ai'            && <AiTools />}
          {page==='notifications' && <Notifications />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {NAV.slice(0, 5).map(([id, Icon, label]) => (
          <button key={id} className={`mobile-nav-btn ${page===id?'active':''}`} onClick={() => goTo(id)}>
            <Icon size={20} />
            <span>{label}</span>
            {id==='notifications' && unread>0 && <span className="nav-badge">{unread}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────── */
function Dashboard({ goTo }) {
  const dash    = useLoad(api.dashboard);
  const matches = useLoad(api.matches);
  const data    = dash.data || {};
  const maxHrs  = Math.max(1, ...(data.weekly_hours || []).map(d => d.hours));

  const metrics = [
    { icon: <Clock size={20}/>,     label:'Total Hours',    value: data.total_study_hours ?? '–',  sub: 'all time' },
    { icon: <BookOpen size={20}/>,  label:'Topics Done',    value: data.topics_completed  ?? '–',  sub: 'completed' },
    { icon: <Flame size={20}/>,     label:'Current Streak', value: data.current_streak    ?? '–',  sub: `best: ${data.longest_streak ?? 0}d` },
    { icon: <Trophy size={20}/>,    label:'Top Match',      value: data.top_match_score   ? `${Math.round(data.top_match_score)}%` : '–', sub: `${data.active_matches??0} active` },
  ];

  return (
    <section className="form-grid" style={{gap:20}}>
      {/* Metric cards */}
      <div className="page-grid">
        {metrics.map((m, i) => (
          <div key={i} className="metric" style={{animationDelay:`${i*0.07}s`}}>
            {m.icon}
            <span className="metric-label">{m.label}</span>
            <strong>{m.value}</strong>
            <small>{m.sub}</small>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="panel">
        <div className="panel-head"><h2>Quick Actions</h2></div>
        <div className="quick-actions">
          <button className="qa-btn" onClick={() => goTo('matching')}>
            <Sparkles size={15}/>Find Study Partners
          </button>
          <button className="qa-btn" onClick={() => goTo('progress')}>
            <Target size={15}/>Start Pomodoro
          </button>
          <button className="qa-btn" onClick={() => goTo('ai')}>
            <Bot size={15}/>Ask AI Tutor
          </button>
          <button className="qa-btn" onClick={() => goTo('ai')}>
            <Zap size={15}/>Generate Quiz
          </button>
          <button className="qa-btn" onClick={() => goTo('groups')}>
            <Users size={15}/>Browse Groups
          </button>
        </div>
      </div>

      {/* Weekly chart + Recent matches */}
      <div className="page-grid" style={{gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="panel" style={{gridColumn:'1'}}>
          <div className="panel-head"><h2>Weekly Study Hours</h2><TrendingUp size={16} style={{color:'var(--primary)'}}/></div>
          <div className="bars">
            {(data.weekly_hours || []).map(day => (
              <div key={day.date} className="bar">
                <span style={{height: `${Math.max(8,(day.hours/maxHrs)*100)}%`}} title={`${day.hours}h`}/>
                <small>{day.date.slice(5)}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Recent Matches</h2><Sparkles size={16} style={{color:'var(--primary)'}}/></div>
          <List loading={matches.loading} error={matches.error} items={matches.data?.slice(0,5)} empty="No matches yet. Run matching!">
            {m => (
              <div className="compact-row" style={{borderLeft:`3px solid ${m.status==='accepted'?'var(--accent)':'var(--line)'}`, paddingLeft:12}}>
                <strong>{m.partner?.name}</strong>
                <small>{m.match_score}% match · <span style={{color: m.status==='accepted'?'var(--accent)':m.status==='rejected'?'var(--danger)':'var(--warning)'}}>{m.status}</span></small>
              </div>
            )}
          </List>
        </div>
      </div>
    </section>
  );
}

/* ─── Profile ─────────────────────────────────────────────────── */
function Profile() {
  const profile  = useLoad(api.profile);
  const subjects = useLoad(api.subjects);
  const students = useLoad(api.students);
  const [form, setForm] = useState({ skills:'', preferred_language:'', skill_level:'beginner', study_goals:'', bio:'', subject_ids:[], weak_subject_ids:[] });
  const [subjectName, setSubjectName] = useState('');
  const [avail, setAvail] = useState({ day:'mon', time_block:'morning', start_time:'09:00', end_time:'10:00', study_hours:1 });
  const [status, setStatus] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (profile.data) setForm({
      skills:             profile.data.skills || '',
      preferred_language: profile.data.preferred_language || '',
      skill_level:        profile.data.skill_level || 'beginner',
      study_goals:        profile.data.study_goals || '',
      bio:                profile.data.bio || '',
      subject_ids:        profile.data.subjects?.map(s => s.id) || [],
      weak_subject_ids:   profile.data.weak_subjects?.map(s => s.id) || [],
    });
  }, [profile.data]);

  const save = async (e) => {
    e.preventDefault(); setStatus('');
    await api.updateProfile(form);
    setStatus('Profile saved ✓');
    profile.reload();
  };

  const addSubject = async () => {
    if (!subjectName.trim()) return;
    await api.createSubject(subjectName.trim());
    setSubjectName(''); subjects.reload();
  };

  const addAvail = async () => {
    await api.createAvailability(avail);
    setStatus('Availability added ✓'); profile.reload();
  };

  return (
    <section className="two-col">
      <form className="panel form-grid" onSubmit={save}>
        <div className="panel-head"><h2>Student Profile</h2><button className="primary"><Check size={15}/>Save</button></div>
        <Field label="Subjects (strong)"><MultiSelect options={subjects.data||[]} value={form.subject_ids} onChange={v=>set('subject_ids',v)}/></Field>
        <Field label="Weak subjects"><MultiSelect options={subjects.data||[]} value={form.weak_subject_ids} onChange={v=>set('weak_subject_ids',v)}/></Field>
        <Field label="Skills"><input value={form.skills} onChange={e=>set('skills',e.target.value)} placeholder="Python, algebra, note-taking"/></Field>
        <Field label="Preferred language"><input value={form.preferred_language} onChange={e=>set('preferred_language',e.target.value)} placeholder="English, Tamil…"/></Field>
        <Field label="Skill level">
          <select value={form.skill_level} onChange={e=>set('skill_level',e.target.value)}>
            <option>beginner</option><option>intermediate</option><option>advanced</option>
          </select>
        </Field>
        <Field label="Study goals"><textarea value={form.study_goals} onChange={e=>set('study_goals',e.target.value)} placeholder="What do you want to achieve?"/></Field>
        <Field label="Bio"><textarea value={form.bio} onChange={e=>set('bio',e.target.value)} placeholder="Tell partners about yourself"/></Field>
        <Status error={profile.error}>{status}</Status>
      </form>

      <section className="stack">
        <div className="panel form-grid">
          <div className="panel-head"><h2>Subjects</h2></div>
          <div className="inline">
            <input value={subjectName} onChange={e=>setSubjectName(e.target.value)} placeholder="Add a new subject" onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addSubject())}/>
            <button className="secondary" type="button" onClick={addSubject}><Plus size={15}/></button>
          </div>
          <div className="chips">{(subjects.data||[]).map(s=><span key={s.id}>{s.name}</span>)}</div>
        </div>

        <div className="panel form-grid">
          <div className="panel-head"><h2>Availability</h2></div>
          <Field label="Day">
            <select value={avail.day} onChange={e=>setAvail({...avail, day:e.target.value})}>
              {['mon','tue','wed','thu','fri','sat','sun'].map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Time block">
            <select value={avail.time_block} onChange={e=>setAvail({...avail, time_block:e.target.value})}>
              {['morning','afternoon','evening','weekend'].map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <div className="split">
            <Field label="Start"><input type="time" value={avail.start_time} onChange={e=>setAvail({...avail,start_time:e.target.value})}/></Field>
            <Field label="End"><input type="time" value={avail.end_time} onChange={e=>setAvail({...avail,end_time:e.target.value})}/></Field>
          </div>
          <Field label="Hours/session"><input type="number" min="0.5" step="0.5" value={avail.study_hours} onChange={e=>setAvail({...avail,study_hours:e.target.value})}/></Field>
          <button className="secondary" type="button" onClick={addAvail}><Plus size={15}/>Add slot</button>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Students</h2></div>
          <List loading={students.loading} error={students.error} items={students.data?.slice(0,6)} empty="No students found.">
            {s => <CompactRow title={s.student_name} meta={`${s.department} · Year ${s.year_of_study}`}/>}
          </List>
        </div>
      </section>
    </section>
  );
}

/* ─── Matching ────────────────────────────────────────────────── */
function Matching() {
  const matches = useLoad(api.matches);
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState('');

  const run = async () => {
    setBusy(true); setMsg('');
    try { await api.findMatches(); await matches.reload(); setMsg('Matching complete!'); }
    catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const respond = async (id, action) => {
    await api.respondMatch(id, action); matches.reload();
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Study Partner Matching</h2>
        <button className="primary" onClick={run} disabled={busy}>
          <Search size={15}/>{busy ? 'Searching…' : 'Find Matches'}
        </button>
      </div>
      {msg && <div className="status" style={{marginBottom:12}}>{msg}</div>}
      <List loading={matches.loading} error={matches.error} items={matches.data} empty="Click 'Find Matches' to discover your ideal study partners.">
        {match => (
          <div className="match-row">
            <div>
              <strong style={{fontSize:15}}>{match.partner?.name}</strong>
              <p>{match.common_subjects || 'Shared goals and schedule overlap'}</p>
              <small>{match.partner?.department} · {match.partner?.preferred_language} · {match.partner?.skill_level}</small>
            </div>
            <div className="score">{Math.round(match.match_score)}%</div>
            <div className="actions">
              {match.status === 'accepted' ? (
                <span style={{color:'var(--accent)', fontWeight:700, fontSize:13}}>✓ Accepted</span>
              ) : match.status === 'rejected' ? (
                <span style={{color:'var(--danger)', fontWeight:700, fontSize:13}}>✗ Rejected</span>
              ) : <>
                <button onClick={() => respond(match.id,'accept')}><Check size={14}/>Accept</button>
                <button onClick={() => respond(match.id,'reject')}>Decline</button>
              </>}
            </div>
          </div>
        )}
      </List>
    </section>
  );
}

/* ─── Video Call Modal ────────────────────────────────────────── */
function VideoCallModal({ convoId, partnerName, onClose }) {
  const [status, setStatus] = useState('Connecting…');

  useEffect(() => {
    let peer, ws, localStream;
    const init = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
        document.getElementById('localVideo').srcObject = localStream;
        ws   = new WebSocket(`${API_BASE.replace('http','ws')}/ws/chat/${convoId}/?token=${storage.access}`);
        peer = new RTCPeerConnection({ iceServers:[{ urls:'stun:stun.l.google.com:19302' }] });
        localStream.getTracks().forEach(t => peer.addTrack(t, localStream));
        peer.ontrack         = e => { document.getElementById('remoteVideo').srcObject = e.streams[0]; };
        peer.onicecandidate  = e => { if (e.candidate && ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({ type:'webrtc_candidate', candidate:e.candidate })); };
        ws.onopen = async () => {
          setStatus('Connected. Calling…');
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          ws.send(JSON.stringify({ type:'webrtc_offer', offer }));
        };
        ws.onmessage = async e => {
          const d = JSON.parse(e.data);
          if (d.type==='webrtc_offer') {
            await peer.setRemoteDescription(d.offer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            ws.send(JSON.stringify({ type:'webrtc_answer', answer }));
            setStatus('In call');
          } else if (d.type==='webrtc_answer') {
            await peer.setRemoteDescription(d.answer); setStatus('In call');
          } else if (d.type==='webrtc_candidate') {
            await peer.addIceCandidate(d.candidate);
          }
        };
      } catch (err) { setStatus(`Error: ${err.message}`); }
    };
    init();
    return () => {
      localStream?.getTracks().forEach(t => t.stop());
      peer?.close(); ws?.close();
    };
  }, [convoId]);

  return (
    <div className="modal-overlay">
      <div className="video-modal panel">
        <div className="panel-head">
          <h2><Video size={17} style={{marginRight:6}}/>Calling {partnerName}</h2>
          <small style={{color:'var(--muted)'}}>{status}</small>
        </div>
        <div className="video-grid">
          <video id="remoteVideo" autoPlay playsInline className="remote-vid"/>
          <video id="localVideo"  autoPlay playsInline muted className="local-vid"/>
        </div>
        <div className="controls">
          <button className="danger" onClick={onClose}><PhoneOff size={16}/>End Call</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Chat ────────────────────────────────────────────────────── */
function Chat() {
  const conversations = useLoad(api.conversations);
  const [active,    setActive]    = useState(null);
  const [partnerId, setPartnerId] = useState('');
  const [content,   setContent]   = useState('');
  const [inCall,    setInCall]    = useState(false);
  const messagesEl = useRef(null);

  const messages = useLoad(
    () => active ? api.messages(active) : Promise.resolve([]),
    [active]
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEl.current) {
      messagesEl.current.scrollTop = messagesEl.current.scrollHeight;
    }
  }, [messages.data]);

  const start = async () => {
    if (!partnerId) return;
    const convo = await api.startConversation(Number(partnerId));
    setActive(convo.id); setPartnerId(''); conversations.reload();
  };

  const send = async () => {
    if (!active || !content.trim()) return;
    const txt = content.trim(); setContent('');
    await api.sendMessage(active, txt); messages.reload();
  };

  const handleKey = (e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const activeConvo = conversations.data?.find(c => c.id===active);

  const formatTime = (ts) => {
    if (!ts) return '';
    try { return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); } catch { return ''; }
  };

  return (
    <section className="chat-layout">
      {inCall && activeConvo && (
        <VideoCallModal convoId={active} partnerName={activeConvo.partner_name} onClose={() => setInCall(false)}/>
      )}

      {/* Conversation list */}
      <aside className="panel" style={{display:'grid', gap:10, alignContent:'start'}}>
        <div className="panel-head"><h2>Conversations</h2></div>
        <div className="inline">
          <input value={partnerId} onChange={e=>setPartnerId(e.target.value)} placeholder="Partner user ID…"
            onKeyDown={e=>e.key==='Enter'&&start()}/>
          <button className="secondary" onClick={start}><Plus size={15}/></button>
        </div>
        <List loading={conversations.loading} error={conversations.error} items={conversations.data} empty="No conversations yet.">
          {c => (
            <button className={`conversation ${active===c.id?'active':''}`} onClick={() => setActive(c.id)}>
              <strong>{c.partner_name}</strong>
              <small>{c.last_message?.content ? c.last_message.content.slice(0,38)+'…' : 'Open chat'}</small>
            </button>
          )}
        </List>
      </aside>

      {/* Message pane */}
      <section className="panel chat-panel">
        <div className="panel-head">
          <h2>{activeConvo ? activeConvo.partner_name : 'Select a conversation'}</h2>
          {active && (
            <button className="primary" onClick={() => setInCall(true)}>
              <Video size={15}/>Video Call
            </button>
          )}
        </div>

        <div className="messages" ref={messagesEl}>
          {(messages.data || []).map(m => (
            <div key={m.id} className={`bubble ${m.is_mine?'mine':''}`}>
              <strong>{m.sender_name}</strong>
              <p>{m.content || m.attachment_name}</p>
              <div className="bubble-time">{formatTime(m.created_at)}</div>
            </div>
          ))}
        </div>

        <div className="composer">
          <input
            value={content}
            onChange={e=>setContent(e.target.value)}
            onKeyDown={handleKey}
            placeholder={active ? "Write a message… (Enter to send)" : "Select a conversation first"}
            disabled={!active}
          />
          <button className="primary" onClick={send} disabled={!active}><Send size={15}/></button>
        </div>
      </section>
    </section>
  );
}

/* ─── Groups ──────────────────────────────────────────────────── */
function Groups() {
  const groups   = useLoad(api.groups);
  const subjects = useLoad(api.subjects);
  const [form, setForm] = useState({ name:'', description:'', subject:'', max_members:6, is_private:false });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const create = async (e) => {
    e.preventDefault();
    await api.createGroup({ ...form, subject: form.subject || null });
    setForm({ name:'', description:'', subject:'', max_members:6, is_private:false });
    groups.reload();
  };

  const toggle = async (g) => {
    g.is_member ? await api.leaveGroup(g.id) : await api.joinGroup(g.id);
    groups.reload();
  };

  return (
    <section className="two-col">
      <form className="panel form-grid" onSubmit={create}>
        <div className="panel-head"><h2>Create Group</h2><button className="primary"><Plus size={15}/>Create</button></div>
        <Field label="Group name"><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Data Structures Study Group" required/></Field>
        <Field label="Subject">
          <select value={form.subject} onChange={e=>set('subject',e.target.value)}>
            <option value="">General</option>
            {(subjects.data||[]).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Max members"><input type="number" min="2" value={form.max_members} onChange={e=>set('max_members',Number(e.target.value))}/></Field>
        <Field label="Description"><textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="What will this group study?"/></Field>
        <label className="checkline">
          <input type="checkbox" checked={form.is_private} onChange={e=>set('is_private',e.target.checked)}/>
          Private group (invite only)
        </label>
      </form>

      <section className="panel">
        <div className="panel-head"><h2>Study Groups</h2><button className="ghost" onClick={groups.reload}><RefreshCw size={14}/></button></div>
        <List loading={groups.loading} error={groups.error} items={groups.data} empty="No groups yet. Create the first one!">
          {g => (
            <div className="group-card">
              <div style={{flex:1, minWidth:0}}>
                <strong>{g.name}</strong>
                {g.description && <p>{g.description}</p>}
                <small>
                  {g.subject_name||'General'} · {g.member_count}/{g.max_members} members
                  {g.is_private && ' · 🔒 Private'}
                </small>
              </div>
              <div style={{display:'flex', gap:8, alignItems:'center', flexShrink:0}}>
                <span className="member-pill"><UsersRound size={12}/>{g.member_count}</span>
                <button className={g.is_member?'danger':'secondary'} onClick={()=>toggle(g)}>
                  {g.is_member ? 'Leave' : 'Join'}<ChevronRight size={13}/>
                </button>
              </div>
            </div>
          )}
        </List>
      </section>
    </section>
  );
}

/* ─── Pomodoro Timer (SVG ring + break cycles) ────────────────── */
const POMO_WORK  = 25 * 60;
const POMO_SHORT = 5  * 60;
const POMO_LONG  = 15 * 60;
const CIRCUMFERENCE = 2 * Math.PI * 80; // r=80

function PomodoroTimer({ subjects, onComplete }) {
  const [mode,      setMode]      = useState('focus');   // 'focus' | 'break'
  const [timeLeft,  setTimeLeft]  = useState(POMO_WORK);
  const [running,   setRunning]   = useState(false);
  const [sessions,  setSessions]  = useState(0);         // completed focus sessions
  const [subject,   setSubject]   = useState('');
  const totalTime = mode==='focus' ? POMO_WORK : (sessions % 4 === 3 ? POMO_LONG : POMO_SHORT);
  const progress  = timeLeft / totalTime;

  useEffect(() => {
    let id;
    if (running && timeLeft > 0) {
      id = setInterval(() => setTimeLeft(t => t-1), 1000);
    } else if (timeLeft === 0 && running) {
      setRunning(false);
      if (mode === 'focus') {
        const done = sessions + 1;
        setSessions(done);
        onComplete({ subject, hours: Math.round((25/60)*10)/10, notes:`Completed Pomodoro #${done}` });
        // beep
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 880; gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.8);
          osc.start(); osc.stop(ctx.currentTime+0.8);
        } catch {}
        setMode('break');
        setTimeLeft(done % 4 === 0 ? POMO_LONG : POMO_SHORT);
      } else {
        setMode('focus'); setTimeLeft(POMO_WORK);
      }
    }
    return () => clearInterval(id);
  }, [running, timeLeft, mode, sessions, subject, onComplete]);

  const toggle = () => setRunning(r => !r);
  const reset  = () => { setRunning(false); setTimeLeft(totalTime); };

  const mins = Math.floor(timeLeft/60).toString().padStart(2,'0');
  const secs = (timeLeft%60).toString().padStart(2,'0');
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className={`panel form-grid pomodoro-panel ${running?'pomodoro-running':''}`}>
      <div className="panel-head" style={{marginBottom:0}}>
        <h2>{mode==='focus' ? '🎯 Focus Session' : '☕ Break Time'}</h2>
        <span style={{fontSize:12, color:'var(--muted)', fontWeight:600}}>
          {mode==='focus'?`Session ${sessions+1}`:`${sessions%4===3?'Long':'Short'} break`}
        </span>
      </div>

      {/* Session dots */}
      <div className="pomo-sessions">
        {[0,1,2,3].map(i => <div key={i} className={`pomo-dot ${i < sessions%4 || (sessions%4===0&&sessions>0&&i===0)?'done':''}`}/>)}
      </div>

      <SubjectSelect subjects={subjects||[]} value={subject} onChange={setSubject}/>

      {/* SVG ring */}
      <div className="pomodoro-ring-wrap">
        <svg viewBox="0 0 180 180">
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
          <circle className="pomodoro-ring-bg" cx="90" cy="90" r="80"/>
          <circle
            className={`pomodoro-ring-prog ${mode}`}
            cx="90" cy="90" r="80"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="pomodoro-time-text">
          <strong>{mins}:{secs}</strong>
          <small>{mode==='focus'?'Focus':'Break'}</small>
        </div>
      </div>

      <div className="split">
        <button type="button" className={`primary ${running&&mode==='focus'?'':''}`} style={{padding:'12px', gap:8}} onClick={toggle}>
          {running ? <Pause size={16}/> : <Play size={16}/>}
          {running ? 'Pause' : mode==='focus'?'Start Focus':'Start Break'}
        </button>
        <button type="button" className="secondary" onClick={reset}><RotateCcw size={15}/>Reset</button>
      </div>

      {sessions > 0 && (
        <div style={{textAlign:'center', fontSize:12, color:'var(--muted)'}}>
          <Coffee size={13} style={{marginRight:4, verticalAlign:'middle'}}/>
          {sessions} Pomodoro{sessions>1?'s':''} completed today
        </div>
      )}
    </div>
  );
}

/* ─── Progress ────────────────────────────────────────────────── */
function Progress() {
  const subjects    = useLoad(api.subjects);
  const logs        = useLoad(api.logs);
  const topics      = useLoad(api.topics);
  const leaderboard = useLoad(api.leaderboard);
  const schedules   = useLoad(api.schedules);

  const [log,      setLog]      = useState({ subject:'', date:new Date().toISOString().slice(0,10), hours:1, notes:'' });
  const [topic,    setTopic]    = useState({ subject:'', topic_name:'' });
  const [schedule, setSchedule] = useState({ subject:'', day_of_week:1, start_time:'09:00', end_time:'10:00', expected_grade:'' });

  const me = storage.user;

  const addLog = async (e) => {
    e.preventDefault();
    await api.createLog({ ...log, subject: log.subject||null });
    logs.reload();
  };

  const addTopic = async (e) => {
    e.preventDefault();
    if (!topic.subject) return;
    await api.createTopic({ ...topic, subject:topic.subject||null });
    setTopic({ subject:'', topic_name:'' }); topics.reload();
  };

  const addSchedule = async (e) => {
    e.preventDefault();
    await api.createSchedule({ ...schedule, subject:schedule.subject||null });
    schedules.reload();
  };

  const handlePomodoroLog = useCallback(async (data) => {
    await api.createLog({ ...data, subject:data.subject||null, date:new Date().toISOString().slice(0,10) });
    logs.reload();
  }, [logs.reload]);

  // Podium (top 3)
  const top3 = (leaderboard.data || []).slice(0,3);
  const rest  = (leaderboard.data || []).slice(3);
  const medals = ['🥇','🥈','🥉'];
  const podiumClass = ['gold','silver','bronze'];

  return (
    <section className="three-col">
      {/* Col 1: Pomodoro + Study log */}
      <div className="stack">
        <PomodoroTimer subjects={subjects.data} onComplete={handlePomodoroLog}/>
        <form className="panel form-grid" onSubmit={addLog}>
          <div className="panel-head"><h2>Log Study Session</h2><button className="primary"><Plus size={15}/></button></div>
          <SubjectSelect subjects={subjects.data||[]} value={log.subject} onChange={v=>setLog({...log,subject:v})}/>
          <Field label="Date"><input type="date" value={log.date} onChange={e=>setLog({...log,date:e.target.value})}/></Field>
          <Field label="Hours"><input type="number" step="0.5" min="0.5" value={log.hours} onChange={e=>setLog({...log,hours:e.target.value})}/></Field>
          <Field label="Notes"><textarea value={log.notes} onChange={e=>setLog({...log,notes:e.target.value})} placeholder="What did you study?" style={{minHeight:60}}/></Field>
          <List items={logs.data?.slice(0,4)} empty="No logs yet.">
            {l=><CompactRow title={l.subject_name||'General'} meta={`${l.hours}h · ${l.date}`}/>}
          </List>
        </form>
      </div>

      {/* Col 2: Timetable */}
      <form className="panel form-grid" onSubmit={addSchedule}>
        <div className="panel-head"><h2>Timetable</h2><button className="primary"><Plus size={15}/></button></div>
        <SubjectSelect subjects={subjects.data||[]} value={schedule.subject} onChange={v=>setSchedule({...schedule,subject:v})}/>
        <Field label="Day">
          <select value={schedule.day_of_week} onChange={e=>setSchedule({...schedule,day_of_week:Number(e.target.value)})}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=><option key={i} value={i+1}>{d}</option>)}
          </select>
        </Field>
        <div className="split">
          <Field label="Start"><input type="time" value={schedule.start_time} onChange={e=>setSchedule({...schedule,start_time:e.target.value})}/></Field>
          <Field label="End"><input type="time" value={schedule.end_time} onChange={e=>setSchedule({...schedule,end_time:e.target.value})}/></Field>
        </div>
        <Field label="Target grade"><input value={schedule.expected_grade} onChange={e=>setSchedule({...schedule,expected_grade:e.target.value})} placeholder="A+"/></Field>
        <div style={{borderTop:'1px solid var(--line)', paddingTop:12, marginTop:4}}>
          <p style={{fontSize:12, color:'var(--muted)', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em'}}>Schedule</p>
          <List loading={schedules.loading} items={schedules.data} empty="No schedule entries yet.">
            {s=><CompactRow title={`${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s.day_of_week-1]} · ${s.subject_name||'General'}`} meta={`${s.start_time}–${s.end_time} · Goal: ${s.expected_grade||'–'}`}/>}
          </List>
        </div>
      </form>

      {/* Col 3: Completed topics + Leaderboard */}
      <div className="stack">
        <form className="panel form-grid" onSubmit={addTopic}>
          <div className="panel-head"><h2>Completed Topics</h2><button className="primary"><Check size={15}/></button></div>
          <SubjectSelect subjects={subjects.data||[]} value={topic.subject} onChange={v=>setTopic({...topic,subject:v})} required/>
          <Field label="Topic name"><input value={topic.topic_name} onChange={e=>setTopic({...topic,topic_name:e.target.value})} required placeholder="e.g. Binary Search Trees"/></Field>
          <List items={topics.data?.slice(0,5)} empty="No completed topics yet.">
            {t=><CompactRow title={t.topic_name} meta={t.subject_name||'General'}/>}
          </List>
        </form>

        <section className="panel">
          <div className="panel-head"><h2>🏆 Leaderboard</h2></div>

          {/* Podium top 3 */}
          {top3.length > 0 && (
            <div className="podium" style={{marginBottom:12}}>
              {/* Rearrange: 2nd, 1st, 3rd */}
              {[top3[1], top3[0], top3[2]].map((row, i) => {
                if (!row) return <div key={i}/>;
                const rankIdx = i===1 ? 0 : i===0 ? 1 : 2;
                const isMe = row.name === me?.name;
                return (
                  <div key={row.rank} className={`podium-step ${podiumClass[rankIdx]} ${isMe?'me':''}`}
                    style={isMe?{outline:'2px solid var(--primary)', outlineOffset:2}:{}}
                  >
                    <div className="podium-medal">{medals[rankIdx]}</div>
                    <div className="podium-hrs">{row.total_hours}h</div>
                    <strong>{row.name?.split(' ')[0]}</strong>
                    <small>{row.grade}</small>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest of leaderboard */}
          <div className="list">
            {rest.map((row, i) => {
              const isMe = row.name === me?.name;
              return (
                <div key={row.rank} className={`leaderboard-row ${isMe?'me':''}`} style={{animationDelay:`${(i+3)*0.05}s`}}>
                  <span className="lb-rank">#{row.rank}</span>
                  <span className="lb-name">{row.name}{isMe && <span style={{color:'var(--primary)', fontSize:11, marginLeft:6}}>(you)</span>}</span>
                  <span className={`lb-grade ${row.grade}`}>{row.grade}</span>
                  <span className="lb-hrs">{row.total_hours}h</span>
                </div>
              );
            })}
            {leaderboard.loading && <div className="status">Loading…</div>}
            {!leaderboard.loading && !leaderboard.data?.length && <div className="empty">No study logs yet. Be the first!</div>}
          </div>
        </section>
      </div>
    </section>
  );
}

/* ─── Quiz Runner ─────────────────────────────────────────────── */
function QuizRunner({ quiz, onDone }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIdx]: selectedOption }
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState(null);

  const questions = quiz.questions || [];
  const q = questions[current];
  const total = questions.length;
  const LABELS = ['A','B','C','D'];
  const CIRCUMFERENCE_S = 2 * Math.PI * 54;

  const pickAnswer = (opt) => {
    if (revealed) return;
    setAnswers(a => ({ ...a, [current]: opt }));
  };

  const next = () => {
    if (current < total - 1) { setCurrent(c => c+1); setRevealed(false); }
  };

  const submit = async () => {
    try {
      const res = await api.submitQuiz(quiz.id, { answers });
      setResult(res);
    } catch {
      // fallback: calculate locally
      let correct = 0;
      questions.forEach((q, i) => { if (answers[i] === q.correct_answer) correct++; });
      setResult({ score: Math.round((correct/total)*100), correct, total });
    }
  };

  if (result) {
    const pct = result.score ?? 0;
    const fillOffset = CIRCUMFERENCE_S * (1 - pct/100);
    return (
      <div className="quiz-runner" style={{textAlign:'center', padding:'20px 0'}}>
        <div style={{fontSize:24, fontWeight:800, marginBottom:6}}>Quiz Complete! 🎉</div>
        <div style={{color:'var(--muted)', marginBottom:24}}>Here's how you did:</div>
        <div className="score-ring-wrap">
          <svg viewBox="0 0 140 140">
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8"/>
                <stop offset="100%" stopColor="#10b981"/>
              </linearGradient>
            </defs>
            <circle className="score-ring-bg" cx="70" cy="70" r="54"/>
            <circle className="score-ring-fill" cx="70" cy="70" r="54"
              strokeDasharray={CIRCUMFERENCE_S}
              strokeDashoffset={fillOffset}
            />
          </svg>
          <div className="score-ring-text">
            <strong>{pct}%</strong>
            <small>{result.correct ?? '–'}/{result.total ?? total} correct</small>
          </div>
        </div>
        <button className="primary" onClick={onDone} style={{marginTop:8}}>Back to AI Tools</button>
      </div>
    );
  }

  if (!q) return <div className="empty">No questions available.</div>;

  const opts = q.options || [];

  return (
    <div className="quiz-runner">
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{width:`${((current+1)/total)*100}%`}}/>
      </div>
      <div className="quiz-q-num">Question {current+1} of {total} · {quiz.topic}</div>
      <div className="quiz-q-text">{q.question || q.text}</div>
      <div className="quiz-options">
        {opts.map((opt, i) => {
          let cls = 'quiz-option';
          if (answers[current] === opt) {
            if (revealed) cls += q.correct_answer===opt ? ' correct' : ' wrong';
            else cls += ' selected';
          }
          if (revealed && q.correct_answer===opt) cls += ' correct';
          return (
            <button key={i} className={cls} onClick={() => pickAnswer(opt)}>
              <span className="quiz-option-letter">{LABELS[i]}</span>
              {opt}
            </button>
          );
        })}
      </div>
      <div className="split">
        {!revealed && answers[current] !== undefined && (
          <button className="secondary" onClick={() => setRevealed(true)}>Check Answer</button>
        )}
        {revealed && current < total-1 && (
          <button className="primary" onClick={next}>Next Question →</button>
        )}
        {(current === total-1 || (revealed && current === total-1)) && (
          <button className="primary" onClick={submit} style={{gridColumn:'1/-1'}}>Submit Quiz</button>
        )}
        {!revealed && answers[current] === undefined && <div/>}
      </div>
    </div>
  );
}

/* ─── AI Tools ────────────────────────────────────────────────── */
function AiTools() {
  const subjects     = useLoad(api.subjects);
  const suggestions  = useLoad(api.suggestions);
  const history      = useLoad(api.chatbotHistory);
  const quizzes      = useLoad(api.quizzes);

  const [question, setQuestion] = useState('');
  const [typing,   setTyping]   = useState(false);
  const [quiz,     setQuiz]     = useState({ topic:'', subject:'', num_questions:5 });
  const [activeQuiz, setActiveQuiz] = useState(null);
  const chatEl = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEl.current) chatEl.current.scrollTop = chatEl.current.scrollHeight;
  }, [history.data, typing]);

  const ask = async () => {
    if (!question.trim()) return;
    const q = question.trim(); setQuestion('');
    setTyping(true);
    try { await api.askBot(q); } catch {}
    await history.reload();
    setTyping(false);
  };

  const handleChatKey = (e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); ask(); } };

  const makeQuiz = async (e) => {
    e.preventDefault();
    let newQuiz;
    if (quiz.file) {
      const fd = new FormData();
      fd.append('file', quiz.file); fd.append('topic', quiz.topic);
      fd.append('num_questions', quiz.num_questions);
      if (quiz.subject) fd.append('subject', quiz.subject);
      newQuiz = await api.generateQuizFromFile(fd);
    } else {
      newQuiz = await api.generateQuiz({ topic:quiz.topic, subject:quiz.subject||null, num_questions:Number(quiz.num_questions) });
    }
    setQuiz({ topic:'', subject:'', num_questions:5, file:null });
    await quizzes.reload();
    if (newQuiz?.id) setActiveQuiz(newQuiz);
  };

  const openQuiz = async (q) => {
    try { const detail = await api.quizDetail(q.id); setActiveQuiz(detail); }
    catch { setActiveQuiz(q); }
  };

  const renderBotMessage = (text) => {
    // Simple markdown: **bold**, `code`
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith('`') && p.endsWith('`')) return <code key={i} style={{background:'rgba(129,140,248,0.15)', padding:'1px 5px', borderRadius:4, fontFamily:'monospace', fontSize:12}}>{p.slice(1,-1)}</code>;
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>;
      return p;
    });
  };

  return (
    <section className="two-col">
      <div className="stack">
        {/* Study Suggestions */}
        <section className="panel">
          <div className="panel-head">
            <h2>✨ AI Study Suggestions</h2>
            <button className="primary" onClick={async()=>{await api.generateSuggestions();suggestions.reload();}}>
              <Sparkles size={14}/>Generate
            </button>
          </div>
          <List loading={suggestions.loading} error={suggestions.error} items={suggestions.data} empty="Click Generate to get personalised study suggestions.">
            {s => <CompactRow title={s.text} meta={s.subject_name||'AI suggestion'}/>}
          </List>
        </section>

        {/* Quiz Generator */}
        <div className="panel">
          <div className="panel-head">
            <h2>⚡ Quiz Generator</h2>
          </div>

          {activeQuiz ? (
            <QuizRunner quiz={activeQuiz} onDone={() => setActiveQuiz(null)}/>
          ) : (
            <form className="form-grid" onSubmit={makeQuiz}>
              <Field label="Topic"><input value={quiz.topic} onChange={e=>setQuiz({...quiz,topic:e.target.value})} placeholder="e.g. Binary Trees, Photosynthesis…" required/></Field>
              <SubjectSelect subjects={subjects.data||[]} value={quiz.subject} onChange={v=>setQuiz({...quiz,subject:v})}/>
              <Field label="Number of questions"><input type="number" min="1" max="15" value={quiz.num_questions} onChange={e=>setQuiz({...quiz,num_questions:e.target.value})}/></Field>
              <Field label="Generate from PDF/PPT"><input type="file" accept=".pdf,.ppt,.pptx" onChange={e=>setQuiz({...quiz,file:e.target.files?.[0]})}/></Field>
              <button className="primary full"><Zap size={14}/>Generate Quiz</button>
              <div style={{borderTop:'1px solid var(--line)', paddingTop:12}}>
                <p style={{fontSize:12, color:'var(--muted)', marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em'}}>Recent Quizzes</p>
                <List items={quizzes.data?.slice(0,4)} empty="No quizzes yet.">
                  {q => (
                    <button className="compact-row" style={{width:'100%',textAlign:'left',cursor:'pointer',border:'1px solid var(--glass-border)', borderRadius:10, padding:'10px 12px'}} type="button" onClick={() => openQuiz(q)}>
                      <strong>{q.topic}</strong>
                      <small>{q.score!=null?`Score: ${q.score}%`:'Not attempted'} · {q.questions?.length||0} questions</small>
                    </button>
                  )}
                </List>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* AI Chatbot */}
      <section className="panel chat-panel">
        <div className="panel-head"><h2>🤖 AI Study Tutor</h2><Bot size={18} style={{color:'var(--primary)'}}/></div>
        <div className="messages" ref={chatEl}>
          {(history.data||[]).length === 0 && !typing && (
            <div className="empty" style={{margin:'auto'}}>
              Ask me anything about your studies!<br/>
              <small style={{fontSize:11}}>Try: "Explain recursion with examples" or "What are the key concepts in thermodynamics?"</small>
            </div>
          )}
          {(history.data||[]).map(m => (
            <div key={m.id} className={`bubble ${m.role==='user'?'mine':''}`}>
              <strong>{m.role==='user'?'You':'AI Tutor'}</strong>
              <p>{renderBotMessage(m.content)}</p>
            </div>
          ))}
          {typing && (
            <div className="typing-indicator">
              <span/><span/><span/>
            </div>
          )}
        </div>
        <div className="composer">
          <input
            value={question}
            onChange={e=>setQuestion(e.target.value)}
            onKeyDown={handleChatKey}
            placeholder="Ask for study help… (Enter to send)"
            disabled={typing}
          />
          <button className="primary" onClick={ask} disabled={typing}><Send size={15}/></button>
        </div>
      </section>
    </section>
  );
}

/* ─── Notifications ───────────────────────────────────────────── */
function Notifications() {
  const notifs = useLoad(api.notifications);

  const markAll = async () => {
    await api.markAllRead(); notifs.reload();
  };

  const typeIcon = (type) => {
    const icons = { match:'🤝', message:'💬', group:'👥', system:'🔔' };
    return icons[type] || '🔔';
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Notifications</h2>
        <button className="secondary" onClick={markAll}><Check size={14}/>Mark all read</button>
      </div>
      <List loading={notifs.loading} error={notifs.error} items={notifs.data} empty="You're all caught up! No notifications.">
        {n => (
          <div className={`notif-item ${n.is_read?'':'unread'}`}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <span style={{fontSize:20}}>{typeIcon(n.notification_type)}</span>
              <div style={{flex:1}}>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <small>{n.notification_type} · {new Date(n.created_at).toLocaleString()}</small>
              </div>
              {!n.is_read && <span style={{width:8,height:8,borderRadius:'50%',background:'var(--cyan)',flexShrink:0, boxShadow:'0 0 8px var(--cyan-glow)'}}/>}
            </div>
          </div>
        )}
      </List>
    </section>
  );
}

/* ─── Mount ───────────────────────────────────────────────────── */
// Apply saved theme before first render
document.documentElement.setAttribute('data-theme', storage.theme);

createRoot(document.getElementById('root')).render(<App />);
