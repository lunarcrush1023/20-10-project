# 20/10 Minigame Studio 2.2.1 · Chuyến Bay Tinh Cầu V4

Ứng dụng dẫn minigame ngoại tuyến: Admin trên laptop, trình chiếu riêng trên TV. Giao diện hoàn toàn bằng tiếng Việt, không tài khoản ứng dụng, không dịch vụ trả phí, không cần Internet khi tổ chức.

**[Tải bản Windows 2.2.1](https://github.com/lunarcrush1023/20-10-project/blob/main/releases/20-10-Minigame-Studio-2.2.1-Windows.zip?raw=true)** — khoảng 33 MB, có sẵn bộ chạy. Nếu thấy trang tệp ZIP, bấm **Download raw file**.

## Nếu bạn đang dùng bản 1.0, 2.0, 2.1 hoặc 2.1.1 — giữ nguyên dữ liệu cũ

1. Mở ứng dụng **bản cũ**, vào **Thiết lập → Sao lưu toàn bộ**, lưu tệp JSON ở nơi dễ tìm. Bản sao này chứa câu hỏi, tệp đính kèm, điểm và tiến trình.
2. Đóng cửa sổ khởi động bản cũ. Tải ZIP 2.2.1 và **giải nén vào thư mục mới**, không xóa thư mục cũ, không mở hai phiên bản cùng lúc.
3. Trong thư mục mới, nhấp đúp **KHOI-DONG.cmd**. Trình duyệt tự mở sau khoảng 2 giây. Nếu trình duyệt đang giữ trang cũ, nhấn Ctrl + F5.
4. Vào **Thiết lập → Khôi phục từ bản sao**, chọn JSON vừa lưu và xác nhận. Kiểm tra số câu, tên tổ, điểm và phát thử các tệp của bạn.
5. Xuất thêm một bản sao từ phiên bản 2.2.1 trước sự kiện. Bản sao 2.2.1 chứa cả gợi ý đa phương tiện và lịch sử điểm; không khôi phục nó bằng ứng dụng 1.0/2.0/2.1.

Ứng dụng không thể tự lấy câu hỏi đã nhập trên laptop của bạn từ GitHub. Hãy dùng bản sao JSON để chuyển dữ liệu. Gói tải về không chứa dữ liệu sự kiện của bạn và không tự xóa dữ liệu cũ. Nếu dùng trực tiếp thư mục data cũ với máy chủ 2.2.1, ứng dụng tạo bản trạng thái nguyên gốc `data/before-v4-<thời điểm>.json` trước khi chuyển đổi; toàn bộ tệp media giữ nguyên. Cách dùng giao diện sao lưu/khôi phục ở trên vẫn được khuyến nghị cho người tổ chức.

## Cài mới và mở ứng dụng

1. Tải ZIP, bấm chuột phải → **Extract All / Giải nén tất cả** vào Documents. Không chạy ngay trong ZIP hoặc thư mục chỉ đọc.
2. Nhấp đúp **KHOI-DONG.cmd**. Không cần cài Node.js, viết mã hoặc gõ lệnh. Giữ cửa sổ khởi động mở trong sự kiện.
3. Trình duyệt mở trang Admin. Nếu chưa mở, nhập **http://127.0.0.1:2010** vào Edge/Chrome.
4. Khi dùng xong, sao lưu dữ liệu rồi đóng cửa sổ khởi động. Lần sau mở lại bằng KHOI-DONG.cmd.

Nếu Windows hoặc máy công ty chặn tệp tải xuống, kiểm tra nguồn tải và chính sách máy; không tắt cơ chế bảo vệ. Gói chưa ký số. Nếu báo cổng đang dùng, đóng cửa sổ khởi động phiên bản cũ trước.

## Tên chương trình và theme V4

Tên minigame mặc định là **20/10 Minigame Studio**. Khi nâng cấp hoặc khôi phục bản sao, tên tạm “Vụ Nổ Bé” tự đổi về tên này; tên khác do bạn tự đặt vẫn được giữ. Vào **Thiết lập → Tên minigame → Lưu thiết lập** để đổi tên; Admin, tiêu đề trình duyệt, màn hình TV và khung xem trước cập nhật cùng nhau. Tên này được sao lưu/khôi phục, tách riêng khỏi thông điệp màn hình chào và nội dung câu hỏi. Dữ liệu cũ chưa có tên sẽ dùng mặc định, không ghi đè thông điệp cũ.

**Chuyến Bay Tinh Cầu V4** là chủ đề hình ảnh: thẻ lên tàu, nền sao, hành tinh hoạt hình 3D và vệ tinh nhỏ. Màu tổ cố định: Tổ 1 cyan #79E7F0, Tổ 2 tím #B18CFF, Tổ 3 hồng #FF8DBF, Tổ 4 xanh ngọc #7DE9C7. Siêu khó/vòng tự do dùng hành tinh vàng. Màu nhấn trong Thiết lập áp dụng cho điều khiển, không thay bốn màu tổ.

Khung ĐANG TRÊN TV dùng cùng trang TV và dữ liệu công khai. Màn chờ giữ kín câu hỏi, phương án và đáp án; hình thẻ và hành tinh chỉ là trang trí. Video đặc biệt vẫn phát sạch toàn màn hình. Hoạt ảnh giảm/tắt theo thiết lập giảm chuyển động của hệ thống. Toàn bộ đồ họa/font hệ thống chạy ngoại tuyến.

## Quản lý câu hỏi

Bản cài mới có 19 mục: 1–8 Trong MV, 9–12 Chủ đề khác, 13–17 Dự phòng, 18 Siêu khó cá nhân và 19 Video đặc biệt. Dữ liệu 2.1 tự chuyển thứ tự Dự phòng lên trước Siêu khó và thêm mục video cuối cùng, giữ nguyên ID, nội dung và tệp. Nếu đã có nhiều câu hơn mẫu, ứng dụng giữ tất cả câu và sắp theo nhóm; số thứ tự cuối có thể lớn hơn 19. Nút ↑/↓ đổi thứ tự trong cùng nhóm. Dữ liệu cũ được giữ đầy đủ: câu phân định hòa chuyển thành dự phòng, không xóa bớt câu. Câu siêu khó chuyển thành tự luận và giữ nội dung đáp án cũ.

Thêm/sửa/nhân bản, đổi thứ tự, đính kèm ảnh/âm thanh/video từ máy rồi bấm Lưu câu hỏi. Trắc nghiệm chỉ hiện phần phương án; tự luận chỉ hiện đáp án tham khảo. Đổi loại vẫn giữ nội dung đang ẩn. Có thể bật gợi ý chữ và media; tắt gợi ý không xóa nội dung. Xem trước riêng không gửi lên TV.

## Điều khiển trực tiếp

1. Chọn câu bằng danh sách hoặc Câu trước/Câu tiếp theo: TV chỉ hiện “Chuẩn bị…” cùng số câu và nhóm. Bấm **HIỆN CÂU HỎI** mới công bố nội dung, luôn giấu đáp án và xóa phản hồi/lựa chọn trước đó. Nếu bật đồng hồ, thao tác này tự đặt lại thời lượng và bắt đầu đếm ngay.
2. Admin luôn thấy đáp án đúng màu xanh và giải thích riêng. Khung TV ở giữa hiển thị trạng thái công khai, gồm màn chờ, câu hỏi, điểm, đồng hồ và kết quả; bản xem trước tắt tiếng.
3. Câu trắc nghiệm: bấm phương án tổ đã trả lời để chấm ngay. Câu thường đúng cộng 1; sai cộng 0. Cả hai đều công bố đáp án và kết thúc câu. Tự luận dùng nút Đúng/Sai.
4. Chịu thua chuyển lần lượt Tổ 1 → 2 → 3 → 4 → 1. Khi bốn tổ khác nhau cùng chịu thua ở một câu, ứng dụng tự mở vòng tự do và bỏ chọn tổ. Chọn tổ giơ tay: sai thì tiếp tục ẩn đáp án và bỏ chọn tổ, đúng cộng 1 rồi công bố/kết thúc.
5. Câu thường tiếp theo bắt đầu ở tổ sau tổ trả lời cuối của câu trước, kể cả trả lời sai. MC có thể chọn lại tổ bất kỳ.
6. Câu siêu khó luôn tự luận cá nhân, không nhập tên người thắng, không cộng điểm tổ. Sai cho thử tiếp và ẩn đáp án; đúng công bố/kết thúc.
7. Câu dự phòng bắt đầu chưa chọn tổ. MC chọn bất kỳ tổ giơ tay; sai tiếp tục ẩn đáp án và bỏ chọn tổ, đúng cộng đúng 1 điểm rồi kết thúc.
8. **HIỆN ĐÁP ÁN** kết thúc câu, không cộng điểm. Câu đã kết thúc không được chấm lại để cộng điểm lần nữa. Dùng Hoàn tác nếu thao tác nhầm. Mở lại câu đã chấm vẫn giấu đáp án, không cộng điểm lại; dùng HIỆN ĐÁP ÁN để công bố lại.

Nút **+ / −** nằm ngay từng thẻ tổ, mỗi lần điều chỉnh 1 điểm và ghi lịch sử. Không còn Tab 03. Đổi tên tổ trong Thiết lập; xem lịch sử điểm tại Điều khiển trực tiếp. Nút cúp công bố tổ vô địch nằm cùng vùng Trình chiếu với Chào mừng/Bảng điểm. Nếu hòa dẫn đầu, dùng câu dự phòng để phân định trước khi công bố.

Đồng hồ: bật/tắt, đặt số giây. HIỆN CÂU HỎI tự chạy đồng hồ; Tạm dừng giữ thời gian còn lại, Tiếp tục chạy tiếp, Đặt lại đưa về thời lượng cấu hình và tạm dừng. Bấm Bắt đầu để chạy sau khi đặt lại. Video đặc biệt không chạy đồng hồ. Mặc định hết giờ chỉ dừng đồng hồ. Tùy chọn tự chuyển tổ trong Thiết lập áp dụng khi đang có tổ được chọn; lượt mới chờ MC bắt đầu đồng hồ. Không bắt đầu đồng hồ khi câu còn ở màn chờ. Nút phát/dừng câu hỏi và gợi ý điều khiển media trên TV; chỉ phát gợi ý sau khi hiện gợi ý.

## Video đặc biệt — mục cuối chương trình

1. Trong Quản lý câu hỏi, sửa mục **Video đặc biệt**: nhập tiêu đề và tải một video **MP4** từ máy, tối đa 100 MB, rồi lưu. Không có phương án/đáp án/gợi ý/giải thích cho mục này. Ưu tiên MP4 H.264/AAC.
2. Trong Điều khiển trực tiếp, chọn mục cuối → **HIỆN VIDEO**. Video tự phát trên toàn vùng TV, không khung câu hỏi, điểm, tổ hoặc đồng hồ. Tỷ lệ video được giữ, có thể có viền đen để không cắt hình.
3. Dùng **Phát / Tạm dừng**, **Phát lại từ đầu**, thanh **Âm lượng** và **Tắt tiếng / Bật tiếng** trên Admin. Khi video kết thúc, bấm Phát lại từ đầu để xem lại.
4. Khung ĐANG TRÊN TV cũng phát video nhưng luôn tắt tiếng. Nếu trình duyệt chặn tự phát có tiếng, bấm **Bật âm thanh** trên cửa sổ TV một lần. Các nút TV hiện khi đưa chuột lên vùng góc trái trên; Esc thoát toàn màn hình như trước.
5. Tệp video được lưu ngoại tuyến và đi cùng bản sao lưu. Hãy tải video của bạn trước sự kiện; gói ứng dụng không kèm video nội dung mặc định.

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

Giữ nguyên kiến trúc bản 1.0: Node.js tiêu chuẩn, HTML/CSS/JavaScript thuần, HTTP chỉ lắng nghe loopback `127.0.0.1`, JSON và media cục bộ. Không có phụ thuộc production, CDN, font ngoài hoặc API Internet. Poll trạng thái 500 ms; đồng hồ lấy mốc thời gian máy chủ. Tên minigame là trường settings.programName tùy chọn, mặc định 20/10 Minigame Studio; giữ schema 4. Không nhập câu hỏi hoặc logic mô phỏng từ demo. API TV loại đáp án chưa công bố, lựa chọn riêng của MC và media gợi ý chưa hiện. File API hỗ trợ byte range cho video. Fullscreen dùng requestFullscreen/exitFullscreen/fullscreenchange, không giả bằng CSS.

Dữ liệu schema 4; nhận bản sao `studio-2010-v1`, `studio-2010-v2`, `studio-2010-v3` và `studio-2010-v4`. Chuyển đổi cộng thêm trường mới, giữ nội dung và ID cũ. Ghi trạng thái bằng tệp tạm rồi đổi tên; dữ liệu lỗi không bị tự thay bằng dữ liệu mẫu.

```sh
npm ci
npm start
npm test
npm run check
npm run test:browser
```

Kiểm thử trình duyệt dùng `/usr/bin/chromium`; đặt `CHROMIUM_PATH` nếu khác. Test dùng dữ liệu tạm riêng và media mẫu trong `test/fixtures`. Đóng gói bằng `python3 scripts/package.py releases` với runtime Node.js 24.14.0 Windows x64 đã tải vào `work`; xác minh SHA-256 trước khi ghi ZIP. Người tổ chức không cần chạy các lệnh này.

Xem **KIEM-THU.md** để biết kết quả và các phần chưa kiểm tra trên Windows/TV thật.

Theme nằm trong public/theme.css và public/planet.js; public/app.js gắn giao diện vào trạng thái thật. Bộ máy chấm điểm, chuyển lượt, đồng hồ và trình chiếu video giữ nguyên.
