const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail(toEmail, resetToken, clientUrl) {
  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

  const mailOptions = {
    from: '"DAISY Library" <noreply@daisylibrary.com>',
    to: toEmail,
    subject: 'Khôi phục mật khẩu - DAISY Library',
    html: `
      <h2>Khôi phục mật khẩu</h2>
      <p>Bạn đã yêu cầu khôi phục mật khẩu. Vui lòng click vào link bên dưới để đặt lại mật khẩu của bạn:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#0056b3;color:white;text-decoration:none;border-radius:5px;">Đặt lại mật khẩu</a>
      <p>Link này sẽ hết hạn sau 1 giờ.</p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
};
