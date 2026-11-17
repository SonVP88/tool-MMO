# 📖 HƯỚNG DẪN SỬ DỤNG CHI TIẾT - AUTOMATION STUDIO MMO PRO
> **Phần Mềm Tự Động Hóa Sản Xuất Video, Reup Lách Bản Quyền, Dịch Phụ Đề & Lồng Tiếng AI Đa Kênh**

---

## 📌 MỤC LỤC
1. [Khởi Động Phần Mềm Lần Đầu](#1-khởi-động-phần-mềm-lần-đầu)
2. [Cấu Hình Ban Đầu Bắt Buộc (API Key & Thư Mục Xuất)](#2-cấu-hình-ban-đầu-bắt-buộc)
3. [Hướng Dẫn Chi Tiết Từng Tính Năng & Luồng Hoạt Động](#3-hướng-dẫn-chi-tiết-từng-tính-năng)
   - [Luồng 1: Tự Động Hóa Reup Toàn Diện (PRO AUTOMATION)](#luồng-1-tự-động-hóa-reup-toàn-diện-pro-automation)
   - [Luồng 2: Lách Bản Quyền Nâng Cao (REUP STUDIO)](#luồng-2-lách-bản-quyền-nâng-cao-reup-studio)
   - [Luồng 3: Sản Xuất Video Truyện Audio & Podcast (TEXT-TO-VIDEO)](#luồng-3-sản-xuất-video-truyện-audio--podcast)
   - [Luồng 4: Biên Tập Phụ Đề & Nghe Thử Từng Câu (VOICE STUDIO)](#luồng-4-biên-tập-phụ-đề--nghe-thử-từng-câu-voice-studio)
   - [Luồng 5: Quản Lý Đa Kênh (CHANNEL PRESETS)](#luồng-5-quản-lý-đa-kênh-channel-presets)
4. [Tự Động Hóa Với CapCut PC (Tùy Chọn)](#4-tự-động-hóa-với-capcut-pc)
5. [Cách Đóng Gói File Gửi Cho Người Khác (Có Cài Mật Khẩu)](#5-cách-đóng-gói-file-gửi-cho-người-khác-có-cài-mật-khẩu)
6. [Các Lỗi Thường Gặp & Cách Khắc Phục Nhanh](#6-các-lỗi-thường-gặp--cách-khắc-phục-nhanh)

---

## 1. KHỞI ĐỘNG PHẦN MỀM LẦN ĐẦU

### Yêu cầu máy tính:
* **Hệ điều hành:** Windows 10 hoặc Windows 11 (64-bit).
* **Python:** Cần cài đặt Python 3.10 trở lên *(khi cài nhớ tích chọn `Add Python to PATH`)*.

### Các bước mở phần mềm:
1. **Bước 1 (Chỉ chạy 1 lần khi mới tải về máy):**
   * Nhấp đúp chuột vào file: `1_Cai_Dat_Moi_Truong.bat`
   * Cửa sổ sẽ tự động tải các gói xử lý âm thanh và giao diện (khoảng 30 giây đến 1 phút). Khi báo `[OK] DA HOAN TAT CAI DAT!`, nhấn phím bất kỳ để đóng lại.
2. **Bước 2 (Mở phần mềm):**
   * Nhấp đúp chuột vào file: `Chay_App_Desktop.bat`
   * Cửa sổ Desktop App của phần mềm sẽ tự động bật lên màn hình với giao diện làm việc độc lập.

---

## 2. CẤU HÌNH BAN ĐẦU BẮT BUỘC

Trước khi bấm chạy video đầu tiên, bạn cần cấu hình 2 thông tin cơ bản:

### A. Cài đặt API Key Dịch Thuật & Whisper
1. Ở thanh công cụ trên cùng, bấm nút **"Cấu Hình API Dịch"** (biểu tượng chiếc chìa khóa / tia sáng).
2. Điền **Gemini API Key**:
   * *Cách lấy miễn phí:* Truy cập [Google AI Studio](https://aistudio.google.com/), đăng nhập Gmail và bấm **Get API Key**.
   * Dán key vào ô `Gemini API Key` rồi bấm nút **"Kiểm Tra Key"** bên cạnh. Khi hiện dòng chữ màu xanh `Kết nối Gemini 2.5 Flash thành công!` là chuẩn xác.
3. Điền **Groq API Key** (Tùy chọn nhận diện giọng nói siêu tốc):
   * Lấy miễn phí tại [Groq Cloud Console](https://console.groq.com/).
4. Bấm **"Lưu Cấu Hình"**.

### B. Chọn Thư Mục Xuất Video
* Thư mục mặc định xuất file là `C:\Output`.
* Nếu muốn đổi sang ổ đĩa khác (như `D:\VideoXuat` hoặc `E:\ThanhPham`):
  - Kéo xuống bảng **CÀI ĐẶT XỬ LÝ HÀNG LOẠT** ở góc dưới bên phải.
  - Sửa đường dẫn tại ô **Thư mục xuất**.
  - Bấm nút **"Mở Thư Mục Xuất"** trên thanh điều khiển để kiểm tra.

---

## 3. HƯỚNG DẪN CHI TIẾT TỪNG TÍNH NĂNG

### LUỒNG 1: TỰ ĐỘNG HÓA REUP TOÀN DIỆN (PRO AUTOMATION)
> *Dành cho việc reup video hàng loạt từ Douyin, TikTok, YouTube hoặc file có sẵn trên máy.*

* **Bước 1: Nạp video vào hàng đợi**
  - Bấm nút xanh dương **"+ Thêm Link / Video"**.
  - *Nếu có link mạng:* Chọn tab **Nhập Link**, dán danh sách link (mỗi dòng 1 link Douyin / TikTok / YouTube Shorts) rồi bấm Thêm.
  - *Nếu có file sẵn trong máy:* Chọn tab **Chọn File Video Có Sẵn**, bấm **"Chọn File Video (.mp4)"** hoặc kéo thả nhiều file video vào ô vuông.
* **Bước 2: Căn chỉnh vùng phụ đề trên màn hình xem trước (Bên phải)**
  - **Khung màu xanh dương [SUB CŨ (BLUR)]**: Dùng chuột kéo ô này đè lên vị trí phụ đề gốc của video để làm mờ, che chữ cũ. Bạn có thể kéo 4 góc để phóng to/thu nhỏ.
  - **Khung màu cam [KHUNG SUB (GLOBAL)]**: Kéo ô này đến vị trí bạn muốn hiển thị phụ đề tiếng Việt mới.
  - *(Mẹo hay)*: Bấm nút **"🔍 Tự động dò vị trí Sub cũ (Auto OCR)"** ở dưới video để AI tự nhận diện tọa độ chữ tiếng Trung và đặt khung che chuẩn xác 100%.
* **Bước 3: Chọn cấu hình xử lý**
  - **Chế độ xuất (Render Engine):** Chọn `FFmpeg Siêu Tốc (Chạy ngầm 100%)`.
  - **Giọng đọc (TTS):** Chọn giọng bạn thích (ví dụ: *Cô Gái Hoạt Ngôn*, *Nam Miền Bắc Trầm Ấm*, *Nam Miền Nam Truyền Cảm*...).
  - **Tốc độ đọc:** Kéo thanh trượt từ `1.0x` đến `1.2x` (khuyên dùng `1.1x` cho video ngắn).
  - **Nhạc nền & Khử âm:** Chọn `Tách giọng gốc triệt để (Vocal Cut)` để giữ lại âm thanh môi trường và loại bỏ tiếng nói gốc.
* **Bước 4: Bắt đầu chạy**
  - Bấm nút màu xanh lá **"▶ AUTO - TỰ ĐỘNG CHẠY"**.
  - Phần mềm sẽ tự động tải video -> tách audio -> nhận diện Whisper -> dịch thuật Gemini AI -> tạo giọng đọc mới -> ghép video và lưu file thành phẩm.
  - Khung **THỰC THI THỜI GIAN THỰC (LIVE LOG)** bên dưới sẽ hiển thị chi tiết tiến độ từng giây. Khi hoàn tất, video sẽ có chữ `DONE` màu xanh.

---

### LUỒNG 2: LÁCH BẢN QUYỀN NÂNG CAO (REUP STUDIO)
> *Dành cho những bạn làm nội dung cần vượt qua các bộ quét bản quyền gắt gao của Douyin, TikTok và YouTube Shorts.*

1. Trên thanh điều hướng trên cùng, bấm vào tab **REUP STUDIO**.
2. Bật các bộ lọc chống quét ma trận điểm ảnh:
   - **Lật Gương Video (Horizontal Flip):** Đảo ngược khung hình trái/phải để phá vỡ góc quay gốc.
   - **Zoom Cắt Viền (Smart Crop Zoom):** Kéo thanh trượt lên `104%` hoặc `106%` để cắt xén 2-4% viền màn hình.
   - **Chỉnh Màu & Độ Tương Phản:** Tăng độ tương phản lên `1.05`, bão hòa màu lên `1.10` để làm màu sắc tươi tắn và khác biệt với video gốc.
   - **Nhiễu Hạt Vi Mô (Micro-Noise Overlay):** Đặt mức `2%` để rải hạt nhiễu vô hình chống thuật toán quét Hash hình ảnh.
   - **Xóa Sạch Metadata:** Tích chọn để xóa mọi dấu vết ngày giờ, phần mềm tạo video gốc.
   - **Đổi Mã Hash File (MD5/SHA256):** Tích chọn để mỗi video xuất ra đều mang một mã nhận diện độc nhất trên Internet.
3. Bấm nút xanh lá **"ÁP DỤNG CHO HÀNG ĐỢI"**. Các video render tiếp theo sẽ tự động được áp dụng các hiệu ứng này.

---

### LUỒNG 3: SẢN XUẤT VIDEO TRUYỆN AUDIO & PODCAST
> *Dành cho việc chuyển các chương truyện chữ, review phim, sách nói hoặc podcast thành video Full HD hoàn chỉnh.*

1. Ở góc trên bên trái, bấm vào nút **"TỰ ĐỘNG HÓA TRUYỆN AUDIO"**.
2. **Nhập nội dung:**
   - Dán trực tiếp văn bản vào ô lớn bên trái, hoặc bấm nút **"Nạp File .TXT"** để chọn file chương truyện có sẵn trên máy tính.
3. **Cài đặt giọng đọc & nhạc nền (Cột bên phải):**
   - **Giọng đọc AI:** Chọn giọng đọc truyền cảm phù hợp đọc truyện (ví dụ: *Nam Miền Bắc Trầm Ấm* hoặc *Giọng Trầm Kể Chuyện*).
   - **Tốc độ đọc:** Điều chỉnh từ `1.0x` đến `1.15x`.
   - **Nhạc nền BGM:** Chọn thể loại nhạc nền (Cổ phong, nhẹ nhàng, du dương).
   - **Âm lượng BGM:** Kéo ở mức `10% - 15%` để nhạc nền vừa đủ du dương mà không át tiếng đọc (phần mềm có tích hợp công nghệ Smart Ducking tự giảm nhạc khi có giọng nói).
   - **Video nền:** Chọn video nền Loop phong cảnh Anime 4K hoặc trừu tượng.
4. **Bấm "Tạo Video Truyện Audio Ngay":**
   - Dự án sẽ được chuyển ngay vào hàng đợi sản xuất. Bạn chỉ cần bấm chạy là hệ thống sẽ tự sinh file video MP4 1080p kèm tiêu đề chữ vàng ánh kim sang trọng.

---

### LUỒNG 4: BIÊN TẬP PHỤ ĐỀ & NGHE THỬ TỪNG CÂU (VOICE STUDIO)
> *Dành cho những video quan trọng cần nghe thử, chỉnh sửa văn bản từng câu hoặc phân chia nhiều giọng đọc khác nhau.*

1. Trên thanh điều hướng trên cùng, bấm vào tab **VOICE STUDIO**.
2. Ở ô **Video đang chọn**, chọn video bạn muốn chỉnh sửa trong danh sách thả xuống.
3. Bảng danh sách phụ đề sẽ hiển thị:
   - **Cột Mốc Thời Gian:** Cho phép chỉnh giờ:phút:giây hiển thị câu thoại.
   - **Cột Câu Dịch Tiếng Việt:** Nhấp trực tiếp vào ô văn bản để gõ sửa lại theo ý bạn.
   - **Cột Giọng Đọc (TTS):** Có thể gán giọng đọc khác nhau cho từng câu (ví dụ câu này giọng Nữ, câu sau giọng Nam).
   - **Cột Thao Tác (Nút Loa):** Bấm vào biểu tượng **Loa màu xanh** để nghe phát giọng đọc thật trực tiếp ra loa/tai nghe máy tính.
4. **Các nút tiện ích ở trên cùng:**
   - **Thêm Câu:** Thêm một dòng câu thoại mới vào timeline.
   - **Lưu Phụ Đề:** Lưu toàn bộ thay đổi vào file `.srt` của video.
   - **Xuất .SRT / Xuất .ASS:** Tải file phụ đề chuẩn hiển thị đẹp mắt về máy.
   - **Ghép File Audio .MP3:** Xuất riêng một file âm thanh hoàn chỉnh chứa toàn bộ giọng đọc đã ghép.

---

### LUỒNG 5: QUẢN LÝ ĐA KÊNH (CHANNEL PRESETS)
> *Dành cho người làm nhiều kênh cùng lúc (ví dụ có 1 kênh TikTok, 1 kênh YouTube và 1 Fanpage Facebook).*

1. Bấm tab **QUẢN LÝ KÊNH** trên thanh điều hướng.
2. Bấm nút **"+ Thêm Kênh Mới"**:
   - Nhập tên kênh (ví dụ: *Kênh Review Phim Shorts*).
   - Chọn nền tảng (*TikTok*, *YouTube*, hoặc *Facebook*).
   - Chọn Profile cài đặt tương ứng.
3. Mỗi kênh được tạo ra sẽ có:
   - Thư mục lưu video riêng biệt (tránh lẫn lộn file giữa các kênh).
   - Nút **"Mở Thư Mục"** để truy cập nhanh thư mục video của kênh đó chỉ với 1 cú click.

---

## 4. TỰ ĐỘNG HÓA VỚI CAPCUT PC (TÙY CHỌN NÂNG CAO)

Nếu bạn muốn tận dụng giao diện dựng phim của CapCut PC hoặc dùng các tính năng CapCut Pro:
1. Tại bảng **CÀI ĐẶT XỬ LÝ HÀNG LOẠT** (màn hình chính), mục **Chế độ xuất (Render Engine)**:
   - Chọn: `Native CapCut Pro (Dùng 100% Tách Sub, Dịch & Giọng VIP CapCut Pro)`.
2. Bấm nút **"Cấu Hình CapCut PC"** ở góc trên bên phải khung cài đặt:
   - Bấm **"Tự động nhận diện"** để phần mềm tự tìm đường dẫn thư mục `com.lveditor.draft` và file `CapCut.exe`.
3. Khi chạy:
   - Phần mềm sẽ tự động dựng sẵn project draft gồm 4 lớp (Tracks): Video gốc, Lớp phủ làm mờ sub cũ, Phụ đề tiếng Việt và Giọng đọc lồng tiếng đã căn khớp timeline 100%. Bạn chỉ việc mở CapCut lên và xuất video ngay.

---

## 5. CÁCH ĐÓNG GÓI FILE GỬI CHO NGƯỜI KHÁC (CÓ CÀI MẬT KHẨU)

Khi bạn muốn chia sẻ phần mềm này cho đồng đội, khách hàng hoặc máy tính khác:
1. Vào thư mục gốc `toolMMO`.
2. Nhấp đúp chuột vào file:
   👉 **`Tao_File_Nen_Co_Mat_Khau.bat`**
3. Cửa sổ dòng lệnh hiện ra, bạn **nhập mật khẩu mong muốn** (ví dụ: `123456`) rồi nhấn **Enter**.
4. Hệ thống sẽ tự động dọn sạch rác, tối ưu dung lượng siêu nhẹ và tạo ra file:
   `AutomationStudio_MMO_Pro_YYYYMMDD_HHMM.7z`
5. **Gửi file này cùng mật khẩu cho người nhận.** Người nhận giải nén ra, chạy `1_Cai_Dat_Moi_Truong.bat` một lần duy nhất, sau đó nhấp `Chay_App_Desktop.bat` là dùng được ngay.

---

## 6. CÁC LỖI THƯỜNG GẶP & CÁCH KHẮC PHỤC NHANH

| Hiện tượng | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Bấm chạy báo lỗi: "Chưa cấu hình Gemini API Key"** | Chưa dán key dịch thuật | Bấm vào nút **"Cấu Hình API Dịch"** ở trên cùng, dán Gemini API Key thật và bấm Lưu. |
| **Bấm "AUTO - TỰ ĐỘNG CHẠY" nhưng hàng đợi không chạy** | Chưa có video trong danh sách | Bấm **"+ Thêm Link / Video"** để nạp ít nhất 1 video vào bảng trước khi chạy. |
| **Video render xong bị đầy ổ đĩa** | Ổ C:\ không đủ dung lượng | Đổi đường dẫn tại ô **Thư mục xuất** sang ổ `D:\Output` hoặc `E:\Output`. |
| **Không nghe thấy giọng nói khi bấm nút Loa trong Voice Studio** | Câu thoại đang để trống văn bản | Nhập nội dung tiếng Việt vào ô dịch rồi bấm lại nút Loa. |
| **Mở file Desktop App bị báo không tìm thấy Python** | Máy chưa cài Python hoặc chưa tích PATH | Tải Python từ [python.org](https://www.python.org/) (chọn bản 3.10 hoặc 3.11), khi cài **bắt buộc tích ô "Add Python to PATH"**. |

---
*Tài liệu được phát hành đồng bộ cùng phiên bản Automation Studio MMO Pro v2.2.1.*
