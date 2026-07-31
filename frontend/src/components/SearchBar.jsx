import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate, useSearchParams } from '../navigation'

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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  const handleClear = () => {
    setTerm('')
    navigate('/')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="search-wrapper"
      role="search"
    >
      <label htmlFor="search-input" className="sr-only">
        Tìm kiếm sách
      </label>
      <input
        id="search-input"
        type="text"
        className="search-input"
        placeholder="Nhập nội dung tìm kiếm…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Tìm kiếm sách"
        aria-describedby="search-hint"
      />
      <span id="search-hint" className="sr-only">
        Nhấn Enter hoặc bấm nút tìm kiếm để tìm
      </span>

      {term && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={handleClear}
          aria-label="Xóa tìm kiếm"
        >
          <X size={16} />
        </button>
      )}

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
