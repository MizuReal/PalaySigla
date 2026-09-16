import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AuthModal from './components/AuthModal'
import AuthToasts from './components/AuthToasts'
import ChatWidget from './components/chat/ChatWidget'
import AuthProvider from './context/AuthProvider'
import ToastProvider from './context/ToastProvider'
import { useAuth } from './context/authContext'
import Home from './pages/Home'
import MarketplacePage from './pages/MarketplacePage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import RouteErrorPage from './pages/RouteErrorPage'

const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/marketplace',
        element: <MarketplacePage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
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
