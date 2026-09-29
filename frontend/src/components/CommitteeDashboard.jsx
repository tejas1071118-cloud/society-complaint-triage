import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  Bell, Moon, Sun, Search, Filter, SortDesc, LayoutList, LayoutGrid, Kanban, X, 
  Flame, AlertTriangle, AlertCircle, Info, Paperclip, Clock, Users, User, MessageCircle, 
  Sparkles, CheckCircle2, Copy, Play, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// --- CONFIG & UTILS ---
const STATUSES = ['New', 'Assigned', 'In Progress', 'Resolved'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const getUrgencyIcon = (level) => {
  if (level === 'Critical') return <Flame className="w-3.5 h-3.5" />;
  if (level === 'High') return <AlertTriangle className="w-3.5 h-3.5" />;
  if (level === 'Medium') return <AlertCircle className="w-3.5 h-3.5" />;
  return <Info className="w-3.5 h-3.5" />;
};

const getCategoryIcon = (cat) => {
  const map = { Water: '💧', Lift: '🛗', Parking: '🚗', Noise: '🔊', Cleaning: '🧹', Security: '🛡️' };
  return map[cat] || '📋';
};

// --- SUBCOMPONENTS ---

function UrgencyBadge({ level, score }) {
  return (
    <span className={`urgency-badge urgency-${level}`}>
      {getUrgencyIcon(level)}
      {level} <span className="opacity-75 font-normal ml-0.5">({score})</span>
    </span>
  );
}

function StatTile({ title, value, icon, colorClass, onClick, active }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${active ? 'ring-2 ring-primary-500 border-transparent bg-primary-50' : 'bg-surface border-border hover:border-primary-300'}`}
    >
      <div className={`p-3 rounded-xl ${colorClass}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-text-main">{value}</div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</div>
      </div>
    </button>
  );
}

