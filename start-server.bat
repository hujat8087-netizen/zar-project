@echo off
cd /d "%~dp0"
title Zarchinar Restaurant Server
echo Starting Zarchinar Restaurant...
echo Open: http://127.0.0.1:3001
echo.
npm.cmd start
echo.
echo The server stopped. Check MongoDB and the messages above.
pause
