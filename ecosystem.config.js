module.exports = {
  apps: [
    {
      name: "zorabio",
      script: "dist/index.cjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
