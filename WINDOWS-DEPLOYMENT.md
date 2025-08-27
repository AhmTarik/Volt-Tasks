# Windows Server Deployment Guide

## Prerequisites

1. **Node.js** (v16 or higher)
2. **PM2** (Process Manager)
3. **Administrator privileges** for auto-start setup

## Installation Steps

### 1. Install PM2 Globally
```bash
npm install -g pm2
```

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create or update `.env` file with your configuration:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

## Service Management Commands

### Using NPM Scripts
```bash
# Start the service
npm run pm2:start

# Stop the service
npm run pm2:stop

# Restart the service
npm run pm2:restart

# Check status
npm run pm2:status

# View logs
npm run pm2:logs

# Delete service
npm run pm2:delete
```

### Using PM2 Directly
```bash
# Start service
pm2 start ecosystem.config.js --env production

# Stop service
pm2 stop volt-tasks-bot

# Restart service
pm2 restart volt-tasks-bot

# View status
pm2 status

# View logs
pm2 logs volt-tasks-bot

# Delete service
pm2 delete volt-tasks-bot
```

### Using Batch Files
```bash
# Start service
start-service.bat

# Stop service
stop-service.bat

# Restart service
restart-service.bat

# Check status
status-service.bat
```

## Auto-Start Setup

### Method 1: PowerShell Script (Recommended)
1. **Right-click** on `setup-autostart.ps1`
2. Select **"Run as Administrator"**
3. Follow the prompts

### Method 2: Manual Setup
1. **Open PowerShell as Administrator**
2. Run: `pm2 startup`
3. Copy the generated command and run it
4. Start your service: `pm2 start ecosystem.config.js --env production`
5. Save the PM2 configuration: `pm2 save`

### Method 3: Windows Startup Folder
1. Press `Win + R`
2. Type: `shell:startup`
3. Copy `pm2-startup.bat` to the startup folder

## Service Configuration

### Ecosystem Config (`ecosystem.config.js`)
- **Name**: `volt-tasks-bot`
- **Script**: `app.js`
- **Instances**: 1
- **Auto-restart**: Enabled
- **Memory limit**: 1GB
- **Log files**: `./logs/`

### Log Files
- **Error logs**: `./logs/err.log`
- **Output logs**: `./logs/out.log`
- **Combined logs**: `./logs/combined.log`

## Monitoring and Maintenance

### View Real-time Logs
```bash
pm2 logs volt-tasks-bot --lines 100
```

### Monitor Resources
```bash
pm2 monit
```

### Update Application
```bash
# Stop service
pm2 stop volt-tasks-bot

# Pull latest code
git pull

# Install dependencies
npm install

# Start service
pm2 start volt-tasks-bot
```

### Backup Configuration
```bash
# Save current PM2 configuration
pm2 save

# List saved configurations
pm2 resurrect
```

## Troubleshooting

### Service Won't Start
1. Check logs: `pm2 logs volt-tasks-bot`
2. Verify environment variables in `.env`
3. Check Node.js version: `node --version`
4. Verify PM2 installation: `pm2 --version`

### Service Stops Unexpectedly
1. Check memory usage: `pm2 monit`
2. Review error logs: `pm2 logs volt-tasks-bot --err`
3. Increase memory limit in `ecosystem.config.js`

### Auto-start Not Working
1. Run setup script as Administrator
2. Check Windows Event Viewer for errors
3. Verify startup folder permissions
4. Test manual startup first

### Permission Issues
1. Run PowerShell as Administrator
2. Check folder permissions
3. Verify PM2 installation path

## Security Considerations

1. **Environment Variables**: Keep `.env` file secure
2. **Log Files**: Regularly rotate and archive logs
3. **Updates**: Keep Node.js and PM2 updated
4. **Firewall**: Configure Windows Firewall if needed
5. **Backups**: Regular backups of `tasks.csv` and configuration

## Performance Optimization

1. **Memory**: Monitor and adjust `max_memory_restart`
2. **Logs**: Regular log rotation
3. **Monitoring**: Use `pm2 monit` for resource tracking
4. **Updates**: Regular application updates

## Support

For issues related to:
- **PM2**: Check PM2 documentation
- **Windows**: Check Windows Event Viewer
- **Application**: Check application logs in `./logs/`
- **Telegram Bot**: Verify bot token and chat ID

