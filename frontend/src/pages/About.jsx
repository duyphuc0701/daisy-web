import React from 'react'

export default function About() {
  return (
    <div className="about-container" style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px', lineHeight: '1.6' }}>
      <h1>Giới thiệu Thư viện Sách nói DAISY</h1>
      
      <p style={{ fontSize: '1.1em', color: '#333' }}>
        Dự án Thư viện Sách nói DAISY được xây dựng nhằm hỗ trợ người khiếm thị và người khuyết tật khả năng đọc chữ in tiếp cận nguồn tri thức, văn hóa và giáo dục một cách bình đẳng, thuận tiện nhất.
      </p>

      <h2>Tiêu chuẩn DAISY là gì?</h2>
      <p>
        DAISY (Digital Accessible Information System) là tiêu chuẩn toàn cầu cho các tài liệu kỹ thuật số tiếp cận được. Khác với tệp âm thanh thông thường, sách DAISY cho phép đồng bộ hóa giữa văn bản và âm thanh, điều hướng linh hoạt theo chương, mục, trang và cho phép đánh dấu trang tự động.
      </p>

      <h2>Tính năng nổi bật</h2>
      <ul>
        <li><strong>Điều hướng thông minh:</strong> Dễ dàng di chuyển giữa các chương và mục của sách.</li>
        <li><strong>Lưu tiến trình tự động:</strong> Ghi nhớ vị trí đang nghe để người dùng tiếp tục bất cứ lúc nào.</li>
        <li><strong>Giao diện tiếp cận:</strong> Tối ưu cho các phần mềm đọc màn hình (Screen Reader) và hỗ trợ thao tác bằng phím tắt.</li>
      </ul>
    </div>
  )
}