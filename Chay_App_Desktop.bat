@echo off
title AUTOMATION STUDIO MMO PRO - DESKTOP APP
cd /d "%~dp0"
if exist "tool-MMO\CHAY_APP.bat" cd tool-MMO
call CHAY_APP.bat
