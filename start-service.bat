@echo off
echo Starting Volt Tasks Bot Service...
cd /d "%~dp0"
pm2 start ecosystem.config.js --env production
echo Service started successfully!
pause