function IssueCard({ issue, members, onClick, onQuickAction, viewMode }) {
  const isOverdue = issue.is_overdue === 1;
  const timeOpen = formatDistanceToNow(new Date(issue.first_reported)) + ' ago';
  
  if (viewMode === 'compact') {
    return (
      <div onClick={onClick} className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between hover:border-primary-300 cursor-pointer transition-colors relative overflow-hidden group">
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 urgency-${issue.priority_level} opacity-70`} />
        <div className="flex items-center gap-3 pl-3">
          <UrgencyBadge level={issue.priority_level} score={issue.score} />
          <h3 className="font-semibold text-sm text-text-main truncate max-w-sm">{issue.summary || `${issue.category} issue`}</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>{issue.category}</span>
          <span className={isOverdue ? 'text-critical-text font-bold' : ''}>{timeOpen}</span>
          <span className="bg-background px-2 py-1 rounded-md">{issue.status}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick} 
      draggable={viewMode === 'board'}
      onDragStart={(e) => e.dataTransfer.setData('issueId', issue.id)}
      className={`bg-surface border border-border rounded-2xl p-4 hover:border-primary-400 hover:shadow-soft cursor-pointer transition-all relative overflow-hidden group ${issue.status === 'Analyzing...' ? 'animate-pulse' : ''}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 urgency-${issue.priority_level} opacity-80`} />
      
      <div className="pl-3 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {issue.status === 'Analyzing...' ? (
                <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" /> Analyzing...
                </span>
            ) : (
                <UrgencyBadge level={issue.priority_level} score={issue.score} />
            )}
            {issue.complaint_count > 1 && (
              <span className="bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Users className="w-3 h-3"/> +{issue.complaint_count - 1} similar
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted bg-background px-2 py-1 rounded-lg border border-border">{issue.status}</span>
        </div>

        <h3 className="font-bold text-text-main text-base mb-1.5 line-clamp-2 pr-4">{issue.summary || 'Awaiting analysis...'}</h3>
        
        {issue.suggested_action && issue.status !== 'Analyzing...' && (
          <p className="text-xs text-text-muted flex items-start gap-1.5 mb-4 bg-background p-2 rounded-lg border border-border/50">
            <Sparkles className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />
            <span className="line-clamp-1">{issue.suggested_action}</span>
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between text-xs font-medium text-text-muted border-t border-border">
          <div className="flex gap-3 items-center">
            <span className="flex items-center gap-1" title="Category"><span className="text-sm">{getCategoryIcon(issue.category)}</span> {issue.category}</span>
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-critical-text font-bold' : ''}`}><Clock className="w-3.5 h-3.5"/> {timeOpen}</span>
            {issue.attachments && issue.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded"><Paperclip className="w-3 h-3"/> {issue.attachments.length}</span>
            )}
          </div>
          
          <div className="flex items-center">
            {issue.assignee ? (
              <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-[10px]" title={members.find(m=>m.id===issue.assignee)?.name}>
                {members.find(m=>m.id===issue.assignee)?.name?.charAt(0) || <User className="w-3 h-3"/>}
              </div>
            ) : (
              <span className="text-[10px] uppercase border border-dashed border-border px-1.5 py-0.5 rounded text-text-muted">Unassigned</span>
            )}
          </div>
        </div>
        
        {/* Quick Actions Hover */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface p-1 rounded-lg shadow-soft border border-border">
            {!issue.assignee && <button onClick={(e) => { e.stopPropagation(); onQuickAction(issue.id, 'assign'); }} className="p-1.5 hover:bg-primary-50 hover:text-primary-600 rounded text-text-muted transition-colors"><User className="w-4 h-4" /></button>}
            {issue.status !== 'Resolved' && <button onClick={(e) => { e.stopPropagation(); onQuickAction(issue.id, 'resolve'); }} className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded text-text-muted transition-colors"><CheckCircle2 className="w-4 h-4" /></button>}
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function CommitteeDashboard() {
  const [issues, setIssues] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState({ status: 'checking', error: '' });
  
  // UI States
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // list | board | compact
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [showDailyBrief, setShowDailyBrief] = useState(false);
  const [dailyBriefText, setDailyBriefText] = useState('');

  // Refs for keyboard nav
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    fetchData();
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const fetchData = async () => {
    try {
      const [issuesRes, membersRes, healthRes] = await Promise.all([
        axios.get('http://localhost:3001/api/issues'),
        axios.get('http://localhost:3001/api/members'),
        axios.get('http://localhost:3001/api/ai/health').catch(() => ({ data: { status: 'offline' } }))
      ]);
      setIssues(issuesRes.data);
      setMembers(membersRes.data);
      setAiStatus(healthRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const updateIssueStatus = async (id, status) => {
    await axios.patch(`http://localhost:3001/api/issues/${id}`, { status });
    fetchData();
  };

  const handleQuickAction = async (id, action) => {
      if (action === 'resolve') updateIssueStatus(id, 'Resolved');
      if (action === 'assign' && members.length > 0) {
          await axios.patch(`http://localhost:3001/api/issues/${id}`, { assignee: members[0].id });
          fetchData();
      }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'j') {
        setFocusedIndex(i => Math.min(i + 1, filteredIssues.length - 1));
      } else if (e.key === 'k') {
        setFocusedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        setSelectedIssueId(filteredIssues[focusedIndex].id);
      } else if (e.key === 'Escape') {
        setSelectedIssueId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Derived Data
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);
    
    return {
      critical: issues.filter(i => i.priority_level === 'Critical' && i.status !== 'Resolved').length,
      overdue: issues.filter(i => i.is_overdue === 1 && i.status !== 'Resolved').length,
      newToday: issues.filter(i => new Date(i.first_reported) >= today).length,
      resolvedWeek: issues.filter(i => i.status === 'Resolved' && new Date(i.updated_at) >= thisWeek).length
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      if (search && !i.summary?.toLowerCase().includes(search.toLowerCase()) && !i.category.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeFilters.category && i.category !== activeFilters.category) return false;
      if (activeFilters.priority && i.priority_level !== activeFilters.priority) return false;
      if (activeFilters.status && i.status !== activeFilters.status) return false;
      if (activeFilters.media === 'true' && (!i.attachments || i.attachments.length === 0)) return false;
      if (activeFilters.overdue === 'true' && i.is_overdue !== 1) return false;
      return true;
    });
  }, [issues, search, activeFilters]);

  const topPinned = useMemo(() => {
    return issues.filter(i => i.status !== 'Resolved' && (i.priority_level === 'Critical' || i.is_overdue === 1)).slice(0, 3);
  }, [issues]);

  const loadDailyBrief = async () => {
      setShowDailyBrief(true);
      setDailyBriefText('Generating...');
      try {
          const res = await axios.get('http://localhost:3001/api/daily-brief');
          setDailyBriefText(res.data.brief);
      } catch(e) {
          setDailyBriefText(e.response?.data?.error || 'Failed to generate brief.');
      }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 glass border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center shadow-soft">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-lg text-text-main hidden sm:block">SocietyDesk</h1>
          
          <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${aiStatus.status === 'online' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${aiStatus.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            AI {aiStatus.status}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl text-text-muted hover:bg-surface-hover transition-colors">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className="p-2 rounded-xl text-text-muted hover:bg-surface-hover transition-colors relative">
            <Bell className="w-5 h-5" />
            {stats.critical > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-critical-text rounded-full border-2 border-surface"></span>}
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 border-2 border-surface shadow-sm ml-2"></div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* SUMMARY STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatTile title="Critical Open" value={stats.critical} icon={<Flame className="w-5 h-5 text-critical-text"/>} colorClass="bg-critical-bg" onClick={() => setActiveFilters({ priority: 'Critical', status: 'New' })} active={activeFilters.priority === 'Critical'} />
          <StatTile title="Overdue" value={stats.overdue} icon={<Clock className="w-5 h-5 text-high-text"/>} colorClass="bg-high-bg" onClick={() => setActiveFilters({ overdue: 'true' })} active={activeFilters.overdue === 'true'} />
          <StatTile title="New Today" value={stats.newToday} icon={<AlertCircle className="w-5 h-5 text-primary-600"/>} colorClass="bg-primary-50" onClick={() => setActiveFilters({})} />
          <StatTile title="Resolved (Week)" value={stats.resolvedWeek} icon={<CheckCircle2 className="w-5 h-5 text-green-600"/>} colorClass="bg-green-50" onClick={() => setActiveFilters({ status: 'Resolved' })} active={activeFilters.status === 'Resolved'} />
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-surface p-3 rounded-2xl border border-border shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              ref={searchRef}
              type="text" 
              placeholder="Search issues (Press '/')"
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-shadow"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            <div className="flex bg-background rounded-xl p-1 border border-border">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}><LayoutList className="w-4 h-4"/></button>
              <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-lg ${viewMode === 'board' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}><Kanban className="w-4 h-4"/></button>
              <button onClick={() => setViewMode('compact')} className={`p-1.5 rounded-lg ${viewMode === 'compact' ? 'bg-surface shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}><LayoutGrid className="w-4 h-4"/></button>
            </div>
            
            <div className="h-6 w-px bg-border mx-1"></div>
            
            <button onClick={() => setActiveFilters(f => ({...f, media: f.media ? '' : 'true'}))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap ${activeFilters.media ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>
              <Paperclip className="w-3.5 h-3.5"/> Media
            </button>
            
            <select 
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-text-muted focus:outline-none"
              value={activeFilters.category || ''} onChange={e => setActiveFilters(f => ({...f, category: e.target.value}))}
            >
              <option value="">All Categories</option>
              <option value="Water">Water</option>
              <option value="Lift">Lift</option>
              <option value="Security">Security</option>
            </select>
            
            <button onClick={loadDailyBrief} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-soft transition-colors whitespace-nowrap flex items-center gap-2 ml-auto">
              <FileText className="w-4 h-4"/> Daily Brief
            </button>
          </div>
        </div>

        {/* ACTIVE FILTERS CHIPS */}
        {Object.keys(activeFilters).some(k => activeFilters[k]) && (
            <div className="flex flex-wrap gap-2 mb-6 items-center">
                <span className="text-xs text-text-muted mr-1"><Filter className="w-3 h-3 inline mr-1"/> Active:</span>
                {Object.entries(activeFilters).map(([k, v]) => v ? (
                    <span key={k} className="bg-surface border border-border text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 text-text-main">
                        {k}: {v}
                        <button onClick={() => setActiveFilters(f => ({...f, [k]: ''}))}><X className="w-3 h-3 hover:text-critical-text"/></button>
                    </span>
                ) : null)}
                <button onClick={() => setActiveFilters({})} className="text-xs text-primary-600 hover:underline font-semibold ml-2">Clear all</button>
            </div>
        )}

        {/* MAIN CONTENT AREA */}
        {loading ? (
            <div className="grid gap-4">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-surface rounded-2xl border border-border animate-pulse"></div>)}
            </div>
        ) : filteredIssues.length === 0 ? (
            <div className="text-center py-20 bg-surface border border-border border-dashed rounded-3xl">
                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-text-main mb-1">All clear!</h3>
                <p className="text-sm text-text-muted">No issues match your current filters.</p>
            </div>
        ) : (
          <>
            {viewMode === 'board' ? (
                <div className="flex gap-4 overflow-x-auto pb-4 items-start">
                    {STATUSES.map(status => {
                        const colIssues = filteredIssues.filter(i => i.status === status);
                        return (
                            <div 
                                key={status} 
                                className="w-[320px] shrink-0 bg-background/50 border border-border rounded-2xl p-3 flex flex-col gap-3"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    const id = e.dataTransfer.getData('issueId');
                                    if (id) updateIssueStatus(id, status);
                                }}
                            >
                                <div className="flex justify-between items-center px-1 mb-1">
                                    <h3 className="font-bold text-sm text-text-main">{status}</h3>
                                    <span className="bg-surface border border-border text-text-muted text-xs font-bold px-2 py-0.5 rounded-full">{colIssues.length}</span>
                                </div>
                                {colIssues.map(i => <IssueCard key={i.id} issue={i} members={members} onClick={() => setSelectedIssueId(i.id)} onQuickAction={handleQuickAction} viewMode="list" />)}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-8">
                        {/* PINNED SECTION */}
                        {!Object.keys(activeFilters).some(k=>activeFilters[k]) && !search && topPinned.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2 uppercase tracking-wider">
                                    <Flame className="w-4 h-4 text-critical-text" /> Needs Attention Now
                                </h2>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {topPinned.map(i => <IssueCard key={i.id} issue={i} members={members} onClick={() => setSelectedIssueId(i.id)} onQuickAction={handleQuickAction} viewMode="list" />)}
                                </div>
                            </section>
                        )}
                        
                        <section>
                            <h2 className="text-sm font-bold text-text-main mb-4 uppercase tracking-wider border-b border-border pb-2">Work Queue</h2>
                            <div className={`grid gap-3 ${viewMode === 'compact' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                {filteredIssues.filter(i => !topPinned.find(p=>p.id===i.id) || search || Object.keys(activeFilters).some(k=>activeFilters[k])).map((i, idx) => (
                                    <div key={i.id} className={focusedIndex === idx ? 'ring-2 ring-primary-500 rounded-2xl' : ''}>
                                        <IssueCard issue={i} members={members} onClick={() => setSelectedIssueId(i.id)} onQuickAction={handleQuickAction} viewMode={viewMode} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            )}
          </>
        )}
      </main>

      {/* DETAIL DRAWER */}
      {selectedIssueId && (
        <DetailDrawer 
            issueId={selectedIssueId} 
            members={members} 
            onClose={() => setSelectedIssueId(null)} 
            onUpdate={fetchData} 
        />
      )}

      {/* DAILY BRIEF MODAL */}
      {showDailyBrief && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface w-full max-w-lg rounded-3xl shadow-float overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-border flex justify-between items-center bg-primary-50">
                      <h2 className="font-bold text-primary-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary-600"/> Daily Digest</h2>
                      <button onClick={() => setShowDailyBrief(false)} className="text-primary-700 hover:bg-primary-100 p-1.5 rounded-lg"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                      <p className="text-text-main whitespace-pre-wrap text-sm leading-relaxed">{dailyBriefText}</p>
                  </div>
                  <div className="p-4 border-t border-border bg-surface-hover">
                      <button onClick={() => { navigator.clipboard.writeText(dailyBriefText); alert('Copied!'); }} className="w-full bg-surface border border-border text-text-main font-bold py-2.5 rounded-xl shadow-sm hover:border-primary-300 flex items-center justify-center gap-2">
                          <Copy className="w-4 h-4"/> Copy to Clipboard
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}

// --- DETAIL DRAWER COMPONENT ---

function DetailDrawer({ issueId, members, onClose, onUpdate }) {
    const [issue, setIssue] = useState(null);
    const [mediaItems, setMediaItems] = useState([]);
    const [lightboxIdx, setLightboxIdx] = useState(-1);
    
    // Reply
    const [draft, setDraft] = useState('');
    const [drafting, setDrafting] = useState(false);

    // Override
    const [showOverride, setShowOverride] = useState(false);
    const [overrideLevel, setOverrideLevel] = useState('');
    const [overrideReason, setOverrideReason] = useState('');

    useEffect(() => {
        const fetchDetail = async () => {
            const res = await axios.get(`http://localhost:3001/api/issues/${issueId}`);
            setIssue(res.data);
            const allMedia = [];
            if (res.data.complaints) {
                res.data.complaints.forEach(c => { if (c.attachments) allMedia.push(...c.attachments); });
            }
            setMediaItems(allMedia);
        };
        fetchDetail();
    }, [issueId]);

    const handleUpdate = async (field, val) => {
        await axios.patch(`http://localhost:3001/api/issues/${issueId}`, { [field]: val });
        const res = await axios.get(`http://localhost:3001/api/issues/${issueId}`);
        setIssue(res.data);
        onUpdate();
    };

    const handleOverrideSubmit = async () => {
        if (!overrideReason) return alert('Reason required');
        await axios.post(`http://localhost:3001/api/issues/${issueId}/override`, { priority_level: overrideLevel, reason: overrideReason });
        setShowOverride(false);
        onUpdate();
        const res = await axios.get(`http://localhost:3001/api/issues/${issueId}`);
        setIssue(res.data);
    };

    const generateDraft = async () => {
        setDrafting(true);
        try {
            const res = await axios.post(`http://localhost:3001/api/issues/${issueId}/draft-reply`);
            setDraft(res.data.draft);
        } catch(e) {}
        setDrafting(false);
    };

    const sendReply = async () => {
        await axios.post(`http://localhost:3001/api/issues/${issueId}/send-reply`, { message: draft });
        setDraft('');
        alert('Sent!');
    };

    if (!issue) return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-surface shadow-float z-50 flex items-center justify-center border-l border-border animate-slide-in">
            <div className="animate-pulse flex flex-col items-center"><div className="w-8 h-8 rounded-full border-4 border-primary-500 border-t-transparent animate-spin mb-4"></div> Loading details...</div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="relative w-full sm:w-[500px] lg:w-[600px] bg-surface h-full shadow-float flex flex-col animate-slide-in overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-text-muted bg-background px-2 py-1 rounded border border-border">#{issue.id.substring(0,6)}</span>
                        <select className="bg-background border border-border text-sm font-bold px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none" value={issue.status} onChange={e => handleUpdate('status', e.target.value)}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <button onClick={onClose} className="p-2 bg-background hover:bg-surface-hover rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* Header Section */}
                    <div>
                        <div className="flex gap-2 items-center mb-3 relative">
                            <UrgencyBadge level={issue.priority_level} score={issue.score} />
                            <span className="text-xs bg-background border border-border px-2 py-1 rounded-full font-medium">{issue.category}</span>
                            
                            <button onClick={() => {setShowOverride(!showOverride); setOverrideLevel(issue.priority_level);}} className="ml-auto text-xs font-semibold text-primary-600 hover:bg-primary-50 px-2 py-1 rounded transition-colors">
                                Override
                            </button>
                            
                            {showOverride && (
                                <div className="absolute top-10 right-0 bg-surface border border-border shadow-float rounded-2xl p-4 w-64 z-20">
                                    <h4 className="text-xs font-bold uppercase text-text-muted mb-2">Manual Override</h4>
                                    <div className="flex bg-background rounded-lg p-1 mb-3">
                                        {PRIORITIES.map(p => (
                                            <button key={p} onClick={() => setOverrideLevel(p)} className={`flex-1 text-[10px] py-1 rounded font-bold ${overrideLevel === p ? `urgency-${p} shadow-sm` : 'text-text-muted hover:bg-surface-hover'}`}>{p}</button>
                                        ))}
                                    </div>
                                    <input placeholder="Reason required..." value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} className="w-full text-xs p-2 border border-border rounded-lg mb-2 focus:ring-2 focus:ring-primary-500/20 outline-none"/>
                                    <div className="flex gap-2">
                                        <button onClick={()=>setShowOverride(false)} className="flex-1 py-1.5 text-xs font-semibold text-text-muted hover:bg-background rounded-lg">Cancel</button>
                                        <button onClick={handleOverrideSubmit} className="flex-1 py-1.5 text-xs font-bold bg-primary-600 text-white rounded-lg shadow-sm disabled:opacity-50" disabled={!overrideReason}>Save</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <h2 className="text-xl font-bold text-text-main leading-tight mb-3">{issue.summary}</h2>
                        
                        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex gap-3">
                            <Sparkles className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-primary-900 mb-1">AI Reasoning</p>
                                <p className="text-sm text-primary-800/80 leading-relaxed">{issue.reasoning}</p>
                                <div className="flex gap-4 mt-3 text-xs font-medium text-primary-700">
                                    <span>Safety: {issue.safety_risk}/10</span>
                                    <span>Impact: {issue.service_impact}/10</span>
                                    {issue.vulnerable_residents===1 && <span className="bg-primary-200/50 px-2 rounded">Vulnerable involved</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Media Gallery */}
                    {mediaItems.length > 0 && (
                        <div className="bg-surface rounded-2xl border border-border p-4">
                            <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2"><Paperclip className="w-4 h-4"/> Evidence ({mediaItems.length})</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                {mediaItems.map((m, idx) => (
                                    <div key={m.id} onClick={() => setLightboxIdx(idx)} className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-border cursor-pointer relative group">
                                        {m.kind === 'video' ? (
                                            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                                <Play className="w-8 h-8 text-white opacity-80 group-hover:scale-110 transition-transform" />
                                            </div>
                                        ) : (
                                            <img src={`http://localhost:3001/uploads/${m.file_path}`} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" alt="evidence"/>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Grouped Complaints */}
                    <div>
                        <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2"><Users className="w-4 h-4"/> Grouped Complaints ({issue.complaints?.length || 0})</h3>
                        <div className="space-y-3">
                            {issue.complaints?.map(c => (
                                <div key={c.id} className="bg-background rounded-xl p-4 border border-border">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-sm text-text-main">{c.flat_number} <span className="text-text-muted font-normal">({c.name})</span></span>
                                        <span className="text-xs text-text-muted">{new Date(c.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-sm text-text-main italic mb-3">"{c.description}"</p>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] uppercase font-bold text-text-muted bg-surface px-2 py-0.5 rounded border border-border">{c.language_detected}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Reply Box */}
                    <div className="bg-surface rounded-2xl border border-border p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-text-main mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> Reply to Residents</h3>
                        
                        {!draft ? (
                            <button onClick={generateDraft} disabled={drafting} className="w-full py-3 bg-primary-50 text-primary-700 font-bold text-sm rounded-xl hover:bg-primary-100 transition-colors flex items-center justify-center gap-2">
                                {drafting ? <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div> : <Sparkles className="w-4 h-4"/>}
                                {drafting ? 'Generating...' : 'Draft AI Reply'}
                            </button>
                        ) : (
                            <div className="space-y-3 animate-fade-in">
                                <textarea 
                                    className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none resize-none min-h-[100px]"
                                    value={draft} onChange={e=>setDraft(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={()=>setDraft('')} className="flex-1 py-2 text-sm font-bold text-text-muted bg-background hover:bg-surface-hover rounded-xl transition-colors">Discard</button>
                                    <button onClick={sendReply} className="flex-1 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm rounded-xl transition-colors flex justify-center items-center gap-2">
                                        <Send className="w-4 h-4"/> Send to All
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Action Bar */}
                <div className="p-4 border-t border-border bg-surface shrink-0 flex gap-3">
                    <div className="flex-1">
                        <select 
                            className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary-500/20 outline-none appearance-none"
                            value={issue.assignee || ''} onChange={e => handleUpdate('assignee', e.target.value)}
                        >
                            <option value="">Unassigned</option>
                            {members.map(m => <option key={m.id} value={m.id}>Assign to {m.name}</option>)}
                        </select>
                    </div>
                    {issue.status !== 'Resolved' && (
                        <button onClick={() => handleUpdate('status', 'Resolved')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5"/> Resolve
                        </button>
                    )}
                </div>
            </div>

            {/* Lightbox Overlay */}
            {lightboxIdx >= 0 && (
                <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                    <button onClick={() => setLightboxIdx(-1)} className="absolute top-4 right-4 text-white/50 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[70]"><X className="w-6 h-6"/></button>
                    
                    <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
                        {lightboxIdx > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i - 1); }} className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors z-[70]">
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                        )}
                        
                        <div className="w-full h-full max-h-[85vh] flex items-center justify-center p-12">
                            {mediaItems[lightboxIdx].kind === 'video' ? (
                                <video src={`http://localhost:3001/uploads/${mediaItems[lightboxIdx].file_path}`} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-float ring-1 ring-white/10" />
                            ) : (
                                <img src={`http://localhost:3001/uploads/${mediaItems[lightboxIdx].file_path}`} className="max-w-full max-h-full object-contain rounded-2xl shadow-float ring-1 ring-white/10" alt="Evidence view" />
                            )}
                        </div>
                        
                        {lightboxIdx < mediaItems.length - 1 && (
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i + 1); }} className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors z-[70]">
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        )}
                    </div>
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-semibold tracking-wide ring-1 ring-white/10">
                        {lightboxIdx + 1} / {mediaItems.length}
                    </div>
                </div>
            )}
        </div>
    );
}
