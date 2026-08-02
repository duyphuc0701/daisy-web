import React, { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { ArrowLeft, Download, AlertCircle, Calendar, User, BookOpen, Library, Bookmark, BookmarkCheck, Heart, Loader2 } from 'lucide-react'
import { Link, useNavigate } from '../navigation'
import AudiobookPlayer from '../components/AudiobookPlayer'
import { useAuth } from '../context/AuthContext'

function BookDetail({ id }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [book, setBook] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)

  // ── Library Save State ──────────────────────────────────────────────────────
  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveStatusFetched, setSaveStatusFetched] = useState(false)

  // ── Favorite State ─────────────────────────────────────────────────────────
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [favoriteStatusFetched, setFavoriteStatusFetched] = useState(false)

  // ── Screen-Reader Live Announcement State ─────────────────────────────────
  const [announcement, setAnnouncement] = useState('')

  // Fetch book metadata (title, author, cover, …)
  useEffect(() => {
    setIsLoading(true)
    setError(null)
    setQrCodeUrl('')

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

  // Fetch library status once the book is known and user is logged in
  useEffect(() => {
    if (!user || !book) return

    setSaveStatusFetched(false)
    fetch(`/api/activity/library/${id}/status`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('status fetch failed')
        return res.json()
      })
      .then(data => {
        setIsSaved(Boolean(data.saved))
        setSaveStatusFetched(true)
      })
      .catch(() => {
        setSaveStatusFetched(true)
      })
  }, [user, book, id])

  // Fetch favorite status once the book is known and user is logged in
  useEffect(() => {
    if (!user || !book) return

    setFavoriteStatusFetched(false)
    fetch(`/api/activity/favorite/${id}/status`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('favorite status fetch failed')
        return res.json()
      })
      .then(data => {
        setIsFavorited(Boolean(data.favorited))
        setFavoriteStatusFetched(true)
      })
      .catch(() => {
        setFavoriteStatusFetched(true)
      })
  }, [user, book, id])

  // Generate QR code for viewing the book
  useEffect(() => {
    if (book && book.viewUrl) {
      QRCode.toDataURL(book.viewUrl, {
        width: 128,
        margin: 2,
        color: {
          dark: '#2f1d1d',
          light: '#f3eeee'
        },
        errorCorrectionLevel: 'H'
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Failed to generate QR Code', err))
    }
  }, [book])

  // ── Library toggle handler ─────────────────────────────────────────────────
  const handleToggleSave = useCallback(async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setSaveLoading(true)
    const wasSaved = isSaved
    // Optimistic update
    setIsSaved(!wasSaved)

    try {
      const res = await fetch(`/api/activity/library/${id}`, {
        method: wasSaved ? 'DELETE' : 'POST',
        credentials: 'include',
      })

      if (res.status === 401) {
        setIsSaved(wasSaved)
        navigate('/login')
        return
      }

      if (!res.ok) throw new Error('Request failed')

      setAnnouncement(
        wasSaved
          ? `Đã xóa "${book.title}" khỏi thư viện cá nhân`
          : `Đã thêm "${book.title}" vào thư viện cá nhân`
      )
    } catch {
      // Roll back optimistic update on error
      setIsSaved(wasSaved)
      setAnnouncement('Không thể cập nhật thư viện. Vui lòng thử lại.')
    } finally {
      setSaveLoading(false)
      setTimeout(() => setAnnouncement(''), 5000)
    }
  }, [user, isSaved, id, book, navigate])

  // ── Favorite toggle handler ────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setFavoriteLoading(true)
    const wasFavorited = isFavorited
    // Optimistic update
    setIsFavorited(!wasFavorited)

    try {
      const res = await fetch(`/api/activity/favorite/${id}`, {
        method: wasFavorited ? 'DELETE' : 'POST',
        credentials: 'include',
      })

      if (res.status === 401) {
        setIsFavorited(wasFavorited)
        navigate('/login')
        return
      }

      if (!res.ok) throw new Error('Request failed')

      setAnnouncement(
        wasFavorited
          ? `Đã xóa "${book.title}" khỏi danh sách yêu thích`
          : `Đã thêm "${book.title}" vào danh sách yêu thích`
      )
    } catch {
      // Roll back optimistic update on error
      setIsFavorited(wasFavorited)
      setAnnouncement('Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.')
    } finally {
      setFavoriteLoading(false)
      setTimeout(() => setAnnouncement(''), 5000)
    }
  }, [user, isFavorited, id, book, navigate])

  // ── Download handler ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!book || !book.downloadUrl) {
      setDownloadError(true)
      return
    }

    setDownloadError(false)
    setIsDownloading(true)

    await new Promise(resolve => setTimeout(resolve, 1000))

    try {
      const link = document.createElement('a')
      link.href = book.downloadUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download error:', err)
      setDownloadError(true)
    } finally {
      setIsDownloading(false)
    }
  }

  // ── Render guards ──────────────────────────────────────────────────────────
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
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>
        <div className="no-results" style={{ borderColor: 'hsl(0, 84%, 85%)', backgroundColor: 'hsl(0, 84%, 98%)' }}>
          <AlertCircle size={40} style={{ color: 'hsl(0, 84%, 60%)' }} />
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

  // Dynamic aria-labels
  const saveAriaLabel = isSaved
    ? `Xóa "${book.title}" khỏi thư viện cá nhân`
    : user
      ? `Thêm "${book.title}" vào thư viện cá nhân`
      : `Đăng nhập để thêm "${book.title}" vào thư viện cá nhân`

  const favoriteAriaLabel = isFavorited
    ? `Bỏ yêu thích "${book.title}"`
    : user
      ? `Thêm "${book.title}" vào danh sách yêu thích`
      : `Đăng nhập để thêm "${book.title}" vào danh sách yêu thích`

  return (
    <div className="book-detail-page">
      {/* ── Global screen-reader live region ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Quay lại trang chủ
      </Link>

      <div className="detail-layout">
        {/* Left Side: Book Image Cover & Primary Quick Actions */}
        <div className="detail-image-section">
          <div className="detail-image-wrapper">
            <img src={coverImage} alt={`Bìa sách ${book.title}`} />
          </div>

          {/* ── Library & Favorite Action Buttons Group ── */}
          <div className="book-detail-actions-group">
            {/* Save to Library button */}
            <button
              id={`save-book-${id}`}
              className={`btn btn-save-library${isSaved ? ' saved' : ''}`}
              onClick={handleToggleSave}
              disabled={saveLoading || (user && !saveStatusFetched)}
              aria-pressed={user ? isSaved : undefined}
              aria-label={saveAriaLabel}
              aria-busy={saveLoading}
            >
              {saveLoading ? (
                <>
                  <Loader2 size={16} aria-hidden="true" className="save-btn-spinner" />
                  <span>{isSaved ? 'Đang xóa...' : 'Đang lưu...'}</span>
                </>
              ) : isSaved ? (
                <>
                  <BookmarkCheck size={16} aria-hidden="true" />
                  <span>Đã lưu vào thư viện</span>
                </>
              ) : (
                <>
                  <Bookmark size={16} aria-hidden="true" />
                  <span>{user ? '+ Thêm vào thư viện' : 'Đăng nhập để lưu'}</span>
                </>
              )}
            </button>

            {/* Favorite / Like button */}
            <button
              id={`favorite-book-${id}`}
              className={`btn btn-favorite-library${isFavorited ? ' favorited' : ''}`}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading || (user && !favoriteStatusFetched)}
              aria-pressed={user ? isFavorited : undefined}
              aria-label={favoriteAriaLabel}
              aria-busy={favoriteLoading}
            >
              {favoriteLoading ? (
                <>
                  <Loader2 size={16} aria-hidden="true" className="save-btn-spinner" />
                  <span>Đang xử lý...</span>
                </>
              ) : isFavorited ? (
                <>
                  <Heart size={16} aria-hidden="true" fill="currentColor" />
                  <span>Đã yêu thích</span>
                </>
              ) : (
                <>
                  <Heart size={16} aria-hidden="true" />
                  <span>Yêu thích</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Details & Actions */}
        <div className="detail-info-section">
          <div className="detail-header">
            <span className="detail-category">{categoryName}</span>
            <h1 style={{ marginTop: '0.75rem' }}>{book.title}</h1>
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
              <div className="metadata-label">Nhà xuất bản</div>
              <div className="metadata-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Library size={15} style={{ color: 'var(--primary)' }} /> {publisherName}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Năm xuất bản</div>
              <div className="metadata-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={15} style={{ color: 'var(--primary)' }} /> {yearPublished}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Định dạng hỗ trợ</div>
              <div className="metadata-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={15} style={{ color: 'var(--primary)' }} /> Sách nói DAISY
              </div>
            </div>
          </div>

          {/* Description Block */}
          <div className="description-box">
            <h3>Tóm tắt nội dung</h3>
            <p>{bookDesc}</p>
          </div>

          {/* QR Code and Download Section */}
          <div className="actions-layout">
            {/* QR Code display */}
            {qrCodeUrl ? (
              <div className="qr-card">
                <div className="qr-canvas-container">
                  <img src={qrCodeUrl} alt="Mã QR xem sách online" style={{ display: 'block', width: '128px', height: '128px' }} />
                </div>
                <div className="qr-text">
                  <h4>Tải qua Mã QR</h4>
                  <p>Quét mã bằng điện thoại của bạn để trực tiếp đọc hoặc nghe sách trên thiết bị di động.</p>
                </div>
              </div>
            ) : (
              <div className="qr-card">
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Không có đường dẫn đọc sách trực tuyến để tạo mã QR.
                </p>
              </div>
            )}

            {/* Download Button */}
            <div className="download-wrapper">
              <button 
                className="btn btn-primary btn-download"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <div className="spinner" style={{ width: '1.1rem', height: '1.1rem', borderTopColor: 'transparent' }} />
                    Đang chuẩn bị file...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Tải xuống sách
                  </>
                )}
              </button>

              {downloadError && (
                <div className="error-message">
                  <AlertCircle size={14} /> File sách không tìm thấy hoặc đường dẫn tải không hợp lệ!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audiobook Player Section */}
      <AudiobookPlayer bookId={id} />
    </div>
  )
}

export default BookDetail
