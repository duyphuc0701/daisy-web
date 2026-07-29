import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
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

    if (trimmed) {
      navigate(`/?search=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/')
    }
  }

  return (
    <form
      role="search"
      className="search-wrapper"
      onSubmit={handleSubmit}
    >
      <input
        id="search-input"
        type="text"
        className="search-input"
        placeholder="Nhập nội dung tìm kiếm…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="Tìm kiếm sách"
        autoComplete="off"
      />
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