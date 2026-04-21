// Role-based access control middleware.
// Spec non-negotiable #6: "Role checks are on the backend."
//
// Usage:
//   router.post('/payments', requireRole('owner', 'bursar'), handler);
//   router.patch('/settings', requireRole('owner'), handler);
//
// Must run AFTER the `protect` auth middleware so req.user is populated.
const requireRole = (...roles) => (req, res, next) => {
  // super_admin always passes — they operate across all schools
  if (req.user && req.user.role === 'super_admin') return next();

  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'AUTH_INSUFFICIENT_ROLE',
        message: 'Insufficient permissions',
        status: 403,
      },
    });
  }
  next();
};

module.exports = requireRole;
