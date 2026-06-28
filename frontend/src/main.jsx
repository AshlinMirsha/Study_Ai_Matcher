import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell, BookOpen, Bot, Check, ChevronRight, Clock, Flame, GraduationCap,
  LayoutDashboard, LogOut, MessageSquare, Plus, RefreshCw, Search, Send,
  Sparkles, Trophy, UserRound, UsersRound
} from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const storage = {
  get access() { return localStorage.getItem('sam_access'); },
  get refresh() { return localStorage.getItem('sam_refresh'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('sam_user') || 'null'); } catch { return null; }
  },
  setAuth(data) {
    localStorage.setItem('sam_access', data.access);
    localStorage.setItem('sam_refresh', data.refresh);
    localStorage.setItem('sam_user', JSON.stringify(data.user));
  },
  clear() {
    localStorage.removeItem('sam_access');
    localStorage.removeItem('sam_refresh');
    localStorage.removeItem('sam_user');
  }
};

async function request(path, options = {}, retry = true) {
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  if (storage.access) headers.Authorization = `Bearer ${storage.access}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401 && retry && storage.refresh) {
    const refreshed = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: storage.refresh })
    });
    if (refreshed.ok) {
      const data = await refreshed.json();
      localStorage.setItem('sam_access', data.access);
      return request(path, options, false);
    }
    storage.clear();
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.detail || data?.non_field_errors?.join(' ') || JSON.stringify(data);
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return data;
}

const list = (path) => request(path).then((data) => data?.results || data || []);

const api = {
  login: (payload) => request('/api/auth/token/', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/api/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/auth/me/'),
  profile: () => request('/api/profiles/me/'),
  updateProfile: (payload) => request('/api/profiles/me/', { method: 'PATCH', body: JSON.stringify(payload) }),
  students: () => list('/api/profiles/students/'),
  subjects: () => list('/api/profiles/subjects/'),
  createSubject: (name) => request('/api/profiles/subjects/', { method: 'POST', body: JSON.stringify({ name }) }),
  availability: () => list('/api/profiles/availability/'),
  createAvailability: (payload) => request('/api/profiles/availability/', { method: 'POST', body: JSON.stringify(payload) }),
  dashboard: () => request('/api/progress/dashboard/'),
  leaderboard: () => list('/api/progress/leaderboard/'),
  logs: () => list('/api/progress/logs/'),
  createLog: (payload) => request('/api/progress/logs/', { method: 'POST', body: JSON.stringify(payload) }),
  topics: () => list('/api/progress/topics/'),
  createTopic: (payload) => request('/api/progress/topics/', { method: 'POST', body: JSON.stringify(payload) }),
  findMatches: () => request('/api/matching/find/'),
  matches: () => list('/api/matching/my-matches/'),
  respondMatch: (id, action) => request(`/api/matching/${id}/respond/`, { method: 'POST', body: JSON.stringify({ action }) }),
  conversations: () => list('/api/chat/conversations/'),
  startConversation: (partner_id) => request('/api/chat/conversations/start/', { method: 'POST', body: JSON.stringify({ partner_id }) }),
  messages: (id) => list(`/api/chat/conversations/${id}/messages/`),
  sendMessage: (id, content) => request(`/api/chat/conversations/${id}/messages/send/`, { method: 'POST', body: JSON.stringify({ content, message_type: 'text' }) }),
  groups: () => list('/api/groups/'),
  myGroups: () => list('/api/groups/my-groups/'),
  createGroup: (payload) => request('/api/groups/', { method: 'POST', body: JSON.stringify(payload) }),
  joinGroup: (id) => request(`/api/groups/${id}/join/`, { method: 'POST' }),
  leaveGroup: (id) => request(`/api/groups/${id}/leave/`, { method: 'POST' }),
  suggestions: () => list('/api/ai/suggestions/'),
  generateSuggestions: () => request('/api/ai/suggestions/generate/', { method: 'POST' }),
  chatbotHistory: () => list('/api/ai/chatbot/history/'),
  askBot: (message) => request('/api/ai/chatbot/ask/', { method: 'POST', body: JSON.stringify({ message }) }),
  quizzes: () => list('/api/ai/quizzes/'),
  generateQuiz: (payload) => request('/api/ai/quizzes/generate/', { method: 'POST', body: JSON.stringify(payload) }),
  notifications: () => list('/api/notifications/'),
  unreadCount: () => request('/api/notifications/unread-count/'),
  markAllRead: () => request('/api/notifications/mark-all-read/', { method: 'POST' })
};

function useLoad(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    setError('');
    try { setData(await loader()); } catch (err) { setError(err.message); }
    setLoading(false);
  };
  useEffect(() => { reload(); }, deps);
  return { data, error, loading, reload, setData };
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Status({ error, children }) {
  if (error) return <div className="status error">{error}</div>;
  if (children) return <div className="status">{children}</div>;
  return null;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    email: '', password: '', password2: '', name: '', college: '', department: '', year_of_study: 1
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') await api.register(form);
      const auth = await api.login({ email: form.email, password: form.password });
      storage.setAuth(auth);
      onAuth(auth.user);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-mark"><GraduationCap size={30} /><span>Study AI Matcher</span></div>
        <div className="segmented">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>
        <form onSubmit={submit} className="form-grid">
          {mode === 'register' && (
            <>
              <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
              <Field label="College"><input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} required /></Field>
              <Field label="Department"><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required /></Field>
              <Field label="Year"><select value={form.year_of_study} onChange={(e) => setForm({ ...form, year_of_study: Number(e.target.value) })}><option value={1}>1st Year</option><option value={2}>2nd Year</option><option value={3}>3rd Year</option><option value={4}>4th Year</option><option value={5}>Postgraduate</option></select></Field>
            </>
          )}
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
          {mode === 'register' && <Field label="Confirm password"><input type="password" value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} required /></Field>}
          <Status error={error} />
          <button className="primary full" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Enter workspace' : 'Create account'}</button>
        </form>
      </section>
    </main>
  );
}

const nav = [
  ['dashboard', LayoutDashboard, 'Dashboard'],
  ['profile', UserRound, 'Profile'],
  ['matching', Sparkles, 'Matching'],
  ['chat', MessageSquare, 'Chat'],
  ['groups', UsersRound, 'Groups'],
  ['progress', Trophy, 'Progress'],
  ['ai', Bot, 'AI Tools'],
  ['notifications', Bell, 'Notifications']
];

function App() {
  const [user, setUser] = useState(storage.user);
  const [page, setPage] = useState('dashboard');
  const [notice, setNotice] = useState('');

  if (!user) return <AuthScreen onAuth={setUser} />;

  const logout = () => {
    storage.clear();
    setUser(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><GraduationCap size={26} /><span>Study AI</span></div>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon size={18} />{label}</button>
          ))}
        </nav>
        <button className="logout" onClick={logout}><LogOut size={18} />Logout</button>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>{user.name || user.email}</h1>
          </div>
          <button className="ghost" onClick={() => setNotice(`Backend: ${API_BASE}`)}><RefreshCw size={16} />API</button>
        </header>
        <Status>{notice}</Status>
        {page === 'dashboard' && <Dashboard />}
        {page === 'profile' && <Profile />}
        {page === 'matching' && <Matching />}
        {page === 'chat' && <Chat />}
        {page === 'groups' && <Groups />}
        {page === 'progress' && <Progress />}
        {page === 'ai' && <AiTools />}
        {page === 'notifications' && <Notifications />}
      </main>
    </div>
  );
}

function Dashboard() {
  const dash = useLoad(api.dashboard);
  const matches = useLoad(api.matches);
  const notifications = useLoad(api.unreadCount);
  const data = dash.data || {};
  const maxHours = Math.max(1, ...(data.weekly_hours || []).map((d) => d.hours));
  return (
    <section className="page-grid">
      <div className="metric"><Clock /><span>Total hours</span><strong>{data.total_study_hours ?? '-'}</strong></div>
      <div className="metric"><BookOpen /><span>Topics done</span><strong>{data.topics_completed ?? '-'}</strong></div>
      <div className="metric"><Flame /><span>Current streak</span><strong>{data.current_streak ?? '-'}</strong></div>
      <div className="metric"><Bell /><span>Unread alerts</span><strong>{notifications.data?.unread_count ?? '-'}</strong></div>
      <section className="panel wide">
        <div className="panel-head"><h2>Weekly Study Hours</h2></div>
        <div className="bars">{(data.weekly_hours || []).map((day) => <div key={day.date} className="bar"><span style={{ height: `${Math.max(8, (day.hours / maxHours) * 100)}%` }} /><small>{day.date.slice(5)}</small></div>)}</div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Recent Matches</h2></div>
        <List loading={matches.loading} error={matches.error} items={matches.data?.slice(0, 5)} empty="No matches yet.">
          {(match) => <CompactRow title={match.partner?.name} meta={`${match.match_score}% match · ${match.status}`} />}
        </List>
      </section>
    </section>
  );
}

function Profile() {
  const profile = useLoad(api.profile);
  const subjects = useLoad(api.subjects);
  const students = useLoad(api.students);
  const [form, setForm] = useState({ skills: '', preferred_language: '', skill_level: 'beginner', study_goals: '', bio: '', subject_ids: [], weak_subject_ids: [] });
  const [subjectName, setSubjectName] = useState('');
  const [availability, setAvailability] = useState({ day: 'mon', time_block: 'morning', start_time: '09:00', end_time: '10:00', study_hours: 1 });
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (profile.data) setForm({
      skills: profile.data.skills || '',
      preferred_language: profile.data.preferred_language || '',
      skill_level: profile.data.skill_level || 'beginner',
      study_goals: profile.data.study_goals || '',
      bio: profile.data.bio || '',
      subject_ids: profile.data.subjects?.map((s) => s.id) || [],
      weak_subject_ids: profile.data.weak_subjects?.map((s) => s.id) || []
    });
  }, [profile.data]);

  const save = async (event) => {
    event.preventDefault();
    setStatus('');
    await api.updateProfile(form);
    setStatus('Profile saved.');
    profile.reload();
  };

  const addSubject = async () => {
    if (!subjectName.trim()) return;
    await api.createSubject(subjectName.trim());
    setSubjectName('');
    subjects.reload();
  };

  const addAvailability = async () => {
    await api.createAvailability(availability);
    setStatus('Availability added.');
    profile.reload();
  };

  return (
    <section className="two-col">
      <form className="panel form-grid" onSubmit={save}>
        <div className="panel-head"><h2>Student Profile</h2><button className="primary"><Check size={16} />Save</button></div>
        <Field label="Subjects"><MultiSelect options={subjects.data || []} value={form.subject_ids} onChange={(subject_ids) => setForm({ ...form, subject_ids })} /></Field>
        <Field label="Weak subjects"><MultiSelect options={subjects.data || []} value={form.weak_subject_ids} onChange={(weak_subject_ids) => setForm({ ...form, weak_subject_ids })} /></Field>
        <Field label="Skills"><input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, algebra, note-taking" /></Field>
        <Field label="Language"><input value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })} /></Field>
        <Field label="Skill level"><select value={form.skill_level} onChange={(e) => setForm({ ...form, skill_level: e.target.value })}><option>beginner</option><option>intermediate</option><option>advanced</option></select></Field>
        <Field label="Study goals"><textarea value={form.study_goals} onChange={(e) => setForm({ ...form, study_goals: e.target.value })} /></Field>
        <Field label="Bio"><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
        <Status error={profile.error}>{status}</Status>
      </form>
      <section className="stack">
        <div className="panel form-grid">
          <div className="panel-head"><h2>Subjects</h2></div>
          <div className="inline"><input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Add subject" /><button className="secondary" onClick={addSubject}><Plus size={16} /></button></div>
          <div className="chips">{(subjects.data || []).map((s) => <span key={s.id}>{s.name}</span>)}</div>
        </div>
        <div className="panel form-grid">
          <div className="panel-head"><h2>Availability</h2></div>
          <Field label="Day"><select value={availability.day} onChange={(e) => setAvailability({ ...availability, day: e.target.value })}><option value="mon">Monday</option><option value="tue">Tuesday</option><option value="wed">Wednesday</option><option value="thu">Thursday</option><option value="fri">Friday</option><option value="sat">Saturday</option><option value="sun">Sunday</option></select></Field>
          <Field label="Time block"><select value={availability.time_block} onChange={(e) => setAvailability({ ...availability, time_block: e.target.value })}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="weekend">Weekend</option></select></Field>
          <div className="split"><Field label="Start"><input type="time" value={availability.start_time} onChange={(e) => setAvailability({ ...availability, start_time: e.target.value })} /></Field><Field label="End"><input type="time" value={availability.end_time} onChange={(e) => setAvailability({ ...availability, end_time: e.target.value })} /></Field></div>
          <Field label="Hours"><input type="number" min="0.5" step="0.5" value={availability.study_hours} onChange={(e) => setAvailability({ ...availability, study_hours: e.target.value })} /></Field>
          <button className="secondary" onClick={addAvailability}><Plus size={16} />Add slot</button>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Students</h2></div>
          <List loading={students.loading} error={students.error} items={students.data?.slice(0, 6)} empty="No students found.">{(student) => <CompactRow title={student.student_name} meta={`${student.department} · Year ${student.year_of_study}`} />}</List>
        </div>
      </section>
    </section>
  );
}

function Matching() {
  const matches = useLoad(api.matches);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    await api.findMatches();
    await matches.reload();
    setBusy(false);
  };
  const respond = async (id, action) => {
    await api.respondMatch(id, action);
    matches.reload();
  };
  return (
    <section className="panel">
      <div className="panel-head"><h2>Study Partner Matching</h2><button className="primary" onClick={run} disabled={busy}><Search size={16} />{busy ? 'Matching...' : 'Find matches'}</button></div>
      <List loading={matches.loading} error={matches.error} items={matches.data} empty="Run matching to discover partners.">
        {(match) => <div className="match-row"><div><strong>{match.partner?.name}</strong><p>{match.common_subjects || 'Shared goals and schedule fit'}</p><small>{match.partner?.department} · {match.partner?.preferred_language}</small></div><div className="score">{match.match_score}%</div><div className="actions"><button onClick={() => respond(match.id, 'accept')}>Accept</button><button onClick={() => respond(match.id, 'reject')}>Reject</button></div></div>}
      </List>
    </section>
  );
}

function Chat() {
  const conversations = useLoad(api.conversations);
  const [active, setActive] = useState(null);
  const [partnerId, setPartnerId] = useState('');
  const [content, setContent] = useState('');
  const messages = useLoad(() => active ? api.messages(active) : Promise.resolve([]), [active]);

  const start = async () => {
    if (!partnerId) return;
    const convo = await api.startConversation(Number(partnerId));
    setActive(convo.id);
    setPartnerId('');
    conversations.reload();
  };
  const send = async () => {
    if (!active || !content.trim()) return;
    await api.sendMessage(active, content.trim());
    setContent('');
    messages.reload();
  };
  return (
    <section className="chat-layout">
      <aside className="panel">
        <div className="panel-head"><h2>Conversations</h2></div>
        <div className="inline"><input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} placeholder="Partner user id" /><button className="secondary" onClick={start}><Plus size={16} /></button></div>
        <List loading={conversations.loading} error={conversations.error} items={conversations.data} empty="No conversations yet.">{(c) => <button className={`conversation ${active === c.id ? 'active' : ''}`} onClick={() => setActive(c.id)}><strong>{c.partner_name}</strong><small>{c.last_message?.content || 'Open chat'}</small></button>}</List>
      </aside>
      <section className="panel chat-panel">
        <div className="panel-head"><h2>Messages</h2></div>
        <div className="messages">{(messages.data || []).map((m) => <div key={m.id} className={`bubble ${m.is_mine ? 'mine' : ''}`}><strong>{m.sender_name}</strong><p>{m.content || m.attachment_name}</p></div>)}</div>
        <div className="composer"><input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a message" /><button className="primary" onClick={send}><Send size={16} /></button></div>
      </section>
    </section>
  );
}

function Groups() {
  const groups = useLoad(api.groups);
  const subjects = useLoad(api.subjects);
  const [form, setForm] = useState({ name: '', description: '', subject: '', max_members: 6, is_private: false });
  const create = async (event) => {
    event.preventDefault();
    await api.createGroup({ ...form, subject: form.subject || null });
    setForm({ name: '', description: '', subject: '', max_members: 6, is_private: false });
    groups.reload();
  };
  const toggle = async (group) => {
    if (group.is_member) await api.leaveGroup(group.id); else await api.joinGroup(group.id);
    groups.reload();
  };
  return (
    <section className="two-col">
      <form className="panel form-grid" onSubmit={create}>
        <div className="panel-head"><h2>Create Group</h2><button className="primary"><Plus size={16} />Create</button></div>
        <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Subject"><select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}><option value="">General</option>{(subjects.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Max members"><input type="number" min="2" value={form.max_members} onChange={(e) => setForm({ ...form, max_members: Number(e.target.value) })} /></Field>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <label className="checkline"><input type="checkbox" checked={form.is_private} onChange={(e) => setForm({ ...form, is_private: e.target.checked })} />Private group</label>
      </form>
      <section className="panel">
        <div className="panel-head"><h2>Study Groups</h2></div>
        <List loading={groups.loading} error={groups.error} items={groups.data} empty="No groups yet.">{(group) => <div className="item-row"><div><strong>{group.name}</strong><p>{group.description}</p><small>{group.subject_name || 'General'} · {group.member_count}/{group.max_members}</small></div><button onClick={() => toggle(group)}>{group.is_member ? 'Leave' : 'Join'}<ChevronRight size={16} /></button></div>}</List>
      </section>
    </section>
  );
}

function Progress() {
  const subjects = useLoad(api.subjects);
  const logs = useLoad(api.logs);
  const topics = useLoad(api.topics);
  const leaderboard = useLoad(api.leaderboard);
  const [log, setLog] = useState({ subject: '', date: new Date().toISOString().slice(0, 10), hours: 1, notes: '' });
  const [topic, setTopic] = useState({ subject: '', topic_name: '' });

  const addLog = async (event) => {
    event.preventDefault();
    await api.createLog({ ...log, subject: log.subject || null });
    logs.reload();
  };
  const addTopic = async (event) => {
    event.preventDefault();
    if (!topic.subject) return;
    await api.createTopic({ ...topic, subject: topic.subject || null });
    setTopic({ subject: '', topic_name: '' });
    topics.reload();
  };

  return (
    <section className="three-col">
      <form className="panel form-grid" onSubmit={addLog}>
        <div className="panel-head"><h2>Study Log</h2><button className="primary"><Plus size={16} /></button></div>
        <SubjectSelect subjects={subjects.data || []} value={log.subject} onChange={(subject) => setLog({ ...log, subject })} />
        <Field label="Date"><input type="date" value={log.date} onChange={(e) => setLog({ ...log, date: e.target.value })} /></Field>
        <Field label="Hours"><input type="number" step="0.5" value={log.hours} onChange={(e) => setLog({ ...log, hours: e.target.value })} /></Field>
        <Field label="Notes"><textarea value={log.notes} onChange={(e) => setLog({ ...log, notes: e.target.value })} /></Field>
      </form>
      <form className="panel form-grid" onSubmit={addTopic}>
        <div className="panel-head"><h2>Completed Topic</h2><button className="primary"><Check size={16} /></button></div>
        <SubjectSelect subjects={subjects.data || []} value={topic.subject} onChange={(subject) => setTopic({ ...topic, subject })} required />
        <Field label="Topic"><input value={topic.topic_name} onChange={(e) => setTopic({ ...topic, topic_name: e.target.value })} required /></Field>
        <List items={topics.data?.slice(0, 5)} empty="No completed topics.">{(t) => <CompactRow title={t.topic_name} meta={t.subject_name || 'General'} />}</List>
      </form>
      <section className="panel">
        <div className="panel-head"><h2>Leaderboard</h2></div>
        <List loading={leaderboard.loading} error={leaderboard.error} items={leaderboard.data} empty="No study logs yet.">{(row) => <CompactRow title={`#${row.rank} ${row.name}`} meta={`${row.total_hours} hours · ${row.college}`} />}</List>
      </section>
    </section>
  );
}

