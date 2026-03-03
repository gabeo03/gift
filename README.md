# 🦕 Dino Quiz Game v2

Game khủng long chạy + trả lời câu hỏi. Trả lời đúng **5 lần liên tiếp** để khủng long đực gặp khủng long cái 💕

## 🖼️ Đặt ảnh khủng long

**Bắt buộc:** Đặt 2 file ảnh vào thư mục `assets/`:

```
assets/
  dino_male.png      ← ảnh khủng long đực (nhân vật chính)
  dino_female.png    ← ảnh khủng long cái (phần thưởng)
```

> Nếu không có ảnh, game vẫn chạy được với màu placeholder (xanh / hồng).

## 🚀 Cài đặt & Chạy

```bash
npm install
npm run dev
```

Mở: http://localhost:3000

## 🎮 Luật chơi

- Nhấn **SPACE** hoặc **↑** để nhảy qua chướng ngại vật
- Khi va chạm → trả lời câu hỏi hiện ra
- Trả lời **đúng** → streak +1, tiếp tục chạy
- Trả lời **sai** → streak reset về 0 💔, tiếp tục chạy
- Đúng **5 lần liên tiếp** → khủng long đực gặp khủng long cái 🎉

## 📝 Thêm câu hỏi

Mở `main.js`, sửa mảng `questions`:

```js
const questions = [
  { question: "Câu hỏi của bạn?", answer: "đáp án" },
  ...
];
```

## 🔗 API nhận quà

Trong `main.js`, hàm `callRewardAPI()` trong `WinScene`:

```js
fetch('/api/claim-reward', { ... })
```

Thay URL bằng endpoint backend thật của bạn.

## 📦 Build

```bash
npm run build   # output: dist/
```
