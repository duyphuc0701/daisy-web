import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import SearchBar from './SearchBar'

function Header() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)

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

  const handleCategorySelect = (categoryName) => {
    setDropdownOpen(false)
    if (categoryName === 'Tất cả') {
      navigate('/')
    } else {
      navigate(`/?category=${encodeURIComponent(categoryName)}`)
    }
  }

  return (
    <header className="site-header">
      <div className="header-container">
        {/* Logo Section */}
        <Link to="/" className="logo-section" onClick={() => setDropdownOpen(false)}>
          <img src="/images/logo/logo_hsv.png" alt="Logo Hội Sinh Viên" className="brand-logo" />
          <img src="/images/favicon.png" alt="DAISY Favicon" className="favicon-logo" />
        </Link>

        {/* Action Elements: Navigation & Search */}
        <div className="header-actions">
          {/* Navigation Links */}
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
              
              {/* Category Dropdown */}
              <li 
                className={`dropdown-container ${dropdownOpen ? 'open' : ''}`}
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button 
                  className="nav-item dropdown-toggle" 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{ background: 'none', border: 'none', font: 'inherit' }}
                  aria-expanded={dropdownOpen}
                >
                  Thể loại sách <ChevronDown size={14} />
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <button 
                      className="dropdown-item" 
                      onClick={() => handleCategorySelect('Tất cả')}
                      style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', font: 'inherit' }}
                    >
                      Tất cả
                    </button>
                  </li>
                  {categories.map((cat, idx) => (
                    <li key={idx}>
                      <button 
                        className="dropdown-item" 
                        onClick={() => handleCategorySelect(cat)}
                        style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', font: 'inherit' }}
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
            </ul>
          </nav>

          {/* Search Input Bar */}
          <SearchBar />
        </div>
      </div>
    </header>
  )
}

export default Header
