import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { pool, query } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIREMENTS = [
  {
    code: "insurance",
    title: "تأمين صحي ساري",
    details: "تأمين سفر صحيح وساري يغطي فترة الرحلة كاملة.",
    needs_translation: false,
  },
  {
    code: "flight",
    title: "حجز طيران مبدئي (ذهاب وعودة)",
    details: "حجز مبدئي ذهاب وعودة، بعد أسبوعين من تاريخ موعد التقديم.",
    needs_translation: false,
  },
  {
    code: "hotel",
    title: "حجز فندقي مبدئي",
    details: "مطابق لتواريخ تذاكر الطيران، ويجب أن يكون السعر مذكوراً في الحجز.",
    needs_translation: false,
  },
  {
    code: "work_letter",
    title: "رسالة من جهة العمل",
    details:
      "تشمل المرتب، ومذكور فيها الصفة والاسم، مع الختم والتوقيع. يجب أن تكون مترجمة.",
    needs_translation: true,
  },
  {
    code: "bank_statement",
    title: "كشف حساب آخر 6 شهور",
    details: "كشف حساب بنكي لآخر ستة أشهر، مختوم بختم حي.",
    needs_translation: false,
  },
  {
    code: "family_status",
    title: "شهادة وضع عائلي",
    details: "بتاريخ جديد (حديثة الإصدار).",
     needs_translation: true,
  },
  {
    code: "photo",
    title: "صورة شخصية",
    details: "صورة شخصية حديثة بمواصفات التأشيرة (مصوراتي فلاش في بلعون).",
    needs_translation: false,
  },
  {
    code: "guarantee",
    title: "كفالة مالية (لمن لا يملك إفادة عمل وكشف حساب)",
    details:
      "كفالة مالية من محرر عقود لكل شخص لا يملك إفادة عمل وكشف حساب، ويجب أن تكون مترجمة.",
    needs_translation: true,
    is_conditional: true,
    condition_note: "فقط لمن لا يملك إفادة عمل وكشف حساب",
  },
  {
    code: "company_docs",
    title: "أوراق الشركة (سجل تجاري + رخصة + إثبات قيد)",
    details:
      "في حال تقديم أوراق شركة: السجل التجاري، والرخصة، وإثبات القيد — جميعها مترجمة.",
    needs_translation: true,
    is_conditional: true,
    condition_note: "فقط في حال التقديم بأوراق شركة",
  },
  {
    code: "originals",
    title: "النسخة الأصلية للمستندات",
    details: "إحضار النسخ الأصلية لجميع المستندات في يوم الموعد.",
    needs_translation: false,
  },
];

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await query(schema);

  for (let i = 0; i < REQUIREMENTS.length; i++) {
    const r = REQUIREMENTS[i];
    await query(
      `INSERT INTO requirements (code, title, details, needs_translation, is_conditional, condition_note, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE SET
         title = EXCLUDED.title,
         details = EXCLUDED.details,
         needs_translation = EXCLUDED.needs_translation,
         is_conditional = EXCLUDED.is_conditional,
         condition_note = EXCLUDED.condition_note,
         sort_order = EXCLUDED.sort_order`,
      [
        r.code,
        r.title,
        r.details,
        r.needs_translation,
        r.is_conditional || false,
        r.condition_note || "",
        i + 1,
      ]
    );
  }

  const adminPhone = "0910000000";
  const { rows } = await query("SELECT id FROM users WHERE phone = $1", [adminPhone]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await query(
      "INSERT INTO users (full_name, phone, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      ["مدير المنظومة", adminPhone, hash]
    );
    console.log("تم إنشاء حساب الأدمن — الهاتف: 0910000000 / كلمة السر: admin123");
  }

  console.log("تم تجهيز قاعدة البيانات بنجاح ✔");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
