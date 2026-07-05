import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'

function SearchBar({ isLoading }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get('search') || ''
  
  const [term, setTerm] = useState(queryParam)

  // Sync state if URL search param changes directly
  useEffect(() => {
    setTerm(queryParam)
  }, [queryParam])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = term.trim()
    
    // Redirect to home page with search parameter
    if (trimmed) {
      navigate(`/?search=${encodeURIComponent(trimmed)}`)
    } else {
      // If empty search, clear it from URL
      navigate('/')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="search-wrapper">
      <input
        type="text"
        className="search-input"
        placeholder="Nhập nội dung tìm kiếm…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="Tìm kiếm sách"
      />
      <button 
        type="submit" 
        className="search-btn" 
        disabled={isLoading}
        aria-label="Nút Tìm kiếm"
      >
        {isLoading ? (
          <div className="spinner" style={{ width: '1rem', height: '1rem', borderTopColor: 'transparent' }} />
        ) : (
          <Search size={18} />
        )}
      </button>
    </form>
  )
}

export default SearchBar
