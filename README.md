# Brain10 — website giới thiệu & tải sản phẩm

Mã nguồn **website**, độc lập với app Android. Website giới thiệu dự án, đội ngũ, các bản tải và trạng thái phát triển. Không chạy ứng dụng quản lý thời gian trong trình duyệt.

## Chạy local

Cần Node.js, không cần cài dependencies:

```sh
npm start
```

Mở `http://127.0.0.1:4174`. Có thể đổi cổng bằng biến môi trường `PORT`. Server chỉ bind localhost.

Nếu file `../mobile/build/app/outputs/flutter-apk/app-debug.apk` tồn tại (bố cục workspace phát triển hiện tại), server local cho tải APK tại `/downloads/brain10-0.1.0-debug.apk`. Có thể dùng biến môi trường `BRAIN10_LOCAL_APK` để trỏ tới một bản cài khác đã đối chiếu metadata. APK không được copy vào repo, không đi cùng deployment.

## Cấu trúc

```text
dist/
  index.html       Landing page
  style.css        Responsive layout
  site.js          Menu, FAQ/dialog, thông tin tải
  release.json     Metadata phát hành, không chứa file APK
  assets/          Logo, font có license, ảnh giao diện app
server.mjs         Preview cục bộ; không dùng làm server Vercel
vercel.json        Cấu hình static deployment
```

## Deploy Vercel sau bước xem local

Import repository `zomboXx/UTE-START-UP-2026` vào tài khoản Vercel có quyền; dùng:

- Framework: **Other**.
- Root Directory: thư mục gốc repo.
- Build Command: để trống.
- Output Directory: **dist** (đã khai báo trong vercel.json).
- Không cần biến môi trường cho landing page.

Đây là trang HTML/CSS/JS tĩnh; `server.mjs` chỉ phục vụ xem local và APK local. Không thêm file APK vào `dist` hay Git. [Tài liệu Vercel](https://vercel.com/docs/builds/configure-a-build).

Chưa tạo project hoặc deploy Vercel trong bước thiết kế local đầu tiên. Người dùng yêu cầu xem trước trước khi công khai website. Repo có thể chứa source trước; không coi việc push source là đã deploy.

## Bản tải

`dist/release.json` mặc định có `downloadUrl: null`, nên bản được host hiển thị **Chưa mở tải công khai**. Local server chỉ cung cấp link thử khi tìm thấy APK. Nhãn extension là chưa có bản phát hành.

Khi sẵn sàng phát hành:

1. Kiểm chứng bản Android, chuẩn bị ghi chú phiên bản và chữ ký phù hợp.
2. Upload APK dưới dạng GitHub Release asset ở repo app hoặc repo phát hành.
3. Cập nhật `version`, `channel`, `androidMinimum`, `bytes`, `sha256`, `downloadUrl`, `deviceTested` cho đúng file.
4. Cập nhật nội dung/nhãn trong index.html cùng phiên bản; hiện bản site đầu dùng nội dung 0.1.0 cố định.
5. Deploy website. Link tải được cho phép là HTTPS GitHub Releases dưới tài khoản `zomboXx`; khi đổi nơi lưu file, cập nhật kiểm tra URL tại site.js.

GitHub chặn file trên 100 MiB trong Git; bản APK debug hiện khoảng 140 MiB, phù hợp đặt ở Releases thay vì source. [GitHub: large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## Nội dung & giới hạn

- Android là sản phẩm chính; extension là tùy chọn.
- Ảnh app lấy từ render widget Flutter 0.1, không phải bằng chứng chạy trên điện thoại. Các hình minh họa có nhãn.
- Không có số người dùng, lời chứng thực hay lời hứa hiệu quả được dựng lên.
- Screen time đã có mã tích hợp Android, chưa kiểm chứng runtime trên thiết bị; Focus chưa khóa ứng dụng; GPT và nhóm thật chưa tích hợp.
- Không có form thu thập thông tin, analytics, login hoặc cookies do mã website đặt. Font được self-host; hosting có thể có log truy cập.
- Chưa có tên/ảnh cá nhân và thông tin liên hệ được xác nhận của các thành viên, nên phần đội ngũ giới thiệu vai trò.

## Kiểm tra

`npm run check` kiểm tra cú pháp JavaScript. Bản local đã được kiểm tra browser ở desktop và viewport điện thoại, menu, dialog, FAQ, HTTP headers của file tải và trạng thái không có URL phát hành. Các ảnh QA trong `screenshots/` không đưa vào Git.

Font Plus Jakarta Sans: Google Fonts, SIL Open Font License; xem `dist/assets/OFL-Jakarta.txt`. Repo chưa được gán giấy phép mã nguồn thay mặt chủ sở hữu.
