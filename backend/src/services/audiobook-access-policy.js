function createAudiobookAccessPolicy({
  canAccess = async (principal) =>
    typeof principal?.id === "string" && principal.id.length > 0,
} = {}) {
  return { canAccess };
}
module.exports = createAudiobookAccessPolicy;
