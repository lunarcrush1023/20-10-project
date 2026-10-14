# Kiểm thử 20/10 Minigame Studio 2.0

Ngày: 14/10/2026. Môi trường: Linux, Node.js 24.19.0, Chromium và Playwright. Nâng cấp trên mã bản 1.0, không thay kiến trúc.

## Các kiểm tra tự động

`npm run check`: kiểm tra cú pháp máy chủ, luật chơi và giao diện.

`npm test`: 19 kiểm thử luật/dữ liệu và 2 kiểm thử máy chủ thực:

- 21 câu mặc định theo đúng nhóm; thao tác thêm/nhân bản/đổi thứ tự/xóa và hoàn tác.
- Đúng +1, kết thúc câu nhưng giữ nguyên câu; sai +0 và giữ câu/tổ; chịu thua chuyển tổ; chọn tổ thủ công; bốn lần sai không tự mở thảo luận.
- Chọn phương án chỉ lưu riêng cho Admin, có thể chấm khác đáp án; tự luận không cần nhập câu trả lời.
- Không lộ đáp án/gợi ý/media gợi ý trước công bố; tắt gợi ý giữ nội dung và tệp.
- Chống chấm lặp cùng câu; chỉnh điểm và hoàn tác được ghi vào lịch sử.
- Câu đặc biệt không cộng điểm; phân định hòa phải được kích hoạt, đúng +1 và chỉ tổ được chọn tham gia.
- Đồng hồ dừng/tiếp tục, tắt, hết giờ mặc định không đổi tổ/kết thúc câu; tự chuyển là tùy chọn; chấm giữ thời gian còn lại.
- Khởi động lại máy chủ giữ điểm, tiến trình, lịch sử điểm và tạm dừng đồng hồ. Khôi phục sai định dạng và thao tác revision cũ không ghi đè dữ liệu.
- Chuyển dữ liệu 1.0 giữ mọi trường câu hỏi, ID, media, tên tổ, điểm và danh sách câu đã chấm. Máy chủ tạo bản nguyên gốc trước chuyển đổi; kiểm tra bằng so sánh nội dung tệp. Khôi phục JSON 1.0 và JSON 2.0 có media gợi ý đang tắt vẫn giữ tệp.

`npm run test:browser`: 7 kịch bản Chromium với hai cửa sổ Admin/TV:

1. Biên tập, xem trước riêng, tải ảnh, đồng bộ, chấm/hoàn tác, công bố đáp án, chuyển câu, đồng hồ, sao lưu/khôi phục, chặn tài nguyên ngoài loopback.
2. Tự luận, thiết lập, câu đặc biệt không cộng điểm, phát/dừng WebM/WAV và giữ vị trí phát qua cập nhật, byte range video, vinh danh cá nhân.
3. Chọn phương án và đối chiếu riêng, sai không kết thúc, chọn tổ/chịu thua, chấm khác đáp án, chống chấm lại, chỉnh điểm, lịch sử/hoàn tác. Kiểm tra nút chấm nằm trong viewport laptop 1366×768.
4. Gợi ý đa phương tiện: tắt/bật giữ chữ và tệp, không gửi URL trước công bố, phát/dừng ngoại tuyến, sao lưu/khôi phục media, ẩn lại.
5. Fullscreen API: vào/thoát ba lần, gồm Esc, kiểm tra trạng thái nút và khôi phục kích thước ban đầu; cập nhật tổ khi đang toàn màn hình, đổi viewport sau khi thoát. Không giả lập bằng CSS.
6. Chọn tổ tham gia phân định hòa, tổ ngoài danh sách không được chọn; đúng +1, công bố tổ thắng, tắt đồng hồ trên TV.
7. Đồng hồ 5 giây, tạm dừng/tiếp tục, âm báo được tạo đúng một lần khi bật tùy chọn và cho phép âm thanh; hết giờ không tự đổi câu hoặc tổ. Kiểm tra tạo tín hiệu âm thanh, không phải đo âm thanh từ loa thật.

Các kịch bản dùng dữ liệu tạm và mẫu WebM/WAV/PNG, không ghi vào dữ liệu sự kiện. Trong kiểm thử ngoại tuyến, tất cả yêu cầu ngoài loopback đều bị chặn.

## Đóng gói Windows

Gói `20-10-Minigame-Studio-2.0.0-Windows.zip` có tên riêng, giữ nguyên gói 1.0. Bao gồm KHOI-DONG.cmd, Node.js Windows x64 và toàn bộ mã/tài nguyên cần chạy. Script đối chiếu SHA-256 runtime với bản công bố Node.js 24.14.0, kiểm tra ZIP và so sánh mã trong gói với mã đã kiểm thử. Gói không chứa thư mục data hoặc dữ liệu test.

## Giới hạn kiểm thử và vận hành

- Chưa trực tiếp chạy KHOI-DONG.cmd/node.exe trên Windows 11 thật, chưa thử HDMI, TV thứ hai, loa thật, hoặc chính sách SmartScreen của máy bạn. Cần chạy thử trên thiết bị sự kiện.
- Kiểm thử toàn màn hình dùng API thật trong Chromium không giao diện và đổi kích thước viewport; không mô phỏng việc kéo cửa sổ giữa hai màn hình vật lý.
- Media kiểm thử là WebM/WAV/PNG. MP4/MP3 và codec khác cần phát thử tệp thực tế trên Edge/Chrome Windows.
- Chưa kiểm thử tải sát mức 100 MB mỗi tệp, khôi phục sát 200 MB, sự cố mất điện giữa lúc ghi đĩa hoặc hiệu năng đúng laptop i5 thế hệ 8.
- Nội dung rất dài/nhiều tệp có thể chật trên TV 16:9. MC dùng xem trước, ưu tiên câu ngắn và 1–2 tệp mỗi phần.
- Hoàn tác tối đa 40 thao tác trong phiên máy chủ, không giữ sau khi máy chủ đóng hoặc khôi phục. Lịch sử điểm được giữ lâu dài. Tệp đã gỡ khỏi câu giữ trên đĩa để hoàn tác.
- Chỉ một MC trên laptop tin cậy; không có đăng nhập ứng dụng, không cho người chơi kết nối điện thoại/LAN. Máy chủ chỉ lắng nghe 127.0.0.1.
- Gói chưa ký số; không tự cập nhật, không gửi dữ liệu ra Internet và không dùng dịch vụ trả phí.
