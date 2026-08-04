{/* Moblie */}
import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import SearchBar from './SearchBar'
import './BookHeader.css'

function BookHeader() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [categories, setCategories] = useState([])
  const [showCategory, setShowCategory] = useState(false)

  // Fetch categories
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Error:', err))
  }, [])

  const handleCategorySelect = (categoryName) => {
    setIsOpen(false)
    if (categoryName === 'Tất cả') {
      navigate('/')
    } else {
      navigate(`/?category=${encodeURIComponent(categoryName)}`)
    }
  }

  return (
    <div className="book-header">
      <button className="header-btn menu-btn" onClick={() => setIsOpen(true)}>
        <Menu size={24} />
      </button>

      {isOpen && <div className="side-menu-overlay" onClick={() => setIsOpen(false)} />}

      <div className={`side-menu ${isOpen ? 'open' : ''}`}>
        <button className="header-btn menu-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24}/> : <Menu size={24}/>}
        </button>

        <Link to="/" className="menu-item" onClick={() => setIsOpen(false)}>
          Trang chủ
        </Link>

        <div className="category-section">
          <button 
            className="menu-item" 
            onClick={() => setShowCategory(!showCategory)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            Thể loại sách <ChevronDown size={14} />
          </button>
          
          {showCategory && (
            <ul className="category-list">
              <li>
                <button 
                  className="category-item"
                  onClick={() => handleCategorySelect('Tất cả')}
                >
                  Tất cả
                </button>
              </li>
              {categories.map((cat, idx) => (
                <li key={idx}>
                  <button 
                    className="category-item"
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link to="/about" className="menu-item" onClick={() => setIsOpen(false)}>
          Giới thiệu
        </Link>

        <button className="menu-item" onClick={() => {setShowSearch(true); setIsOpen(false)}}>
          Tìm kiếm
        </button>
        
      </div>

      {showSearch && (
        <div className="search-modal">
          <button className="search-modal-close" onClick={() => setShowSearch(false)}>
            <X size={24} />
          </button>
          <SearchBar />
        </div>
      )}
    </div>
  )
}

export default BookHeader