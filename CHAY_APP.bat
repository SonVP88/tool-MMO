@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - LAUNCHER
echo =====================================================================
echo    AUTOMATION STUDIO - TU DONG HOA SAN XUAT HANG LOAT (PRO V2.2.1)
echo =====================================================================
echo.

cd /d "%~dp0"
if exist "tool-MMO\python-worker" cd tool-MMO

REM 1. Kiem tra va khoi dong Python Bridge Server & UI (Port 5678)
echo [*] Dang kiem tra may chu Pipeline & Giao dien (Port 5678)...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5678/api/tasks' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo [*] Dang khoi dong may chu Backend & Giao dien ung dung...
    start /min cmd /c "python python-worker/local_bridge_server.py"
)

REM 2. Cho may chu phan hoi HTTP 200 OK (tranh loi Refused Connection tren may cham)
echo [*] Dang dong bo ket noi he thong...
powershell -NoProfile -Command "for ($i=0; $i -lt 25; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5678/' -TimeoutSec 1 -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 400 }; exit 0"

REM 3. Mo cua so Desktop Native Mode
echo [*] Dang mo giao dien Desktop Native Mode...
start "" "msedge.exe" --app="http://127.0.0.1:5678" --window-size=1360,840 --disable-features=Translate

echo.
echo [V] Ung dung da khoi chay thanh cong tren Desktop!
exit
