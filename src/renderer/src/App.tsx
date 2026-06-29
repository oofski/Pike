import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { Navbar } from '@/components/Navbar'
import { Spinner } from '@/components/ui/Spinner'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import CalendarPage from '@/pages/Calendar'
import PnmsPage from '@/pages/Pnms'
import PnmProfilePage from '@/pages/PnmProfile'
import ImportPnmsPage from '@/pages/ImportPnms'
import VotingPage from '@/pages/Voting'
import VotingPresentPage from '@/pages/VotingPresent'
import VotePage from '@/pages/Vote'
import TextingPage from '@/pages/Texting'
import TextingHistoryPage from '@/pages/TextingHistory'
import SettingsPage from '@/pages/Settings'
import SignInAdminPage from '@/pages/SignInAdmin'

function Protected({ children }: { children: React.ReactNode }): JSX.Element {
  const { user, initialized } = useAuth()
  const location = useLocation()
  if (!initialized) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

function AppLayout(): JSX.Element {
  return (
    <div className="app-bg min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default function App(): JSX.Element {
  const init = useAuth((s) => s.init)
  useEffect(() => {
    void init()
  }, [init])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Full-screen projector mode — protected, but no app chrome */}
      <Route
        path="/voting/present"
        element={
          <Protected>
            <VotingPresentPage />
          </Protected>
        }
      />

      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/pnms" element={<PnmsPage />} />
        <Route path="/pnms/import" element={<ImportPnmsPage />} />
        <Route path="/pnms/:id" element={<PnmProfilePage />} />
        <Route path="/voting" element={<VotingPage />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/texting" element={<TextingPage />} />
        <Route path="/texting/history" element={<TextingHistoryPage />} />
        <Route path="/signin-admin/:sessionId" element={<SignInAdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
