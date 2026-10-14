# 20/10 Minigame Studio 2.0

Ứng dụng dẫn minigame ngoại tuyến: Admin trên laptop, trình chiếu riêng trên TV. Giao diện hoàn toàn bằng tiếng Việt, không tài khoản ứng dụng, không dịch vụ trả phí, không cần Internet khi tổ chức.

**[Tải bản Windows 2.0](https://github.com/lunarcrush1023/20-10-project/blob/codex/20-10-studio-v2/releases/20-10-Minigame-Studio-2.0.0-Windows.zip?raw=true)** — khoảng 33 MB, có sẵn bộ chạy. Repository riêng tư: đăng nhập GitHub bằng tài khoản có quyền xem kho nếu được yêu cầu. Nếu thấy trang tệp ZIP, bấm **Download raw file**.

## Nếu bạn đang dùng bản 1.0 — giữ nguyên dữ liệu cũ

1. Mở ứng dụng **bản cũ**, vào **Thiết lập → Sao lưu toàn bộ**, lưu tệp JSON ở nơi dễ tìm. Bản sao này chứa câu hỏi, tệp đính kèm, điểm và tiến trình.
2. Đóng cửa sổ khởi động bản cũ. Tải ZIP 2.0 và **giải nén vào thư mục mới**, không xóa thư mục cũ, không mở hai phiên bản cùng lúc.
3. Trong thư mục mới, nhấp đúp **KHOI-DONG.cmd**. Trình duyệt tự mở sau khoảng 2 giây. Nếu trình duyệt đang giữ trang cũ, nhấn Ctrl + F5.
4. Vào **Thiết lập → Khôi phục từ bản sao**, chọn JSON vừa lưu và xác nhận. Kiểm tra số câu, tên tổ, điểm và phát thử các tệp của bạn.
5. Xuất thêm một bản sao từ phiên bản 2.0 trước sự kiện. Bản sao 2.0 chứa cả gợi ý đa phương tiện và lịch sử điểm; không khôi phục nó bằng ứng dụng 1.0.

Ứng dụng không thể tự lấy câu hỏi đã nhập trên laptop của bạn từ GitHub. Hãy dùng bản sao JSON để chuyển dữ liệu. Gói tải về không chứa dữ liệu sự kiện của bạn và không tự xóa dữ liệu cũ. Nếu dùng trực tiếp thư mục data cũ với máy chủ 2.0, ứng dụng tạo bản trạng thái nguyên gốc `data/before-v2-<thời điểm>.json` trước khi chuyển đổi; toàn bộ tệp media giữ nguyên. Cách dùng giao diện sao lưu/khôi phục ở trên vẫn được khuyến nghị cho người tổ chức.

## Cài mới và mở ứng dụng

1. Tải ZIP, bấm chuột phải → **Extract All / Giải nén tất cả** vào Documents. Không chạy ngay trong ZIP hoặc thư mục chỉ đọc.
2. Nhấp đúp **KHOI-DONG.cmd**. Không cần cài Node.js, viết mã hoặc gõ lệnh. Giữ cửa sổ khởi động mở trong sự kiện.
3. Trình duyệt mở trang Admin. Nếu chưa mở, nhập **http://127.0.0.1:2010** vào Edge/Chrome.
4. Khi dùng xong, sao lưu dữ liệu rồi đóng cửa sổ khởi động. Lần sau mở lại bằng KHOI-DONG.cmd.

Nếu Windows hoặc máy công ty chặn tệp tải xuống, kiểm tra nguồn tải và chính sách máy; không tắt cơ chế bảo vệ. Gói chưa ký số. Nếu báo cổng đang dùng, đóng cửa sổ khởi động phiên bản cũ trước.

## Ba khu vực của Admin

### 01 · Quản lý câu hỏi — chuẩn bị trước sự kiện

- Thêm, sửa, nhân bản, xóa, đổi thứ tự bằng ↑/↓, chọn nhóm và xem trước riêng.
- Trắc nghiệm: 2–10 phương án; tích chọn đáp án đúng. Tự luận: lưu đáp án tham khảo cho MC.
- Thêm ảnh, âm thanh, video từ máy. Đính kèm được sao chép vào dữ liệu ứng dụng, dùng được khi ngắt Internet.
- Bật **Có gợi ý** để nhập một gợi ý gồm chữ và/hoặc ảnh, âm thanh, video. Tắt công tắc sẽ ẩn phần biên tập và nút gợi ý khi chơi; nội dung và tệp vẫn được giữ. Mỗi câu có tối đa một gợi ý, có thể kèm nhiều tệp.
- Bấm **Lưu câu hỏi**. Xem trước riêng không gửi lên TV. Sửa câu đang trình chiếu sẽ cập nhật lên TV sau khi lưu.

Bản cài mới có 21 câu giữ chỗ: 8 MV + 4 chủ đề khác, 1 đặc biệt, 3 dự phòng, 5 phân định hòa. Không có nội dung MV tự suy đoán. Nội dung bạn đã nhập được giữ khi khôi phục bản sao cũ.

### 02 · Điều khiển trực tiếp — dùng trong chương trình

1. Chọn câu ở đầu trang → **HIỆN CÂU HỎI**.
2. Bấm **Tổ 1 / Tổ 2 / Tổ 3 / Tổ 4** để chọn tổ trả lời; TV cập nhật ngay trong khoảng nửa giây.
3. Trắc nghiệm: bấm A/B/C/D… theo câu trả lời nghe được. Admin hiện đối chiếu đáp án riêng; TV không thấy lựa chọn này hoặc kết quả đối chiếu. Sau đó bấm **ĐÚNG (+1)** hoặc **SAI (0 ĐIỂM)**. MC có thể chấm khác đáp án lưu sẵn. Tự luận: chỉ cần nghe rồi chấm, không phải nhập lại câu trả lời.
4. **ĐÚNG:** cộng 1, kết thúc câu, giữ câu trên TV. **SAI:** cộng 0, giữ câu và tổ hiện tại, không lộ đáp án; bạn chọn tổ tiếp theo. **CHỊU THUA / CHUYỂN TỔ:** cộng 0 và chuyển cơ hội theo thứ tự, vẫn có thể chọn tổ khác bất kỳ.
5. Khi cần, bấm **MỞ VÒNG XUNG PHONG**, chọn tổ trả lời, **HIỆN GỢI Ý**. Gợi ý không trừ điểm. **BỎ CÂU** yêu cầu xác nhận và không cộng điểm.
6. Chỉ **HIỆN ĐÁP ÁN** mới công bố đáp án và giải thích. Chấm đúng/sai không tự công bố đáp án đúng.
7. Bấm **CÂU TIẾP THEO** hoặc **CÂU TRƯỚC** khi bạn muốn trình chiếu câu khác. Hệ thống không tự sang câu sau khi chấm hoặc hết giờ.
8. Nhầm thao tác thì bấm **HOÀN TÁC** ở đầu trang. Mỗi câu chỉ tự cộng điểm một lần, kể cả bấm lặp hoặc quay lại câu đã chấm. Muốn sửa, hoàn tác hoặc chỉnh điểm thủ công.

Các nút thường dùng nằm cùng một vùng. Khung **Đang trên TV** là bản xem trước nội dung khán giả thấy. Bên dưới có nút phát/dừng tệp câu hỏi và tệp gợi ý riêng. Tệp gợi ý chỉ phát sau khi MC hiện gợi ý.

**Đồng hồ:** bật/tắt bằng Sử dụng, nhập số giây rồi bấm Áp dụng (đặt lại đồng hồ), Bắt đầu, Tạm dừng, Tiếp tục hoặc Đặt lại. Trong Thiết lập có tùy chọn âm báo và tự chuyển tổ khi hết giờ. Mặc định hết giờ chỉ dừng đồng hồ; không kết thúc câu hay chuyển tổ. Khi bật tự chuyển, lượt mới vẫn chờ MC bấm Bắt đầu. Đồng hồ bị tắt sẽ biến mất trên TV.

**Câu đặc biệt:** vòng cá nhân, không cộng điểm tổ. MC chấm phản hồi và nhập tên cá nhân nhận giải để công bố. Không tự chia giải thưởng.

### 03 · Điểm số & kết quả

- Đặt tên tổ, chỉnh điểm trực tiếp rồi **Lưu tên & điểm**. Các lần chấm, sửa điểm, đặt lại và hoàn tác làm thay đổi điểm được ghi vào lịch sử.
- Nếu hòa dẫn đầu, chọn các tổ tham gia, chọn một trong các câu phân định hòa → **MỞ CÂU PHÂN ĐỊNH HÒA** và xác nhận. Trong vòng này chỉ các tổ đã chọn được trả lời; có thể quay lại đây để đổi danh sách.
- Câu phân định hòa đúng luôn +1 điểm, kể cả cấu hình điểm câu hòa ở bản cũ khác 1. Không tự mở vòng phân định hòa.
- Khi chỉ có một tổ cao điểm nhất, bấm **CÔNG BỐ TỔ CHIẾN THẮNG** và xác nhận. Khi hòa, nút này bị khóa để tránh công bố nhầm. Tổ thắng nhận phần giải thường; MC tự phân phối giải.

## Đưa Minigame lên TV

1. Kết nối HDMI. Nhấn **Windows + P → Extend / Mở rộng**, không chọn Nhân đôi để tránh lộ Admin.
2. Trong Admin bấm **Mở màn hình TV**. Kéo cửa sổ đó sang TV.
3. Bấm **Toàn màn hình** để mở; bấm **Thoát toàn màn hình** hoặc **Esc** để trở về cửa sổ. Nếu dùng F11 của trình duyệt, bấm lại F11 để thoát chế độ đó.
4. Bấm **Bật âm thanh** một lần trên TV, rồi điều khiển phát/dừng từ Admin. Chọn đầu ra HDMI/TV trong cài đặt âm thanh Windows nếu dùng loa TV.
5. TV chỉ trình chiếu; không có nút chấm, chọn tổ hay chuyển câu. Chỉ mở một cửa sổ TV để tránh âm thanh lặp.

Trình duyệt có thể chặn tự phát âm thanh cho tới khi bạn bấm Bật âm thanh. Nếu có thông báo, bấm nút đó khi tệp đã được MC bật phát. Âm báo hết giờ cũng cần cho phép âm thanh. Kéo cửa sổ sang TV trước khi bật toàn màn hình.

## Lưu trữ, sao lưu và giới hạn

- Tất cả dữ liệu ở thư mục **data** cạnh KHOI-DONG.cmd. Tự lưu mỗi thao tác. Khi mở lại máy chủ, câu/điểm được giữ; đồng hồ và media dừng. Thời gian còn lại tính tới lúc khởi động lại, không tự chạy tiếp.
- Hoàn tác tối đa 40 thao tác trong phiên máy chủ hiện tại; đồng hồ được tạm dừng khi hoàn tác. Lịch sử điểm được lưu qua khởi động lại và sao lưu, nhưng lịch sử hoàn tác kết thúc khi đóng máy chủ hoặc khôi phục.
- **Thiết lập → Sao lưu toàn bộ** tạo JSON chứa nội dung, media của câu và gợi ý (kể cả gợi ý đang tắt), điểm, lịch sử điểm, thiết lập và tiến trình. **Khôi phục** thay dữ liệu đang dùng, cần xác nhận và không hoàn tác trong giao diện; hãy xuất bản sao trước.
- Khi khôi phục, trạng thái cũ được giữ ở `data/before-restore.json` để hỗ trợ kỹ thuật. Tệp này không thay thế bản sao đầy đủ có media mà bạn xuất qua giao diện.
- Tối đa 100 MB mỗi tệp; tối đa 10 tệp phần câu hỏi và 10 tệp phần gợi ý. Nên dùng 1–2 tệp/phần để bố cục TV dễ đọc. Khôi phục giới hạn 200 MB; giữ tổng media dưới 140 MB vì mã hóa trong JSON làm tăng kích thước.
- Định dạng PNG/JPG/WebP/GIF, MP4/WebM, MP3/WAV/OGG/M4A. Khuyến nghị MP4 H.264/MP3; khả năng phát phụ thuộc trình duyệt. Tệp đã gỡ khỏi câu vẫn giữ trên đĩa để hỗ trợ hoàn tác, nhưng không được sao lưu nếu không còn được câu/gợi ý nào dùng.
- Chỉ một MC vận hành. Thao tác dựa trên trạng thái cũ bị từ chối để tránh ghi đè: đợi cập nhật rồi thử lại. Không có đăng nhập ứng dụng; chỉ dùng trên laptop tin cậy của MC.
- Trước sự kiện: ngắt Wi-Fi và thử cả hai cửa sổ, kiểm tra tệp thật/loa/TV, chữ dài, tắt chế độ ngủ và thông báo Windows. Giữ nguồn điện ổn định.

## Kiến trúc và kiểm thử (dành cho người phát triển)

Giữ nguyên kiến trúc bản 1.0: Node.js tiêu chuẩn, HTML/CSS/JavaScript thuần, HTTP chỉ lắng nghe loopback `127.0.0.1`, JSON và media cục bộ. Không có phụ thuộc production, CDN, font ngoài hoặc API Internet. Poll trạng thái 500 ms; đồng hồ lấy mốc thời gian máy chủ. API TV loại đáp án chưa công bố, lựa chọn riêng của MC và media gợi ý chưa hiện. File API hỗ trợ byte range cho video. Fullscreen dùng requestFullscreen/exitFullscreen/fullscreenchange, không giả bằng CSS.

Dữ liệu schema 2; nhận cả bản sao `studio-2010-v1` và `studio-2010-v2`. Chuyển đổi cộng thêm trường mới, giữ nội dung và ID cũ. Ghi trạng thái bằng tệp tạm rồi đổi tên; dữ liệu lỗi không bị tự thay bằng dữ liệu mẫu.

```sh
npm ci
npm start
npm test
npm run check
npm run test:browser
```

Kiểm thử trình duyệt dùng `/usr/bin/chromium`; đặt `CHROMIUM_PATH` nếu khác. Test dùng dữ liệu tạm riêng và media mẫu trong `test/fixtures`. Đóng gói bằng `python3 scripts/package.py releases` với runtime Node.js 24.14.0 Windows x64 đã tải vào `work`; xác minh SHA-256 trước khi ghi ZIP. Người tổ chức không cần chạy các lệnh này.

Xem **KIEM-THU.md** để biết kết quả và các phần chưa kiểm tra trên Windows/TV thật.