function AiTools() {
  const subjects = useLoad(api.subjects);
  const suggestions = useLoad(api.suggestions);
  const history = useLoad(api.chatbotHistory);
  const quizzes = useLoad(api.quizzes);
  const [question, setQuestion] = useState('');
  const [quiz, setQuiz] = useState({ topic: '', subject: '', num_questions: 5 });

  const ask = async () => {
    if (!question.trim()) return;
    await api.askBot(question.trim());
    setQuestion('');
    history.reload();
  };
  const makeQuiz = async (event) => {
    event.preventDefault();
    await api.generateQuiz({ topic: quiz.topic, subject: quiz.subject || null, num_questions: Number(quiz.num_questions) });
    setQuiz({ topic: '', subject: '', num_questions: 5 });
    quizzes.reload();
  };
  const generateSuggestions = async () => {
    await api.generateSuggestions();
    suggestions.reload();
  };

  return (
    <section className="two-col">
      <div className="stack">
        <section className="panel">
          <div className="panel-head"><h2>Study Suggestions</h2><button className="primary" onClick={generateSuggestions}><Sparkles size={16} />Generate</button></div>
          <List loading={suggestions.loading} error={suggestions.error} items={suggestions.data} empty="No suggestions yet.">{(s) => <CompactRow title={s.text} meta={s.subject_name || 'AI suggestion'} />}</List>
        </section>
        <form className="panel form-grid" onSubmit={makeQuiz}>
          <div className="panel-head"><h2>Quiz Generator</h2><button className="primary"><Plus size={16} />Generate</button></div>
          <Field label="Topic"><input value={quiz.topic} onChange={(e) => setQuiz({ ...quiz, topic: e.target.value })} required /></Field>
          <SubjectSelect subjects={subjects.data || []} value={quiz.subject} onChange={(subject) => setQuiz({ ...quiz, subject })} />
          <Field label="Questions"><input type="number" min="1" max="15" value={quiz.num_questions} onChange={(e) => setQuiz({ ...quiz, num_questions: e.target.value })} /></Field>
          <List items={quizzes.data?.slice(0, 5)} empty="No quizzes yet.">{(q) => <CompactRow title={q.topic} meta={`${q.score ?? 0}% · ${q.questions?.length || 0} questions`} />}</List>
        </form>
      </div>
      <section className="panel chat-panel">
        <div className="panel-head"><h2>AI Chatbot</h2></div>
        <div className="messages">{(history.data || []).map((m) => <div key={m.id} className={`bubble ${m.role === 'user' ? 'mine' : ''}`}><strong>{m.role}</strong><p>{m.content}</p></div>)}</div>
        <div className="composer"><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask for study help" /><button className="primary" onClick={ask}><Send size={16} /></button></div>
      </section>
    </section>
  );
}

