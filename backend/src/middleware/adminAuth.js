// Admin credentials (hardcoded for developer-only access)
const ADMIN_USERNAME = 'Shubham';
const ADMIN_PASSWORD = '!@#Shubham!@#';
const ADMIN_TOKEN = 'fs_admin_' + Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64');

export { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_TOKEN };

/**
 * Middleware: Protects admin routes by checking a session cookie.
 */
export const requireAdmin = (req, res, next) => {
  const cookie = req.headers.cookie || '';
  const tokenMatch = cookie.match(/admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (token && token === ADMIN_TOKEN) {
    return next();
  }

  // Not authenticated — redirect to admin login page
  return res.redirect('/admin/login');
};
