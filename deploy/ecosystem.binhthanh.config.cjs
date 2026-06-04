const path = require("path");

const root = path.join(__dirname, "..");

/** PM2 — site Bình Thạnh (API :3010, Next :3011). */
module.exports = {
  apps: [
    {
      name: "binhthanh-api",
      cwd: path.join(root, "backend"),
      script: "dist/src/main.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      env_file: path.join(root, "backend", ".env"),
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "binhthanh-web",
      cwd: path.join(root, "frontend"),
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3011",
      instances: 1,
      autorestart: true,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
