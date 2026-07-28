function createAudiobookAccessPolicy({ canAccess = async () => false } = {}) {
  return { canAccess };
}
module.exports = createAudiobookAccessPolicy;
