import { useVaultCheckInOncePerSession } from './hooks/useVaultCheckInOncePerSession'

export default function App() {
  useVaultCheckInOncePerSession()
  return null
}

