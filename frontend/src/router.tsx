import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './ui/AppLayout'
import { AdminNewsletter } from './ui/AdminNewsletter'
import { AdminPendingVerifications } from './ui/AdminPendingVerifications'
import { AdminSystemHealth } from './ui/AdminSystemHealth'
import { DigitalEstatePlanning } from './ui/DigitalEstatePlanning'
import { HeirHandover } from './ui/HeirHandover'
import { HowItWorks } from './ui/HowItWorks'
import { Landing } from './ui/Landing'
import { Login } from './ui/Login'
import { RequireAuth } from './ui/RequireAuth'
import { RequireAdmin } from './ui/RequireAdmin'
import { Privacy } from './ui/Privacy'
import { Pricing } from './ui/Pricing'
import { Security } from './ui/Security'
import { Support } from './ui/Support'
import { Terms } from './ui/Terms'
import { UkGuide } from './ui/UkGuide'
import { VaultAssetEntry } from './ui/VaultAssetEntry'
import { ForProfessionals } from './ui/ForProfessionals'

export const router = createBrowserRouter([
  { path: '/digital-estate-planning', element: <DigitalEstatePlanning /> },
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'vault', element: <RequireAuth><VaultAssetEntry /></RequireAuth> },
      { path: 'heir', element: <RequireAuth><HeirHandover /></RequireAuth> },
      { path: 'security', element: <Security /> },
      { path: 'security-audit', element: <Navigate to="/security" replace /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'for-professionals', element: <ForProfessionals /> },
      { path: 'uk-guide', element: <UkGuide /> },
      { path: 'pricing', element: <Pricing /> },
      { path: 'terms', element: <Terms /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'support', element: <Support /> },
      { path: 'admin/pending-verifications', element: <RequireAdmin><AdminPendingVerifications /></RequireAdmin> },
      { path: 'admin/system-health', element: <RequireAdmin><AdminSystemHealth /></RequireAdmin> },
      { path: 'admin/newsletter', element: <RequireAdmin><AdminNewsletter /></RequireAdmin> },
    ],
  },
])
