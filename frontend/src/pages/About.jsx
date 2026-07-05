import React from 'react'

function About() {
  return (
    <div className="about-page">
      {/* Intro Hero */}
      <section className="about-hero">
        <h1>Giới Thiệu Thư Viện Sách Nói DAISY<br />Dành Cho Người Khiếm Thị</h1>
        <img src="/images/library.jpg" alt="Thư viện sách nói Daisy" className="about-hero-img" />
      </section>

      {/* Main explanation & Intro video */}
      <section className="about-intro-grid">
        <div className="about-text-content">
          <h2>Sách nói DAISY là gì?</h2>
          <p>
            Sách nói DAISY (Digital Accessible Information System) là một định dạng kỹ thuật số hỗ trợ tiếp cận, 
            được thiết kế nhằm mang lại trải nghiệm đọc phong phú và linh hoạt cho người khiếm thị hoặc gặp khó khăn 
            trong việc đọc chữ in truyền thống.
          </p>
          <p>
            Khác với các file âm thanh thông thường, sách DAISY cho phép người dùng điều hướng chi tiết theo chương, 
            mục, trang hoặc dòng, và có thể đồng bộ văn bản với âm thanh. Điều này hỗ trợ việc học tập suốt đời, 
            đảm bảo quyền tiếp cận thông tin bình đẳng và tăng tính tự chủ cho người khuyết tật.
          </p>
        </div>
        <div className="video-frame-container">
          <iframe 
            src="https://www.youtube.com/embed/rYArMFB9XOs?si=zH4vVTd2DKUi6CG7" 
            title="Sách DAISY là gì?" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="timeline-section">
        <h2>Quá trình hình thành và phát triển</h2>
        
        <div className="timeline-container">
          {/* Spring 2025 */}
          <div className="timeline-item timeline-item-left">
            <div className="timeline-dot"></div>
            <div className="timeline-card">
              <h3 className="timeline-date">Mùa xuân năm 2025</h3>
              <p>
                Hội Sinh viên Trường ĐH Khoa học Tự nhiên phối hợp triển khai các hoạt động "Ứng dụng trí tuệ nhân tạo (AI) hỗ trợ người khiếm thị". 
                Dự án "DAISY - Sách nói dành cho người khiếm thị" nổi bật với mục tiêu số hóa sách thông thường thành định dạng DAISY chuẩn. 
                Dự án phát triển bởi nhóm sinh viên Nguyễn Duy Phúc, Nguyễn Trọng Quý, Lê Nguyễn Minh Hiếu với sự cố vấn chuyên môn từ PGS.TS. Đinh Điền.
              </p>
              <div className="video-frame-container timeline-media">
                <iframe 
                  src="https://www.youtube.com/embed/FCFYjB1dDmo" 
                  title="Dự án DAISY AI" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>

          {/* Summer 2025 */}
          <div className="timeline-item timeline-item-right">
            <div className="timeline-dot"></div>
            <div className="timeline-card">
              <h3 className="timeline-date">Mùa hè năm 2025</h3>
              <p>
                Trang web Thư viện Sách nói DAISY chính thức được thiết kế và xây dựng bởi các chiến sĩ thuộc Đội hình hỗ trợ người khiếm thị - Mặt trận Chuyển đổi số 201 trong chiến dịch Mùa hè xanh 2025. 
                Nền tảng giúp thu hẹp khoảng cách tiếp cận tri thức, mở ra cơ hội học tập bình đẳng hơn cho người khiếm thị khắp mọi miền.
              </p>
              <div className="timeline-media">
                <img src="/images/doi_hinh_ho_tro_nguoi_khiem_thi.jpg" alt="Đội hình Mùa hè xanh" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
