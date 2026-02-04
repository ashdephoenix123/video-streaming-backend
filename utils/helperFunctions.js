const generateSlug = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const cachedUserVideoKey = (userId) => {
  return `user-${userId}:videos`;
};

module.exports = { generateSlug, cachedUserVideoKey };
