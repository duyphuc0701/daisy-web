import React from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { NavigationProvider, usePathname } from './navigation'
import { resolveRoute } from './routing'
import Home from './pages/Home'
import About from './pages/About'
import BookDetail from './pages/BookDetail'

function AppContent() {
  const pathname = usePathname()
  const route = resolveRoute(pathname)

  let page = <Home />
  if (route.name === 'about') {
    page = <About />
  } else if (route.name === 'book') {
    page = <BookDetail id={route.params.id} />
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
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  )
}

export default App
