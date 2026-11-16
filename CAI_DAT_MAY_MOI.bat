@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - CÀI ĐẶT MÔI TRƯỜNG MÁY MỚI
echo =====================================================================
echo    KHỞI TẠO VÀ CÀI ĐẶT MÔI TRƯỜNG CHO MÁY TÍNH MỚI (PRO V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Đang cài đặt các thư viện giao diện (Node.js npm)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [!] Cảnh báo: Lỗi khi chạy npm install. Hãy đảm bảo máy tính đã cài Node.js.
)

echo.
echo [2/3] Đang cài đặt thư viện AI & Video Pipeline (Python pip)...
python -m pip install -r python-worker/requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [!] Cảnh báo: Hãy đảm bảo máy tính đã cài Python 3.10 trở lên.
)

echo.
echo [3/3] Đang tự động kiểm tra và tải công cụ nền (FFmpeg & yt-dlp)...
python python-worker/dependency_downloader.py

echo.
echo =====================================================================
echo [V] HOÀN TẤT THIẾT LẬP MÁY MỚI THÀNH CÔNG!
echo     Từ bây giờ, bạn chỉ cần nhấp đúp file: CHAY_APP.bat để dùng tool!
echo =====================================================================
pause
