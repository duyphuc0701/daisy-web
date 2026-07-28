import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from '../navigation'

export default function Header() {
  const navigate = useNavigate()
  // 1. Tạo state để lưu trữ từ khóa người dùng đang gõ
  const [searchTerm, setSearchTerm] = useState('')

  // 2. Hàm xử lý khi bấm tìm kiếm hoặc ấn Enter
  const handleSearch = (e) => {
    // Nếu là sự kiện click chuột hoặc ấn phím Enter
    if (e.type === 'click' || e.key === 'Enter') {
      if (searchTerm.trim() !== '') {
        // Đẩy từ khóa lên thanh URL (ví dụ: /search?q=tam-ly)
        navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
      }
    }
  }

  return (
    <header className="site-header">
      <div className="header-container">
        
        {/* Logo và Menu giữ nguyên như cũ... */}
        <div className="logo-section">
          <Link to="/" style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>
            DAISY Library
          </Link>
        </div>

        <nav>
          <ul className="nav-menu">
            <li><NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Trang chủ</NavLink></li>
            <li><NavLink to="/about" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Giới thiệu</NavLink></li>
            <li><NavLink to="/guide" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Hướng dẫn</NavLink></li>
          </ul>
        </nav>

        {/* 3. Cập nhật lại thanh tìm kiếm */}
        <div className="header-actions">
          <div className="search-wrapper">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Tìm kiếm sách nói..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch} // Lắng nghe phím Enter
            />
            <button className="search-btn" onClick={handleSearch}>
              🔍
            </button>
          </div>
        </div>

      </div>
    </header>
  )
}