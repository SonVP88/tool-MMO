@echo off
chcp 65001 >nul
title AUTOMATION STUDIO - SETUP MAY MOI
cd /d "%~dp0"
if exist "tool-MMO\1_Cai_Dat_Moi_Truong.bat" cd tool-MMO
call 1_Cai_Dat_Moi_Truong.bat
