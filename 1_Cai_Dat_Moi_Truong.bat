@echo off
title CAI DAT MOI TRUONG - AUTOMATION STUDIO MMO PRO
cd /d "%~dp0"
echo ========================================================
echo   CAI DAT THU VIEN CAN THIET CHO PHAN MEM
echo ========================================================
echo.
echo [*] Dang cai dat cac goi bo sung (edge-tts, pywebview, Pillow)...
python -m pip install -r requirements.txt
echo.
echo ========================================================
echo [OK] DA HOAN TAT CAI DAT!
echo Ban co the chay file "Chay_App_Desktop.bat" de su dung ngay!
echo ========================================================
pause
