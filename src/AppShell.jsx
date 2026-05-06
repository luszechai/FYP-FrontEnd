import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  FlaskConical,
  History,
  Inbox,
  Menu,
  MessageSquare,
  Plus,
  User,
  Zap,
} from 'lucide-react'
import ChatView from './ChatView'
import EmailsPage from './pages/EmailsPage'
import StatsView from './pages/StatsView'
import HistoryView from './pages/HistoryView'
import EvaluationDashboard from './components/evaluation/EvaluationDashboard'
import RbsLoginModal from './components/RbsLoginModal'
import { clearMemory, getEmails, getProviders, rbsLogout, rbsStatus } from './services/api'

const NavItem = ({ icon: Icon, label, active, onClick, badge, collapsed = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full group flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg transition-all duration-150 ${
      active
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <div className={`flex items-center ${collapsed ? 'gap-0' : 'gap-3'}`}>
      <Icon size={18} className={active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
      {!collapsed && <span className={`text-sm font-medium ${active ? 'text-indigo-700' : ''}`}>{label}</span>}
    </div>
    {!collapsed && badge !== undefined && badge !== null && (
      <span
        className={`text-[10px] px-1.5 py-0.5 font-bold rounded ${
          active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
)

export default function AppShell() {
  const [view, setView] = useState('chat') // chat | emails | stats | history | evaluation
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openEmailId, setOpenEmailId] = useState('')
  const [showRbsLogin, setShowRbsLogin] = useState(false)

  const [emailTotal, setEmailTotal] = useState(null)
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('deepseek')

  const [rbsLoggedIn, setRbsLoggedIn] = useState(false)
  const [rbsUsername, setRbsUsername] = useState('')

  const [conversationId, setConversationId] = useState(() => `conv_${Date.now()}`)
  const [chatMessages, setChatMessages] = useState([])
  const [archivedConversations, setArchivedConversations] = useState(() => {
    try {
      const raw = localStorage.getItem('sfu_conversations')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('sfu_conversations', JSON.stringify(archivedConversations))
    } catch {
      // ignore
    }
  }, [archivedConversations])

  useEffect(() => {
    rbsStatus()
      .then((data) => {
        setRbsLoggedIn(!!data.logged_in)
        setRbsUsername(data.username || '')
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    getProviders()
      .then((data) => {
        setProviders(data.providers || [])
        if (data.default) setSelectedProvider(data.default)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    getEmails()
      .then((data) => setEmailTotal(typeof data.total === 'number' ? data.total : null))
      .catch(() => setEmailTotal(null))
  }, [])

  const title = useMemo(() => {
    if (view === 'chat') return 'Assistant'
    if (view === 'emails') return 'Email'
    if (view === 'stats') return 'System Stats'
    if (view === 'history') return 'History'
    if (view === 'evaluation') return 'RAG Evaluation'
    return 'SFU Portal'
  }, [view])

  const openEmailFromChatSource = useCallback((emailId) => {
    const id = String(emailId || '').trim()
    if (!id) return
    setOpenEmailId(id)
    setView('emails')
  }, [])

  const handleRbsClick = useCallback(async () => {
    if (!rbsLoggedIn) {
      setShowRbsLogin(true)
      return
    }
    try {
      await rbsLogout()
    } catch (err) {
      console.error('RBS logout error:', err)
    }
    setRbsLoggedIn(false)
    setRbsUsername('')
  }, [rbsLoggedIn])

  const startNewConversation = useCallback(async () => {
    const hasAnything = Array.isArray(chatMessages) && chatMessages.length > 0
    if (hasAnything) {
      const firstUser = chatMessages.find((m) => m.role === 'user')?.content || 'Conversation'
      const title = String(firstUser).slice(0, 60) || 'Conversation'
      const archived = {
        id: conversationId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: chatMessages,
      }
      setArchivedConversations((prev) => [archived, ...prev].slice(0, 200))
    }

    // Always return to chat view when starting fresh
    setView('chat')
    setConversationId(`conv_${Date.now()}`)
    setChatMessages([])
    setOpenEmailId('')
    try {
      await clearMemory()
    } catch {
      // ignore
    }
  }, [chatMessages, conversationId])

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden">
      <nav
        className={`h-full bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50 ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20 lg:translate-x-0 -translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shrink-0">
            <Zap size={18} fill="currentColor" />
          </div>
          {sidebarOpen && <span className="font-bold tracking-tight text-slate-800">SFU Portal</span>}
        </div>

        <div className="flex-1 px-3 space-y-1 mt-2">
          <NavItem
            icon={MessageSquare}
            label="Admission Chat"
            active={view === 'chat'}
            onClick={() => setView('chat')}
            collapsed={!sidebarOpen}
          />
          <NavItem
            icon={Inbox}
            label="Email"
            active={view === 'emails'}
            badge={emailTotal === null ? undefined : emailTotal}
            onClick={() => setView('emails')}
            collapsed={!sidebarOpen}
          />
          <NavItem
            icon={BarChart3}
            label="System Stats"
            active={view === 'stats'}
            onClick={() => setView('stats')}
            collapsed={!sidebarOpen}
          />
          <NavItem
            icon={History}
            label="History"
            active={view === 'history'}
            onClick={() => setView('history')}
            collapsed={!sidebarOpen}
          />
          <NavItem
            icon={FlaskConical}
            label="RAG Evaluation"
            active={view === 'evaluation'}
            onClick={() => setView('evaluation')}
            collapsed={!sidebarOpen}
          />
        </div>

        <div className="p-3 border-t border-slate-100 space-y-1">
          <NavItem
            icon={Clock}
            label={rbsLoggedIn ? `RBS: ${rbsUsername}` : 'RBS Login'}
            onClick={handleRbsClick}
            collapsed={!sidebarOpen}
          />
        </div>
      </nav>

      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors"
            >
              <Menu size={18} />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{title}</h2>
          </div>

          <div className="flex items-center gap-4">
            {view === 'chat' && (
              <button
                type="button"
                onClick={startNewConversation}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                title="Start a new conversation"
              >
                <Plus size={14} />
                New Conversation
              </button>
            )}
            <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
              <CheckCircle2 size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
            </div>
            {providers.length > 1 && (
              <div className="relative group">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="appearance-none text-sm font-medium text-slate-600 hover:text-slate-900 bg-transparent pr-6 pl-1 py-1 rounded focus:outline-none cursor-pointer"
                  title="Select AI Model"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                />
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {view === 'chat' && (
            <ChatView
              key={conversationId}
              selectedProvider={selectedProvider}
              onOpenEmailSource={openEmailFromChatSource}
              messages={chatMessages}
              setMessages={setChatMessages}
              onClearConversation={startNewConversation}
            />
          )}
          {view === 'emails' && (
            <EmailsPage
              embedded
              selectedId={openEmailId}
              onSelectEmail={(id) => setOpenEmailId(id)}
              onRequestBack={() => setView('chat')}
            />
          )}
          {view === 'stats' && <StatsView />}
          {view === 'history' && (
            <HistoryView
              conversations={archivedConversations}
              onStartNewConversation={startNewConversation}
            />
          )}
          {view === 'evaluation' && (
            <EvaluationDashboard isOpen onClose={() => setView('chat')} />
          )}
        </div>
      </main>

      <RbsLoginModal
        isOpen={showRbsLogin}
        onClose={() => setShowRbsLogin(false)}
        onLoginSuccess={(user) => {
          setRbsLoggedIn(true)
          setRbsUsername(user)
        }}
      />
    </div>
  )
}

