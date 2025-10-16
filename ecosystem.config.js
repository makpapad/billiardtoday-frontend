module.exports = {
  apps: [
    {
      name: 'billiardtoday-frontend',
      script: 'server.js',
      cwd: '/var/www/vhosts/billiardtoday.com/billiardtoday-frontend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3022,
        HOSTNAME: 'localhost'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
    }
  ]
}
