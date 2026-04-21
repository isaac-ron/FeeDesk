const jwt = require('jsonwebtoken');

// Access token: short-lived (15 min), sent in response body, stored in
// localStorage on the frontend. Contains userId, schoolId, and role so
// the auth middleware doesn't need a DB round-trip on every request.
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      schoolId: user.school || null,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Refresh token: long-lived (7 days), sent as an httpOnly cookie.
// Only contains the user ID — validated against the DB on each refresh
// so that deactivated users can't keep refreshing.
const generateRefreshToken = (user) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign(
    { id: user._id },
    secret,
    { expiresIn: '7d' }
  );
};

// Backward-compat: the old signature `generateToken(id)` still works
// for any callers that haven't been updated yet.
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

module.exports = generateToken;
module.exports.generateAccessToken = generateAccessToken;
module.exports.generateRefreshToken = generateRefreshToken;
