module.exports = {
  apps: [
    {
      name: 'volt-tasks-bot',
      script: 'app.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Windows specific settings
      windowsHide: true,
      // Auto-restart on file changes (optional)
      ignore_watch: [
        'node_modules',
        'logs',
        'daily-backups',
        '*.log'
      ]
    }
  ]
};

