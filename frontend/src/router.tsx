import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './ui/AppLayout'
import { AdminPendingVerifications } from './ui/AdminPendingVerifications'
import { AdminSystemHealth } from './ui/AdminSystemHealth'
import { HeirHandover } from './ui/HeirHandover'
import { Landing } from './ui/Landing'
import { Login } from './ui/Login'
import { RequireAuth } from './ui/RequireAuth'
import { RequireAdmin } from './ui/RequireAdmin'
import { Privacy } from './ui/Privacy'
import { SecurityAudit } from './ui/SecurityAudit'
import { Support } from './ui/Support'
import { Terms } from './ui/Terms'
import { VaultAssetEntry } from './ui/VaultAssetEntry'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'vault', element: <RequireAuth><VaultAssetEntry /></RequireAuth> },
      { path: 'heir', element: <RequireAuth><HeirHandover /></RequireAuth> },
      { path: 'security-audit', element: <SecurityAudit /> },
      { path: 'terms', element: <Terms /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'support', element: <Support /> },
      { path: 'admin/pending-verifications', element: <RequireAdmin><AdminPendingVerifications /></RequireAdmin> },
      { path: 'admin/system-health', element: <RequireAdmin><AdminSystemHealth /></RequireAdmin> },
    ],
  },
])
