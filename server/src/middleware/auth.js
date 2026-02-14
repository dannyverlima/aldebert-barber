import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "").trim();

  if (!token) {
    return res.status(401).json({ message: "Token ausente" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
};

// Middleware que exige role admin
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Acesso restrito a administradores" });
  }
  return next();
};
