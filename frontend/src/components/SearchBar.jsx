import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate, useSearchParams } from '../navigation'
function SearchBar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryParam = searchParams.get('search') || ''

  const [term, setTerm] = useState(queryParam)
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
      role="search"
      className="search-wrapper"
      onSubmit={handleSubmit}
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
        autoComplete="off"
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
        id="search-btn"
        type="submit"
        className="search-btn"
        aria-label="Tìm kiếm"
      >
        <Search size={18} aria-hidden="true" />
      </button>
    </form>
  )
}

export default SearchBar