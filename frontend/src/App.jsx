import React from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { NavigationProvider, usePathname } from './navigation'
import { resolveRoute } from './routing'
import Home from './pages/Home'
import About from './pages/About'
import BookDetail from './pages/BookDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { AuthProvider } from './context/AuthContext'

function AppContent() {
  const pathname = usePathname()
  const route = resolveRoute(pathname)

  let page = <Home />
  if (route.name === 'about') {
    page = <About />
  } else if (route.name === 'book') {
    page = <BookDetail id={route.params.id} />
  } else if (route.name === 'login') {
    page = <Login />
  } else if (route.name === 'register') {
    page = <Register />
  } else if (route.name === 'forgot_password') {
    page = <ForgotPassword />
  } else if (route.name === 'reset_password') {
    page = <ResetPassword token={route.params.token} />
  }

  const isAuthPage = ['login', 'register', 'forgot_password', 'reset_password'].includes(route.name)

  if (isAuthPage) {
    return (
      <div className="app-container auth-layout">
        <main>{page}</main>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Header />
      <main>{page}</main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  )
}

export default App
