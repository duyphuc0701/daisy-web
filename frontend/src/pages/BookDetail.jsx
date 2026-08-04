import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, User, BookOpen, Library } from 'lucide-react'
import BookHeader from '../components/BookHeader'

function BookDetail() {
  const { id } = useParams()
  const [book, setBook] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch book details
  useEffect(() => {
    setIsLoading(true)
    setError(null)
    
    fetch(`/api/books/${id}`)
      .then(res => {
        if (res.status === 404) throw new Error('Không tìm thấy sách yêu cầu.')
        if (!res.ok) throw new Error('Có lỗi xảy ra khi tải dữ liệu sách.')
        return res.json()
      })
      .then(data => {
        setBook(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError(err.message)
        setIsLoading(false)
      })
  }, [id])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6rem 0', gap: '1rem' }}>
        <div className="spinner" style={{ width: '2.5rem', height: '2.5rem', borderTopColor: 'var(--primary)', borderWidth: '4px' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 550 }}>Đang tải thông tin sách...</p>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Quay lại
        </Link>
        <div className="no-results" style={{ borderColor: 'hsl(0, 84%, 85%)', backgroundColor: 'hsl(0, 84%, 98%)' }}>
          <h3 style={{ color: 'hsl(0, 84%, 40%)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Không tìm thấy sách</h3>
          <p style={{ color: 'hsl(0, 84%, 50%)' }}>{error || 'Sách bạn yêu cầu không tồn tại trong hệ thống.'}</p>
        </div>
      </div>
    )
  }

  const coverImage = book.image || '/images/default_cover.jpg'
  const authorName = book.author || 'Khuyết danh'
  const publisherName = book.publisher || 'Đang cập nhật'
  const yearPublished = book.year || 'Đang cập nhật'
  const categoryName = book.category || 'Khác'
  const bookDesc = book.description || 'Không có mô tả chi tiết cho quyển sách này.'

  return (
    <div className="book-detail-page">
      <div className="detail-top-bar">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Quay lại
        </Link>

        <div className="header-row">
          <BookHeader />
        </div>
      </div>

      {/* Book Image Cover */}
      <div className={"detail-layout"}>

        {/* Book Image Cover */}
        <div className="detail-image-section">
          <div className="detail-image-wrapper">
            <img src={coverImage} alt={`Bìa sách ${book.title}`} />
          </div>
        </div>

        {/* Details & Actions */}
        <div className="detail-info-section">
          <div className="detail-header">
            <div className="header-top">
              <h1 style={{ marginTop: '0.75rem' }}>{book.title}</h1>
            </div>
          </div>

          {/* Key metadata */}
          <div className="metadata-grid">
            <div className="metadata-item">
              <div className="metadata-label">Tác giả</div>
              <div className="metadata-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={15} style={{ color: 'var(--primary)' }} /> {authorName}
              </div>
            </div>
            
            <div className="metadata-item">
              <div className="metadata-label">Thể loại</div>
              <div className="metadata-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={15} style={{ color: 'var(--primary)' }} /> {categoryName}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Năm xuất bản</div>
              <div className="metadata-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={15} style={{ color: 'var(--primary)' }} /> {yearPublished}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Nhà xuất bản</div>
              <div className="metadata-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Library size={15} style={{ color: 'var(--primary)' }} /> {publisherName}
              </div>
            </div>

          </div>

          {/* Description Block */}
          <div className="description-box">
            <h3>Tóm tắt nội dung</h3>
            <p>{bookDesc}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookDetail
