import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";

const router = Router();
const sign = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "30d" });

router.post("/register", async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, email e password são obrigatórios." });
  }
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, name, email`,
      [name, email, phone, password_hash]
    );
    const user = rows[0];
    res.status(201).json({ user, token: sign(user.id, "user") });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Este email já está registado." });
    res.status(500).json({ error: "Não foi possível criar a conta." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email ou password incorretos." });
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email }, token: sign(user.id, "user") });
});

router.post("/seller/register", async (req, res) => {
  const { store_name, owner_name, email, phone, password, city, nif } = req.body;
  if (!store_name || !owner_name || !email || !password) {
    return res.status(400).json({ error: "Nome da loja, nome da proprietária, email e password são obrigatórios." });
  }
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO sellers (store_name, owner_name, email, phone, password_hash, city, nif)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, store_name, email, status`,
      [store_name, owner_name, email, phone, password_hash, city, nif]
    );
    const seller = rows[0];
    res.status(201).json({
      seller,
      token: sign(seller.id, "seller"),
      note: "Conta criada com estado 'pendente' — precisa de verificação antes de vender.",
    });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Este email já está registado." });
    res.status(500).json({ error: "Não foi possível criar a loja." });
  }
});

router.post("/seller/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query(`SELECT * FROM sellers WHERE email = $1`, [email]);
  const seller = rows[0];
  if (!seller || !(await bcrypt.compare(password, seller.password_hash))) {
    return res.status(401).json({ error: "Email ou password incorretos." });
  }
  res.json({
    seller: { id: seller.id, store_name: seller.store_name, plan: seller.plan, status: seller.status },
    token: sign(seller.id, "seller"),
  });
});

export default router;
