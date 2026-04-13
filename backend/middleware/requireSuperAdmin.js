const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
  }
  next();
};

module.exports = requireSuperAdmin;
