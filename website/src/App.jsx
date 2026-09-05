import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AuthModal from './components/AuthModal.jsx'
import AuthToasts from './components/AuthToasts.jsx'
import ChatWidget from './components/chat/ChatWidget.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import ToastProvider from './context/ToastProvider.jsx'
import { useAuth } from './context/authContext.js'
import Home from './pages/Home.jsx'
import MarketplacePage from './pages/MarketplacePage.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/marketplace',
    element: <MarketplacePage />,
  },
])

function AppModals() {
  const { isAuthModalOpen } = useAuth()
  // remounting on open guarantees fresh, empty form state every time
  return isAuthModalOpen ? <AuthModal /> : null
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <AppModals />
        <AuthToasts />
        <ChatWidget />
      </AuthProvider>
    </ToastProvider>
  )
}
