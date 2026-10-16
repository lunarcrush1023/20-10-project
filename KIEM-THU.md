# Kiểm thử 20/10 Minigame Studio 2.1.1

Môi trường: Linux, Node.js, Chromium và Playwright. Chưa chạy trực tiếp trên Windows/TV thật.

Kết quả ngày 16/10/2026: kiểm tra cú pháp đạt; 22 kiểm thử logic, 3 kiểm thử máy chủ và 9 kịch bản Chromium đều đạt (34 tổng cộng).

## Phạm vi kiểm tra

- Kiểm tra cú pháp máy chủ, luật chơi và giao diện.
- 22 kiểm thử logic: 19 mục mặc định; chuyển đổi dữ liệu cũ; màn chờ không lộ nội dung; chấm một lần bấm; sai câu thường kết thúc/công bố; chuyển lượt; bốn tổ chịu thua mở vòng tự do; câu siêu khó/dự phòng cho thử tiếp; cộng điểm đúng một lần; +/- và hoàn tác; đồng hồ và bảo vệ đáp án.
- 3 kiểm thử máy chủ thực: lưu/khởi động lại, sao lưu/khôi phục, chuyển đổi schema 1, 2 và 3 giữ câu hỏi/media và tạo bản nguyên gốc trước chuyển đổi.
- 9 kịch bản trình duyệt: màn chờ và khung TV giữa; vòng tự do; siêu khó/dự phòng; +/- điểm và vô địch; biên tập/gợi ý/media ngoại tuyến và sao lưu; toàn màn hình/Esc và đồng hồ; media câu hỏi, byte range, hoàn tác và bảo vệ yêu cầu.

Bổ sung hồi quy 2.1.1: cả 18 câu đều giấu đáp án/phản hồi khi hiện lại; Q1 đã chấm không lộ đáp án trên TV hoặc iframe, không cộng điểm lặp. Kiểm tra đồng hồ tự chạy, dừng/tiếp tục/đặt lại và tắt. Kiểm tra thứ tự 1–19 ở dữ liệu, danh sách và dropdown. Dữ liệu 2.1 giữ nguyên câu hỏi/tệp theo ID khi chuyển đổi và khôi phục, tạo bản gốc before-v4. Kiểm tra upload/phát MP4 H.264/AAC trên Chromium, màn hình video sạch, tạm dừng/tiếp tục/phát lại, âm lượng/tắt tiếng và preview luôn tắt tiếng. Sao lưu/khôi phục giữ video.

Các kiểm thử dùng dữ liệu tạm riêng. Kiểm thử ngoại tuyến chặn yêu cầu ngoài loopback.

## Đóng gói

Gói Windows 2.1.1 chứa KHOI-DONG.cmd, runtime Node.js 24.14.0 Windows x64 và mã/tài nguyên ứng dụng. Kiểm tra SHA-256 runtime với SHASUMS chính thức, tính toàn vẹn ZIP và đối chiếu mã trong ZIP với nguồn. Không đưa dữ liệu sự kiện hoặc dữ liệu test vào gói. Giữ nguyên các gói cũ.

## Giới hạn kiểm thử và vận hành

- Chưa trực tiếp chạy KHOI-DONG.cmd/node.exe trên Windows 11 thật, chưa thử HDMI, TV thứ hai, loa thật, hoặc chính sách SmartScreen của máy bạn. Cần chạy thử trên thiết bị sự kiện.
- Kiểm thử toàn màn hình dùng API thật trong Chromium không giao diện và đổi kích thước viewport; không mô phỏng việc kéo cửa sổ giữa hai màn hình vật lý.
- Media kiểm thử là MP4 H.264/AAC, WebM/WAV/PNG trên Chromium Linux. Vẫn cần phát thử tệp thực tế trên Edge/Chrome Windows.
- Chưa kiểm thử tải sát mức 100 MB mỗi tệp, khôi phục sát 200 MB, sự cố mất điện giữa lúc ghi đĩa hoặc hiệu năng đúng laptop i5 thế hệ 8.
- Nội dung rất dài/nhiều tệp có thể chật trên TV 16:9. MC dùng xem trước, ưu tiên câu ngắn và 1–2 tệp mỗi phần.
- Hoàn tác tối đa 40 thao tác trong phiên máy chủ, không giữ sau khi máy chủ đóng hoặc khôi phục. Lịch sử điểm được giữ lâu dài. Tệp đã gỡ khỏi câu giữ trên đĩa để hoàn tác.
- Chỉ một MC trên laptop tin cậy; không có đăng nhập ứng dụng, không cho người chơi kết nối điện thoại/LAN. Máy chủ chỉ lắng nghe 127.0.0.1.
- Gói chưa ký số; không tự cập nhật, không gửi dữ liệu ra Internet và không dùng dịch vụ trả phí.
