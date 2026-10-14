# Kết quả kiểm thử phiên bản 1.0

Ngày thực hiện: 14/10/2026. Môi trường: Linux, Node.js 24.19.0, Chromium không giao diện và Playwright.

## Đã đạt

- 12 kiểm thử luật chơi: cấu trúc 21 câu; chuyển lượt; chấm điểm; chống cộng điểm hai lần; vòng xung phong; câu đặc biệt không cộng điểm; ẩn/hiện đáp án và gợi ý qua API; hoàn tác; tạm dừng/hết giờ; thao tác câu hỏi; từ chối dữ liệu sai; điểm thủ công và điểm tùy chọn; giữ thời gian còn lại khi chấm.
- 1 kiểm thử máy chủ thực: khởi động lại giữ điểm/tiến trình và tạm dừng đồng hồ; khôi phục không hợp lệ không làm mất dữ liệu; thao tác với revision cũ bị từ chối.
- 2 kịch bản Chromium với hai cửa sổ: sửa câu, xem trước riêng, tải ảnh, hiển thị TV, chuyển lượt, chấm/hoàn tác, công bố đáp án, đồng hồ, sao lưu/khôi phục cả tệp, tải lại trang, chặn tài nguyên ngoài loopback; câu tự luận, cài đặt thời gian/tên giải, phát/dừng WebM và WAV, giữ thời điểm phát khi cập nhật gợi ý, byte range cho video, câu đặc biệt không cộng điểm và công bố người thắng.
- Kiểm tra cú pháp JavaScript và xem ảnh chụp giao diện quản trị/trình chiếu; không ghi nhận lỗi JavaScript trong kịch bản chính.
- Bộ chạy Windows Node.js 24.14.0 x64 được tải từ nodejs.org; script đóng gói đối chiếu SHA-256 với SHASUMS256.txt chính thức. Kiểm tra cấu trúc và tính toàn vẹn ZIP.

## Chưa kiểm thử trực tiếp

- Chạy tệp KHOI-DONG.cmd và node.exe trên Windows 11 thật; xuất HDMI, loa và bố cục trên TV thật. Môi trường phát triển không có Windows hoặc TV.
- Không đánh giá hiệu năng trên đúng laptop i5 thế hệ 8; ứng dụng dùng kiến trúc nhẹ, không có thư viện giao diện hoặc dịch vụ nền nặng. Video nặng và nhiều tệp có thể ảnh hưởng máy.
- Kiểm thử media tự động dùng mẫu WebM/WAV; MP4, MP3 và các codec khác cần chạy thử với tệp thực tế trên Edge/Chrome của máy sự kiện.
- Giới hạn tải lên/khôi phục có kiểm tra trong mã; chưa tải thử tệp đến sát mức 100/200 MB hoặc mô phỏng mất điện giữa lúc ghi đĩa.

## Giới hạn phiên bản đầu

- Chỉ dùng trên cùng một laptop qua loopback, không kết nối người chơi bằng điện thoại/LAN. Bảng điều khiển không có đăng nhập.
- Một quản trị viên vận hành; nếu nhiều cửa sổ sửa đồng thời, revision ngăn thao tác cũ ghi đè nhưng không hợp nhất nội dung.
- Trình chiếu 16:9 có thể chật với câu rất dài/nhiều media. Có xem trước riêng; MC cần rà soát nội dung trước chương trình.
- Trình duyệt có thể chặn tự phát âm thanh; cần thao tác cho phép trên cửa sổ TV. Nút phát trực tiếp của media vẫn dùng được.
- Màu nhấn, thông điệp, giải và quy tắc thay đổi qua giao diện; phiên bản này chưa có trình thiết kế bố cục tùy ý.
- Gói Windows chưa ký số. Không tự cập nhật hoặc gửi dữ liệu ra Internet.
