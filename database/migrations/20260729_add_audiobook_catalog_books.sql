INSERT INTO books
  (id, title, author, image, description, publisher, year, category, downloadUrl, viewUrl)
VALUES
  (
    202,
    'Cuộc cách mạng một cọng rơm',
    'Masanobu Fukuoka',
    NULL,
    'Tác phẩm về nông nghiệp tự nhiên và triết lý sống thuận theo tự nhiên.',
    'NXB Tổng hợp Thành phố Hồ Chí Minh',
    '2015',
    'Khoa học - Môi trường',
    NULL,
    NULL
  ),
  (
    203,
    'Dữ liệu lớn - Big data',
    'Viktor Mayer-Schönberger và Kenneth Cukier',
    NULL,
    'Khảo sát cách dữ liệu lớn thay đổi cách con người phân tích, dự đoán và ra quyết định.',
    'NXB Trẻ',
    '2014',
    'Khoa học - Công nghệ',
    NULL,
    NULL
  ),
  (
    204,
    'Khuyến học',
    'Fukuzawa Yukichi',
    NULL,
    'Tác phẩm bàn về tinh thần tự lập, bình đẳng và vai trò của giáo dục trong hiện đại hóa xã hội.',
    NULL,
    NULL,
    'Giáo dục',
    NULL,
    NULL
  ),
  (
    205,
    'Sự tích con nhái',
    'Nguyễn Đổng Chi',
    NULL,
    'Truyện cổ tích Việt Nam kể về nguồn gốc con nhái.',
    NULL,
    NULL,
    'Truyện dân gian Việt Nam',
    NULL,
    NULL
  )
ON DUPLICATE KEY UPDATE
  title = IF(BINARY title = BINARY VALUES(title), title, NULL);
