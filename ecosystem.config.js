module.exports = {
  apps: [
    {
      name: 'billiardtoday-frontend',
      script: 'server.js',
      cwd: '/var/www/vhosts/billiardtoday.com/tournaments-app',
      interpreter: '/root/.nvm/versions/node/v20.19.5/bin/node',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3022,
        HOSTNAME: '0.0.0.0',
        NEXT_PUBLIC_STRAPI_URL: 'https://app.billiardtoday.com',
        NEXT_PUBLIC_SITE_URL: 'https://billiardtoday.com',
        NEXT_PUBLIC_SCOREBOARD_URL: 'https://scoreboard.billiardtoday.com',
        NEXT_PUBLIC_ADMIN_URL: 'https://admin.billiardtoday.com',
        STRAPI_API_TOKEN: 'a39e2116b6ce0c12fbd0b0c47449584e9e4a2b752345e63edc4881b2e70df5fa501ad076e6f4ba0e342e8d27264646e627cbb9d927c05bf12d71ab3a037560c96d979b10f8ec2e73bdb8abc81c538be83a19f3f78e77aa7485909e8ffe4ab53bf569c437fbdbe2e1ffa16247bb8ae07d97922594d112e847f9804c366f85f04f',       
        NEXT_PUBLIC_WORDPRESS_URL: 'https://www.billiardtoday.com'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      wait_ready: false,
      listen_timeout: 10000,
      kill_timeout: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
    }
  ]
}
