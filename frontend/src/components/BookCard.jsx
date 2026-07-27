import React from 'react'
import { User, Library, Bookmark } from 'lucide-react'
import { Link } from '../navigation'

function BookCard({ book }) {
  // Use a default image if book has none
  const coverImage = book.image || '/images/default_cover.jpg'
  const authorName = book.author || 'Khuyết danh'
  const publisherName = book.publisher || 'Đang cập nhật'
  const categoryName = book.category || 'Khác'

  return (
    <div className="book-card">
      <div className="card-img-wrapper">
        <img src={coverImage} alt={`Ảnh bìa ${book.title}`} loading="lazy" />
      </div>
      <div className="card-content">
        <h3 className="book-title" title={book.title}>{book.title}</h3>
        
        <div className="card-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <User size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span><strong>Tác giả:</strong> {authorName}</span>
        </div>

        <div className="card-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Library size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span><strong>NXB:</strong> {publisherName}</span>
        </div>

        <div className="card-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Bookmark size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span><strong>Chủ đề:</strong> {categoryName}</span>
        </div>

        <div className="card-footer">
          <Link to={`/book/${book.id}`} className="btn btn-primary card-btn">
            Xem chi tiết
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BookCard