function Notifications() {
  const notifications = useLoad(api.notifications);
  const mark = async () => {
    await api.markAllRead();
    notifications.reload();
  };
  return (
    <section className="panel">
      <div className="panel-head"><h2>Notifications</h2><button className="secondary" onClick={mark}><Check size={16} />Mark all read</button></div>
      <List loading={notifications.loading} error={notifications.error} items={notifications.data} empty="No notifications.">{(n) => <div className={`item-row ${n.is_read ? '' : 'unread'}`}><div><strong>{n.title}</strong><p>{n.body}</p><small>{n.notification_type} · {new Date(n.created_at).toLocaleString()}</small></div></div>}</List>
    </section>
  );
}

function MultiSelect({ options, value, onChange }) {
  const selected = new Set(value.map(Number));
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange([...next]);
  };
  return <div className="option-grid">{options.map((option) => <button type="button" key={option.id} className={selected.has(option.id) ? 'selected' : ''} onClick={() => toggle(option.id)}>{option.name}</button>)}</div>;
}

function SubjectSelect({ subjects, value, onChange, required = false }) {
  return <Field label="Subject"><select value={value} onChange={(e) => onChange(e.target.value)} required={required}><option value="">{required ? 'Choose subject' : 'General'}</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>;
}

function List({ loading, error, items, empty, children }) {
  if (loading) return <div className="status">Loading...</div>;
  if (error) return <div className="status error">{error}</div>;
  if (!items || items.length === 0) return <div className="empty">{empty}</div>;
  return <div className="list">{items.map((item) => <React.Fragment key={item.id || item.rank || item.title}>{children(item)}</React.Fragment>)}</div>;
}

function CompactRow({ title, meta }) {
  return <div className="compact-row"><strong>{title}</strong><small>{meta}</small></div>;
}

createRoot(document.getElementById('root')).render(<App />);
