# PropFast

Công cụ tạo và quản lý báo giá chuyên nghiệp cho bất động sản.

## Features

- Tạo báo giá nhanh với preview realtime
- Quản lý khách hàng và dự án
- Máy tính tài chính (vay mua nhà)
- Định giá nhanh bất động sản (OLS Regression)
- Chat AI tư vấn môi giới 24/7
- Xuất PDF chuyên nghiệp
- Light/Dark mode
- Responsive design

## Setup

```bash
# Clone
git clone https://github.com/noobgamer0816-beep/propfast.git
cd propfast

# Chạy local
npx serve .
# hoặc
npm start
```

## Cấu hình Chatbot

Mở `app.js`, tìm `CHATBOT_CONFIG` và thay API key:

```js
const CHATBOT_CONFIG = {
  provider: 'openai', // hoặc 'gemini'
  openaiApiKey: 'sk-xxx',     // Thay key thật
  geminiApiKey: 'AIza-xxx',   // Hoặc dùng Gemini
  ...
};
```

Lấy key:
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://aistudio.google.com/apikey

## Cấu hình Form Tư Vấn

Đăng ký tại https://formspree.io, tạo form, rồi thay `YOUR_FORMSPREE_ID` trong `app.js`.

## Tech Stack

- HTML/CSS/JS (vanilla, không framework)
- localStorage cho data persistence
- Formspree cho form submission
- OpenAI/Gemini API cho chatbot

## License

MIT
