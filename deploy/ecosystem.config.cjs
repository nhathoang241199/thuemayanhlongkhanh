const path = require("path");

const root = path.join(__dirname, "..");

/** @type {import('pm2').StartOptions[]} */
module.exports = {
  apps: [
    {
      name: "thue-may-api",
      cwd: path.join(root, "backend"),
      script: "dist/src/main.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "thue-may-web",
      cwd: path.join(root, "frontend"),
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      instances: 1,
      autorestart: true,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
