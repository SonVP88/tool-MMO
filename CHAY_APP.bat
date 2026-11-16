@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - LAUNCHER
echo =====================================================================
echo    AUTOMATION STUDIO - TỰ ĐỘNG HÓA SẢN XUẤT HÀNG LOẠT (PRO V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [!] Phát hiện đây là máy mới chưa cài thư viện.
    echo [*] Đang tự động chuyển hướng cài đặt...
    call CAI_DAT_MAY_MOI.bat
)

echo [*] Đang kiểm tra máy chủ giao diện ứng dụng...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo [*] Đang khởi động máy chủ nền...
    start /min cmd /c "npm run dev"
    timeout /t 2 /nobreak >nul
)

echo [*] Đang mở giao diện Desktop Native Mode...
start "" "msedge.exe" --app="http://127.0.0.1:5173" --window-size=1360,840 --disable-features=Translate

echo.
echo [V] Ứng dụng đã khởi chạy thành công!
exit

