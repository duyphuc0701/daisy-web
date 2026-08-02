const express = require("express");
function createAudiobooksRouter({
  controller,
  requireAuthenticatedUser,
  cors,
}) {
  const router = express.Router();
  router.use(cors);
  router.use(requireAuthenticatedUser);
  router.get("/:bookId/audio", controller.discover);
  router.head("/:bookId/audio/:audioId/stream", controller.stream);
  router.get("/:bookId/audio/:audioId/stream", controller.stream);
  router.get("/:bookId/audio/:audioId/transcript", controller.transcript);
  return router;
}
module.exports = createAudiobooksRouter;
