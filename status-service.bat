@echo off
echo Checking Volt Tasks Bot Service Status...
pm2 status
pm2 logs volt-tasks-bot --lines 20
pause

