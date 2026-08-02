const { createApp } = require('./app');

function startServer({
  app = createApp(),
  port = process.env.PORT || 5000,
} = {}) {
  const server = app.listen(port, () => {
    const address = server.address();
    const boundPort =
      address && typeof address === 'object' ? address.port : port;

    console.log(
      `DAISY Library API server is running on http://localhost:${boundPort}`
    );
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.error(
        `Port ${port} is already in use. Stop the process using that port or set PORT to another value before running the server.`
      );
      process.exitCode = 1;
      return;
    }

    throw error;
  });

  return server;
}

module.exports = { startServer };
