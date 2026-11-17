@echo off
title DONG GOI & DAT MAT KHAU PHAN MEM
cd /d "%~dp0"

echo ===========================================================
echo       DONG GOI PHAN MEM AUTOMATION STUDIO MMO PRO
echo ===========================================================
echo.
set /p USER_PASS="Nhap mat khau muon dat cho file (Vi du: 123456): "

if "%USER_PASS%"=="" (
    echo [!] Ban chua nhap mat khau!
    pause
    exit /b
)

echo.
echo Dang tien hanh dong goi va ma hoa voi mat khau da chon...
python package_tool.py "%USER_PASS%" 7z

echo.
pause

