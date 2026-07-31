import React, { useState, useEffect } from 'react'
import { Library, AlertCircle } from 'lucide-react'
import BookCard from '../components/BookCard'
import { useSearchParams } from '../navigation'

function Home() {
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''

  const [books, setBooks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    // Build URL with search and category filters
    const queryParams = new URLSearchParams()
    if (search) queryParams.append('search', search)
    if (category) queryParams.append('category', category)

    fetch(`/api/books?${queryParams.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Không thể kết nối đến máy chủ dữ liệu.')
        return res.json()
      })
      .then(data => {
        setBooks(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error fetching books:', err)
        setError(err.message)
        setIsLoading(false)
      })
  }, [search, category])

  // Compute the current page title heading
  const getHeadingText = () => {
    if (search) {
      return `Đã tìm thấy ${books.length} kết quả cho "${search}"`
    }
    return category || 'Tất cả sách'
  }

  // Build live region announcement
  const getLiveAnnouncement = () => {
    if (isLoading) return 'Đang tải dữ liệu sách...'
    if (error) return `Lỗi: ${error}`
    if (books.length === 0) return 'Không tìm thấy kết quả nào'
    return `Tìm thấy ${books.length} sách`
  }

  return (
    <div className="home-page">
      {/* Hero section */}
      <section className="hero-section">
        <h1>Thư viện sách nói DAISY</h1>
        <p>
          Ứng dụng tra cứu và khám phá các đầu sách nói định dạng DAISY hỗ trợ người khiếm thị
          tiếp cận thông tin và tri thức một cách thuận tiện, dễ dàng nhất.
        </p>
      </section>

      {/* Screen reader live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {getLiveAnnouncement()}
      </div>

      {/* Heading of results */}
      <div className="page-heading-section">
        <h2 className="page-title">{getHeadingText()}</h2>
        {!isLoading && !error && (
          <span className="results-count">Hiển thị {books.length} sách</span>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '1rem' }}
          aria-busy="true"
        >
          <div className="spinner" style={{ width: '2.5rem', height: '2.5rem', borderTopColor: 'var(--primary)', borderWidth: '4px' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 550 }}>Đang tải dữ liệu sách...</p>
        </div>
      ) : error ? (
        <div
          className="no-results"
          style={{ borderColor: 'hsl(0, 84%, 85%)', backgroundColor: 'hsl(0, 84%, 98%)' }}
          role="alert"
        >
          <AlertCircle size={40} style={{ color: 'hsl(0, 84%, 60%)' }} />
          <h3 style={{ color: 'hsl(0, 84%, 40%)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Đã xảy ra lỗi</h3>
          <p style={{ color: 'hsl(0, 84%, 50%)' }}>{error}</p>
        </div>
      ) : books.length === 0 ? (
        <div className="no-results">
          <Library size={40} style={{ color: 'var(--text-muted)' }} />
          <h3>Không tìm thấy kết quả nào</h3>
          <p>Thử tìm kiếm với từ khóa khác hoặc duyệt qua các thể loại sách.</p>
        </div>
      ) : (
        <div className="book-grid">
          {books.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Home
