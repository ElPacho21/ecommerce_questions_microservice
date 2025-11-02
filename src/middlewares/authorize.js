export function authorize(roles = []) {
  if (typeof roles === "string") roles = [roles];

  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let permissions = user.permissions ?? user.role ?? [];
    if (!Array.isArray(permissions)) permissions = [permissions];

    if (roles.length === 0) return next();

    const allowed = roles.some(r => permissions.includes(r));

    if (!allowed) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }

    next();
  };
}