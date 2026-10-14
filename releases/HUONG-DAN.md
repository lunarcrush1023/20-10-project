# 20/10 Minigame Studio

Ứng dụng tổ chức trò chơi ngoại tuyến cho ngày Phụ nữ Việt Nam. Bảng điều khiển trên laptop, màn hình riêng trên TV, đồng bộ qua máy chủ chỉ lắng nghe `127.0.0.1`. Toàn bộ giao diện bằng tiếng Việt. Không cần tài khoản, dịch vụ trả phí hay Internet trong sự kiện.

## Dành cho người tổ chức — Windows 11

**[Tải gói Windows sẵn dùng](releases/20-10-Minigame-Studio-Windows.zip?raw=true)** (khoảng 33 MB). Nếu GitHub hiện trang tệp ZIP, bấm **Download raw file** để tải.

1. Tải **20-10-Minigame-Studio-Windows.zip**, bấm chuột phải → **Extract All / Giải nén tất cả**. Chọn thư mục dễ nhớ trong Documents. Không chạy ngay bên trong tệp ZIP hoặc thư mục chỉ đọc.
2. Mở thư mục đã giải nén, nhấp đúp **KHOI-DONG.cmd**. Trình duyệt tự mở sau vài giây. Giữ cửa sổ khởi động mở suốt sự kiện. Gói này đã có bộ chạy Node.js; không cần cài gì hoặc gõ lệnh. Nếu trình duyệt chưa mở, mở Edge và nhập **http://127.0.0.1:2010**.
3. Vào **Câu hỏi**, sửa từng câu. 21 câu ban đầu chỉ là nội dung giữ chỗ: 8 MV, 4 khác, 1 siêu khó, 3 dự phòng, 5 phân định hòa. Không có nội dung MV tự suy đoán. Có thể thêm/xóa/nhân bản/đổi thứ tự. Chọn đáp án đúng, thêm gợi ý, giải thích và ảnh/nhạc/video. Bấm **Lưu câu hỏi** sau mỗi lần sửa.
4. Vào **Đội & điểm** để đặt tên bốn đội. Vào **Thiết lập** để đổi thời gian, cách xử lý hết giờ, điểm dự phòng/phân định hòa, tên giải thưởng, thể lệ đặc biệt, thông điệp và màu nhấn.
5. Kết nối TV. Bấm **Windows + P → Extend / Mở rộng**. Bấm **Mở màn hình TV**, kéo cửa sổ mới sang TV và bấm **Toàn màn hình** hoặc F11. Bấm **Bật âm thanh** trên cửa sổ TV một lần. Trong Windows chọn đầu ra âm thanh HDMI/TV nếu dùng loa TV. Chỉ mở một màn hình TV để tránh lặp âm thanh.
6. Chọn câu và bấm **Trình chiếu câu đã chọn**, sau đó **Bắt đầu** đồng hồ. Bấm **Trả lời đúng**, **Sai / chuyển lượt**, **Hiện gợi ý**, **Hiện đáp án** theo diễn biến. Câu tiếp theo do MC chủ động chọn. Chọn đội xung phong bằng cách bấm tên đội. Dùng **Hoàn tác** nếu nhầm.
7. Trước và sau sự kiện, vào **Thiết lập → Sao lưu toàn bộ**. Chép tệp JSON ra USB. Khi cần chuyển máy, giải nén ứng dụng trên máy mới rồi **Khôi phục từ bản sao**. Bản sao bao gồm câu hỏi, tệp đa phương tiện, điểm, thiết lập và tiến trình.

### Quy tắc mặc định

- Đội 1 bắt đầu; sai chuyển sang đội tiếp theo. Sau bốn đội sai, mở vòng thảo luận/xung phong. MC chọn đội xung phong rồi chấm.
- Câu thường đúng cộng 1 điểm, sai 0. Nếu đội 2 trả lời đúng, câu kế tiếp bắt đầu từ đội 3. Mỗi câu chỉ tự cộng điểm một lần; muốn chấm lại hãy hoàn tác hoặc sửa điểm.
- Câu đặc biệt nằm sau 12 câu thường, có giao diện riêng và **không cộng điểm đội**. MC nhập tên người thắng để công bố.
- Câu dự phòng và phân định hòa do MC chủ động lựa chọn. Điểm của chúng cấu hình được, mặc định 1.
- Hết giờ mặc định chỉ dừng đồng hồ. Có thể bật tự chuyển đội; lượt mới vẫn chờ MC bấm bắt đầu. Đồng hồ không tự phát lại sau khi mở lại máy chủ.
- Bỏ qua đánh dấu kết thúc câu hiện tại; bấm Câu tiếp để tiếp tục. Chọn lại câu đã bỏ qua cho phép chấm; câu đã cộng điểm vẫn không cộng lần hai.
- Hoàn tác tối đa 40 thao tác của phiên máy chủ hiện tại và tạm dừng đồng hồ. Lịch sử hoàn tác không được giữ sau khởi động lại hay khôi phục bản sao.

