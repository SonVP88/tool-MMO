@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - LAUNCHER
echo =====================================================================
echo    AUTOMATION STUDIO - TU DONG HOA SAN XUAT HANG LOAT (PRO V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"
if exist "tool-MMO\package.json" cd tool-MMO

if not exist "node_modules" (
    echo [!] Phat hien day la may moi chua cai thu vien.
    echo [*] Dang tu dong chuyen huong cai dat...
    call CAI_DAT_MAY_MOI.bat
)

REM 1. Kiem tra va khoi dong Python Bridge Server (Port 5678)
echo [*] Dang kiem tra Loi thuc thi Pipeline Server (Port 5678)...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5678/api/tasks' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo [*] Dang khoi dong Loi xu ly thuc te Python Server...
    start /min cmd /c "python python-worker/local_bridge_server.py"
    timeout /t 1 /nobreak >nul
)

REM 2. Kiem tra va khoi dong Giao dien UI (Port 5173)
echo [*] Dang kiem tra may chu giao dien ung dung...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo [*] Dang khoi dong may chu giao dien...
    start /min cmd /c "npm run dev"
    timeout /t 2 /nobreak >nul
)

REM 3. Mo cua so Desktop Native Mode
echo [*] Dang mo giao dien Desktop Native Mode...
start "" "msedge.exe" --app="http://127.0.0.1:5173" --window-size=1360,840 --disable-features=Translate

echo.
echo [V] Ung dung da khoi chay thanh cong!
exit
