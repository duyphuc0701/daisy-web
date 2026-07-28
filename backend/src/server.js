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

  return server;
}

module.exports = { startServer };
