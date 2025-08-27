# PowerShell script to setup PM2 auto-start on Windows
# Run this script as Administrator

Write-Host "Setting up PM2 auto-start for Volt Tasks Bot..." -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

# Get the current directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$pm2Path = (Get-Command pm2).Source

Write-Host "Current directory: $scriptPath" -ForegroundColor Cyan
Write-Host "PM2 path: $pm2Path" -ForegroundColor Cyan

# Create the startup command
$startupCommand = "cd /d `"$scriptPath`" && pm2 start ecosystem.config.js --env production"

# Create a batch file for startup
$batchContent = @"
@echo off
cd /d "$scriptPath"
pm2 start ecosystem.config.js --env production
"@

$batchPath = Join-Path $scriptPath "pm2-startup.bat"
$batchContent | Out-File -FilePath $batchPath -Encoding ASCII

Write-Host "Created startup batch file: $batchPath" -ForegroundColor Green

# Add to Windows Startup
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "VoltTasksBot.lnk"

$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $batchPath
$Shortcut.WorkingDirectory = $scriptPath
$Shortcut.Description = "Volt Tasks Bot PM2 Service"
$Shortcut.Save()

Write-Host "Added to Windows Startup: $shortcutPath" -ForegroundColor Green

# Setup PM2 startup script
Write-Host "Setting up PM2 startup script..." -ForegroundColor Yellow
pm2 startup

Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "The service will now start automatically when Windows boots." -ForegroundColor Cyan
Write-Host "To test, restart your computer or run: pm2 start ecosystem.config.js --env production" -ForegroundColor Yellow

pause

