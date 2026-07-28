import React from 'react'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-logo-container">
          <img src="/images/logo/logo_hsv.png" alt="Logo HSV HCMUS" />
        </div>
        <div className="footer-info">
          <h3>Hội Sinh Viên Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM</h3>
          <div className="footer-contacts">
            <div className="contact-line">
              <span>Địa chỉ CS1:</span> 227 Nguyễn Văn Cừ, Phường Chợ Quán, TP. Hồ Chí Minh
            </div>
            <div className="contact-line">
              <span>Điện thoại:</span> <a href="tel:+842838354008">(028) 3 8354008</a>
            </div>
            <div className="contact-line">
              <span>Địa chỉ CS2:</span> Khu phố 6, P.Linh Trung, Q.Thủ Đức
            </div>
            <div className="contact-line">
              <span>Điện thoại:</span> <a href="tel:+842838961092">(028) 3 8961092</a>
            </div>
            <div className="contact-line">
              <span>Email:</span> <a href="mailto:hoisinhvien@hcmus.edu.vn">hoisinhvien@hcmus.edu.vn</a>
            </div>
            <div className="contact-line">
              <span>Fanpage:</span> <a href="https://www.facebook.com/DoanHoiHCMUS" target="_blank" rel="noopener noreferrer">facebook.com/DoanHoiHCMUS</a>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-copyright">
        <p>&copy; {new Date().getFullYear()} Hội Sinh Viên Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM. Mọi quyền được bảo lưu.</p>
      </div>
    </footer>
  )
}

export default Footer