### Tệp và dữ liệu

Dữ liệu nằm trong thư mục **data** cạnh KHOI-DONG.cmd. Không xóa hoặc di chuyển thư mục này khi ứng dụng đang chạy. Máy chủ lưu trạng thái sau từng thao tác bằng ghi tệp tạm rồi đổi tên. Khi máy chủ khởi động lại, đồng hồ được tạm dừng và giữ phần thời gian còn lại tính tới lúc khởi động. Nếu tệp trạng thái hỏng, máy chủ dừng và giữ nguyên tệp để tránh ghi đè mất dữ liệu; dùng bản sao lưu đã xuất hoặc nhờ hỗ trợ khôi phục.

Tối đa 100 MB mỗi tệp; 10 tệp/câu. Để gói sao lưu nằm trong giới hạn khôi phục 200 MB, nên giữ tổng tệp dưới 140 MB vì mã hóa base64 làm tăng dung lượng. Ảnh PNG/JPG/WebP/GIF, video MP4/WebM, âm thanh MP3/WAV/OGG/M4A. Ưu tiên MP4 H.264 và MP3. Khả năng giải mã phụ thuộc Edge/Chrome. Không tự tải tài nguyên từ Internet. Tệp đã gỡ khỏi câu hỏi vẫn nằm trên đĩa để hỗ trợ hoàn tác, nhưng không xuất trong bản sao lưu nếu không còn được câu nào sử dụng.

Khôi phục ghi đè dữ liệu đang dùng, không có hoàn tác trong giao diện. Ứng dụng giữ bản trạng thái trước khôi phục ở `data/before-restore.json` để hỗ trợ kỹ thuật; hãy chủ động xuất bản sao đầy đủ trước khi khôi phục.

### Chạy thử trước sự kiện

- Thử cả hai cửa sổ khi ngắt Wi-Fi; không đóng cửa sổ máy chủ. Hai cửa sổ cập nhật khoảng nửa giây.
- Chạy qua câu có video/nhạc, thử âm lượng loa TV. Trình duyệt có thể cần bấm phát trực tiếp lần đầu do chính sách tự phát âm thanh.
- Kiểm tra câu dài và nhiều tệp trên TV thật; ưu tiên câu ngắn, 1–2 tệp/câu để tránh quá tải màn hình 16:9.
- Tắt chế độ ngủ và thông báo Windows. Sử dụng chế độ **Mở rộng**, không dùng **Nhân đôi**, để khán giả không thấy bảng điều khiển.
- Chỉ dùng một bảng điều khiển. Chỉnh câu đang trình chiếu sẽ cập nhật lên TV ngay sau khi lưu.
- Nếu Windows chặn tệp tải về, kiểm tra nguồn gói và chính sách máy/công ty; không tắt cơ chế bảo vệ. Nếu cổng 2010 bận, đóng phiên Studio cũ rồi mở lại.
- Ứng dụng dành cho laptop tin cậy của MC, không có hệ thống đăng nhập. Dữ liệu đáp án chưa công bố không được gửi bởi API trình chiếu; người có quyền sử dụng laptop vẫn có thể truy cập bảng điều khiển.

## Kiến trúc và phát triển

Node.js 22+; không có phụ thuộc chạy production. HTTP server tiêu chuẩn, JSON cục bộ và tệp media. UI HTML/CSS/JavaScript thuần, không CDN/font ngoài. TV lấy bản chiếu đã loại đáp án/gợi ý chưa công bố. Đồng hồ dùng mốc thời gian từ máy chủ; cập nhật trạng thái 500 ms. Media hỗ trợ byte ranges để tua video. API ghi chặn Origin ngoài máy chủ và kiểm tra revision tránh ghi đè thao tác cũ. Đọc/ghi chỉ qua loopback. Phần mềm không mở cổng LAN.

Các lệnh dành cho lập trình viên (người tổ chức **không cần dùng**):

```sh
npm ci
npm start
npm test
npm run check
npm run test:browser
```

Kiểm thử trình duyệt dùng Chromium có sẵn ở `/usr/bin/chromium`; đặt `CHROMIUM_PATH` nếu khác. Đặt `PORT`/`STUDIO_DATA` cho môi trường kiểm thử. Test dùng thư mục dữ liệu tạm riêng cho mỗi lần chạy. Gói Windows được tạo bằng `python3 scripts/package.py` sau khi tải `work/node.exe` và `work/SHASUMS256.txt` từ bản Node.js 24.14.0 chính thức. Script xác minh SHA-256; không đưa runtime hoặc dữ liệu sự kiện vào Git.

Xem **KIEM-THU.md** để biết phạm vi đã kiểm tra và giới hạn.
