import jwt from "jsonwebtoken";

// Verifica o token e identifica se é uma cliente (user) ou uma vendedora (seller)
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Sessão não encontrada. Inicia sessão novamente." });
  }
  try {
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = payload; // { id, role: 'user' | 'seller' }
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

// Restringe uma rota apenas a vendedoras
export function requireSeller(req, res, next) {
  if (req.auth?.role !== "seller") {
    return res.status(403).json({ error: "Apenas vendedoras podem aceder a este recurso." });
  }
  next();
}
