module.exports = {
  apps: [
    {
      name: "inspecao-mecanica",
      script: "./server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3500,
        API_PORT: 3500,
      },
    },
  ],
};
