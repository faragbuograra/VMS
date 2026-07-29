import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const PORT = process.env.PORT || 4000;

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.full_name }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "غير مصرح — سجل الدخول أولاً" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "انتهت الجلسة — سجل الدخول من جديد" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "خاص بالأدمن فقط" });
  next();
}

// ---------- auth ----------
app.post("/api/register", async (req, res) => {
  const { full_name, phone, password, appointment_date } = req.body || {};
  if (!full_name || !phone || !password) {
    return res.status(400).json({ error: "الاسم ورقم الهاتف وكلمة السر مطلوبين" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "كلمة السر يجب أن تكون 6 أحرف على الأقل" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (full_name, phone, password_hash, appointment_date)
       VALUES ($1, $2, $3, $4) RETURNING id, full_name, phone, role, appointment_date`,
      [full_name.trim(), phone.trim(), hash, appointment_date || null]
    );
    const user = rows[0];
    res.json({ token: sign(user), user });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "رقم الهاتف مسجل من قبل — سجل الدخول" });
    }
    console.error(err);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

app.post("/api/login", async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: "أدخل رقم الهاتف وكلمة السر" });
  const { rows } = await query("SELECT * FROM users WHERE phone = $1", [phone.trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "رقم الهاتف أو كلمة السر غير صحيحة" });
  }
  const { password_hash, ...safe } = user;
  res.json({ token: sign(user), user: safe });
});

app.get("/api/me", auth, async (req, res) => {
  const { rows } = await query(
    "SELECT id, full_name, phone, role, appointment_date FROM users WHERE id = $1",
    [req.user.id]
  );
  res.json({ user: rows[0] });
});

// ---------- customer checklist ----------
app.get("/api/checklist", auth, async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.code, r.title, r.details, r.needs_translation, r.is_conditional, r.condition_note,
            COALESCE(resp.has_item, 'no') AS has_item,
            resp.is_translated,
            COALESCE(resp.notes, '') AS notes
     FROM requirements r
     LEFT JOIN responses resp ON resp.requirement_id = r.id AND resp.user_id = $1
     ORDER BY r.sort_order`,
    [req.user.id]
  );
  res.json({ items: rows });
});

app.put("/api/checklist/:requirementId", auth, async (req, res) => {
  const { requirementId } = req.params;
  const { has_item, is_translated, notes } = req.body || {};
  if (!["yes", "no", "na"].includes(has_item)) {
    return res.status(400).json({ error: "قيمة غير صحيحة" });
  }
  await query(
    `INSERT INTO responses (user_id, requirement_id, has_item, is_translated, notes, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id, requirement_id) DO UPDATE SET
       has_item = EXCLUDED.has_item,
       is_translated = EXCLUDED.is_translated,
       notes = EXCLUDED.notes,
       updated_at = now()`,
    [req.user.id, requirementId, has_item, is_translated ?? null, notes || ""]
  );
  res.json({ ok: true });
});

app.put("/api/appointment", auth, async (req, res) => {
  const { appointment_date } = req.body || {};
  await query("UPDATE users SET appointment_date = $1 WHERE id = $2", [
    appointment_date || null,
    req.user.id,
  ]);
  res.json({ ok: true });
});

// ---------- admin ----------
app.get("/api/admin/customers", auth, adminOnly, async (req, res) => {
  const { rows: customers } = await query(
    `SELECT u.id, u.full_name, u.phone, u.appointment_date, u.created_at
     FROM users u WHERE u.role = 'customer' ORDER BY u.created_at DESC`
  );
  const { rows: reqs } = await query("SELECT * FROM requirements ORDER BY sort_order");
  const { rows: allResponses } = await query("SELECT * FROM responses");

  const respMap = new Map();
  for (const r of allResponses) {
    respMap.set(`${r.user_id}-${r.requirement_id}`, r);
  }

  const result = customers.map((c) => {
    const items = reqs.map((r) => {
      const resp = respMap.get(`${c.id}-${r.id}`);
      const has_item = resp ? resp.has_item : "no";
      const is_translated = resp ? resp.is_translated : null;
      // مكتمل إذا: عنده المستند (ومترجم إن كان يتطلب ترجمة)، أو لا ينطبق عليه
      const complete =
        has_item === "na" ||
        (has_item === "yes" && (!r.needs_translation || is_translated === true));
      return {
        requirement_id: r.id,
        code: r.code,
        title: r.title,
        needs_translation: r.needs_translation,
        is_conditional: r.is_conditional,
        has_item,
        is_translated,
        notes: resp ? resp.notes : "",
        complete,
      };
    });
    const applicable = items.filter((i) => i.has_item !== "na");
    const done = items.filter((i) => i.complete).length;
    const missing = items.filter((i) => !i.complete);
    return {
      ...c,
      total: items.length,
      applicable: applicable.length,
      done,
      missing,
      completion:
        items.length === 0 ? 0 : Math.round((done / items.length) * 100),
      items,
    };
  });

  res.json({ customers: result });
});

// في الإنتاج: تقديم الواجهة المبنية (client/dist) من نفس الخادم
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`✔ خادم منصة التأشيرات شغال على http://localhost:${PORT}`);
});
