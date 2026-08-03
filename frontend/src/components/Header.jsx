import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, MoonStar, SunMedium } from 'lucide-react'
import { Link, NavLink, useNavigate, useSearchParams } from '../navigation'
import SearchBar from './SearchBar'
import { useAuth } from '../context/AuthContext'

function Header({ theme, onToggleTheme }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [searchParams] = useSearchParams()
  const currentCategory = searchParams.get('category') || 'Tất cả'
  const [categories, setCategories] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)

  // Fetch categories list from backend
  useEffect(() => {
    fetch('/api/categories')
      .then(res => {
        if (!res.ok) throw new Error('Network error')
        return res.json()
      })
      .then(data => setCategories(data))
      .catch(err => console.error('Error fetching categories:', err))
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCategorySelect = (categoryName) => {
    setDropdownOpen(false)
    if (categoryName === 'Tất cả') {
      navigate('/')
    } else {
      navigate(`/?category=${encodeURIComponent(categoryName)}`)
    }
    // Return focus to toggle button
    dropdownRef.current?.querySelector('button')?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setDropdownOpen(false)
      setActiveIndex(-1)
      dropdownRef.current?.querySelector('button')?.focus()
    } else if (e.key === 'ArrowDown' && dropdownOpen) {
      e.preventDefault()
      setActiveIndex(0)
      const firstItem = menuRef.current?.querySelector('button')
      firstItem?.focus()
      firstItem?.scrollIntoView({ block: 'nearest' })
    }
  }

  const handleMenuItemKeyDown = (e, index) => {
    const items = menuRef.current?.querySelectorAll('button')
    const totalItems = items.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % totalItems
      setActiveIndex(nextIndex)
      items[nextIndex]?.focus()
      items[nextIndex]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (index - 1 + totalItems) % totalItems
      setActiveIndex(prevIndex)
      items[prevIndex]?.focus()
      items[prevIndex]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      items[index]?.click()
    } else if (e.key === 'Tab') {
      setDropdownOpen(false)
      setActiveIndex(-1)
    }
  }

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen)
    if (!dropdownOpen) {
      // When opening, set active to first item or current selection
      const currentIdx = categories.indexOf(currentCategory) + 1 // +1 for "Tất cả" at index 0
      setActiveIndex(currentIdx > 0 ? currentIdx : 0)
    } else {
      setActiveIndex(-1)
    }
  }

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="logo-section" onClick={() => setDropdownOpen(false)}>
          <img src="/images/logo/logo_hsv.png" alt="Logo Hội Sinh Viên" className="brand-logo" />
          <img src="/images/favicon.png" alt="DAISY Favicon" className="favicon-logo" />
          <img src="/images/anhmattran.jpg" alt="Logo Mặt Trận" className="brand-logo" />
        </Link>

        <div className="header-actions">
          <nav>
            <ul className="nav-menu">
              <li>
                <NavLink
                  to="/"
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  Trang chủ
                </NavLink>
              </li>

              <li
                className={`dropdown-container ${dropdownOpen ? 'open' : ''}`}
                ref={dropdownRef}
              >
                <button
                  className="nav-item dropdown-toggle"
                  onClick={handleDropdownToggle}
                  onKeyDown={handleKeyDown}
                  style={{ background: 'none', border: 'none', font: 'inherit' }}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="listbox"
                  aria-controls="category-listbox"
                  id="category-menu-button"
                >
                  Thể loại sách <ChevronDown size={14} />
                </button>
                <ul
                  className="dropdown-menu"
                  role="listbox"
                  aria-labelledby="category-menu-button"
                  aria-activedescendant={activeIndex >= 0 ? `category-option-${activeIndex}` : undefined}
                  id="category-listbox"
                  ref={menuRef}
                >
                  <li role="presentation">
                    <button
                      id="category-option-0"
                      className="dropdown-item"
                      onClick={() => handleCategorySelect('Tất cả')}
                      onKeyDown={(e) => handleMenuItemKeyDown(e, 0)}
                      style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', font: 'inherit' }}
                      role="option"
                      aria-selected={currentCategory === 'Tất cả'}
                    >
                      Tất cả
                    </button>
                  </li>
                  {categories.map((cat, idx) => (
                    <li key={idx} role="presentation">
                      <button
                        id={`category-option-${idx + 1}`}
                        className="dropdown-item"
                        onClick={() => handleCategorySelect(cat)}
                        onKeyDown={(e) => handleMenuItemKeyDown(e, idx + 1)}
                        style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', font: 'inherit' }}
                        role="option"
                        aria-selected={currentCategory === cat}
                      >
                        {cat}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>

              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  Giới thiệu
                </NavLink>
              </li>

              {user && (
                <li>
                  <NavLink
                    to="/activity"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    aria-label="Trang hoạt động và thư viện cá nhân"
                  >
                    Hoạt động
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>

          <SearchBar />

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang light mode' : 'Chuyển sang dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
          </button>

          {/* Auth Actions */}
          <div className="header-auth" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {user ? (
              <>
                <span className="btn btn-secondary" style={{ cursor: 'default' }}>
                  {user.username}
                </span>
                <button onClick={logout} className="btn btn-primary">
                  Đăng xuất
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn btn-primary">
                Đăng nhập
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
