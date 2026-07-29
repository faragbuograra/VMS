import React, { useEffect, useMemo, useState } from "react";
import { api, getToken, setToken, clearToken } from "./api.js";

/* ============ عناصر مشتركة ============ */

/* تاريخ بصيغة يوم-شهر-سنة */
function fmtDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

function Stamp({ kind, small, children }) {
  const color =
    kind === "ok" ? "text-seal" : kind === "miss" ? "text-stamp" : "text-inkmut";
  return (
    <span className={`stamp ${small ? "stamp-sm" : "text-[15px]"} ${color}`}>
      {children}
    </span>
  );
}

function CondChip() {
  return (
    <span className="whitespace-nowrap rounded-full border border-foil/60 bg-foil/10 px-2.5 py-0.5 text-[11.5px] font-medium text-[#7d651c]">
      حسب الحالة
    </span>
  );
}

const inputCls =
  "w-full rounded-md border border-rule bg-white px-3.5 py-2.5 text-[15px] transition-colors focus:border-pen";

/* ============ صفحة الدخول والتسجيل ============ */

function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ full_name: "", phone: "", password: "", appointment_date: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const path = mode === "login" ? "/api/login" : "/api/register";
      const body = mode === "login" ? { phone: form.phone, password: form.password } : form;
      const data = await api(path, { method: "POST", body: JSON.stringify(body) });
      setToken(data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      {/* غلاف الجواز */}
      <div className="rounded-t-2xl bg-ink px-8 pb-7 pt-9 text-center shadow-lg">
        <h1 className="font-display text-[30px] font-bold leading-tight text-foil">
          منصة التأشيرات
        </h1>
        <div className="cover-rule mx-10 my-4" />
        <p className="text-sm leading-6 text-paper/65">
          {mode === "login"
            ? "افتح ملفك وتابع متطلبات التقديم"
            : "افتح ملف جديد وابدأ في تجهيز مستنداتك"}
        </p>
      </div>

      {/* صفحة النموذج */}
      <div className="rounded-b-2xl border border-t-0 border-rule bg-paper p-7 shadow-lg">
        {error && (
          <div className="mb-4 rounded-md border border-stamp/30 bg-stamp/8 px-4 py-2.5 text-sm text-stamp">
            {error}
          </div>
        )}
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-bold">الاسم الكامل</label>
              <input type="text" className={inputCls} value={form.full_name} onChange={set("full_name")} required />
            </div>
          )}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-bold">رقم الهاتف</label>
            <input
              type="tel"
              dir="ltr"
              className={`${inputCls} text-right font-mono`}
              placeholder="09xxxxxxxx"
              value={form.phone}
              onChange={set("phone")}
              required
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-bold">كلمة السر</label>
            <input type="password" className={inputCls} value={form.password} onChange={set("password")} required />
          </div>
          {mode === "register" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-bold">
                تاريخ موعد التقديم <span className="font-normal text-inkmut">(اختياري)</span>
              </label>
              <input type="date" className={`${inputCls} font-mono`} value={form.appointment_date} onChange={set("appointment_date")} />
            </div>
          )}
          <button
            className="mt-2 w-full rounded-md bg-pen py-3 text-[15px] font-bold text-white transition-colors hover:bg-pendark disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "لحظة..." : mode === "login" ? "دخول إلى ملفي" : "فتح الملف"}
          </button>
        </form>
        <div className="mt-5 text-center text-sm text-inkmut">
          {mode === "login" ? (
            <>
              ما عندكش ملف؟{" "}
              <button className="font-bold text-pen hover:underline" onClick={() => { setMode("register"); setError(""); }}>
                افتح ملف جديد
              </button>
            </>
          ) : (
            <>
              عندك ملف؟{" "}
              <button className="font-bold text-pen hover:underline" onClick={() => { setMode("login"); setError(""); }}>
                سجل الدخول
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ أزرار الإجابة ============ */

function Segment({ value, options, onChange }) {
  const activeCls = {
    yes: "bg-seal text-paper font-bold",
    no: "bg-stamp text-paper font-bold",
    na: "bg-inkmut text-paper font-bold",
  };
  return (
    <span className="inline-flex overflow-hidden rounded-md border border-rule bg-white">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          className={`px-4 py-1.5 text-[13.5px] transition-colors ${i > 0 ? "border-s border-rule" : ""} ${
            value === o.value ? activeCls[o.cls] : "text-inkmut hover:bg-desk/70"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

/* ============ بطاقة متطلب (تذكرة بكعب مرقّم) ============ */

function ReqCard({ it, index, savedId, onUpdate }) {
  const complete =
    it.has_item === "na" ||
    (it.has_item === "yes" && (!it.needs_translation || it.is_translated === true));
  const numColor =
    it.has_item === "na" ? "text-inkmut/70" : complete ? "text-seal" : "text-stamp";

  return (
    <div className="relative mb-3.5 flex overflow-hidden rounded-lg border border-rule bg-paper shadow-[0_1px_3px_rgba(14,36,24,0.07)]">
      {/* كعب التذكرة */}
      <div className="relative flex w-12 shrink-0 justify-center border-e-2 border-dashed border-rule pt-4.5">
        <span className={`font-mono text-[13px] font-semibold ${numColor}`}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="absolute -end-2 -top-2 size-4 rounded-full bg-desk" />
        <span className="absolute -bottom-2 -end-2 size-4 rounded-full bg-desk" />
      </div>

      {/* محتوى المستند */}
      <div className={`flex-1 p-4 pe-5 ${it.has_item === "na" ? "opacity-75" : ""}`}>
        <div className="mb-1 flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <h3 className="text-[15.5px] font-bold leading-7">{it.title}</h3>
          <div className="flex items-center gap-2.5 pt-0.5">
            {savedId === it.id && (
              <span className="text-xs font-bold text-seal">✓ تم الحفظ</span>
            )}
            {it.is_conditional && <CondChip />}
            {complete ? (
              <Stamp kind={it.has_item === "na" ? "na" : "ok"} small>
                {it.has_item === "na" ? "لا ينطبق" : "مكتمل"}
              </Stamp>
            ) : (
              <Stamp kind="miss" small>
                ناقص
              </Stamp>
            )}
          </div>
        </div>
        <p className="mb-3 max-w-xl text-[13.5px] leading-7 text-inkmut">
          {it.details}
          {it.is_conditional && (
            <span className="mt-0.5 block text-[12.5px]">⚠️ {it.condition_note}</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="min-w-28 text-sm font-bold">هل عندك المستند؟</span>
          <Segment
            value={it.has_item}
            onChange={(v) => onUpdate(it, { has_item: v })}
            options={[
              { value: "yes", label: "نعم", cls: "yes" },
              { value: "no", label: "لا", cls: "no" },
              ...(it.is_conditional ? [{ value: "na", label: "لا ينطبق عليّ", cls: "na" }] : []),
            ]}
          />
        </div>
        {it.needs_translation && it.has_item === "yes" && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="min-w-28 text-sm font-bold">هل هي مترجمة؟</span>
            <Segment
              value={it.is_translated === true ? "yes" : it.is_translated === false ? "no" : null}
              onChange={(v) => onUpdate(it, { is_translated: v === "yes" })}
              options={[
                { value: "yes", label: "نعم", cls: "yes" },
                { value: "no", label: "لا", cls: "no" },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ ملف الزبون ============ */

function Checklist({ user }) {
  const [items, setItems] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [appt, setAppt] = useState(user.appointment_date ? user.appointment_date.slice(0, 10) : "");

  useEffect(() => {
    api("/api/checklist").then((d) => setItems(d.items)).catch(() => setItems([]));
  }, []);

  function isComplete(it) {
    return (
      it.has_item === "na" ||
      (it.has_item === "yes" && (!it.needs_translation || it.is_translated === true))
    );
  }

  async function update(it, patch) {
    const next = { ...it, ...patch };
    if (patch.has_item && patch.has_item !== "yes") next.is_translated = null;
    setItems(items.map((x) => (x.id === it.id ? next : x)));
    try {
      await api(`/api/checklist/${it.id}`, {
        method: "PUT",
        body: JSON.stringify({
          has_item: next.has_item,
          is_translated: next.is_translated,
          notes: next.notes,
        }),
      });
      setSavedId(it.id);
      setTimeout(() => setSavedId(null), 1500);
    } catch (e) {
      alert(e.message);
    }
  }

  async function saveAppt(v) {
    setAppt(v);
    try {
      await api("/api/appointment", { method: "PUT", body: JSON.stringify({ appointment_date: v || null }) });
    } catch {}
  }

  if (!items)
    return <div className="py-20 text-center text-inkmut">جاري فتح ملفك...</div>;

  const done = items.filter(isComplete).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      {/* غلاف الملف */}
      <div className="mb-3.5 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border border-rule bg-paper p-5 shadow-[0_1px_3px_rgba(14,36,24,0.07)]">
        <div className="min-w-56 flex-1">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-display text-lg font-bold">اكتمال الملف</span>
            <span className="font-mono text-sm text-inkmut">
              {done}/{items.length}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-desk">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-seal" : "bg-pen"}`}
              style={{ width: pct + "%" }}
            />
          </div>
        </div>
        <div className={`font-mono text-4xl font-semibold ${pct === 100 ? "text-seal" : "text-ink"}`}>
          {pct}<span className="text-xl">%</span>
        </div>
        {pct === 100 && <Stamp kind="ok">الملف جاهز</Stamp>}
      </div>

      {/* موعد التقديم */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-rule bg-paper px-5 py-4 shadow-[0_1px_3px_rgba(14,36,24,0.07)]">
        <label className="text-sm font-bold">📅 تاريخ موعد التقديم:</label>
        <input
          type="date"
          className="rounded-md border border-rule bg-white px-3 py-1.5 font-mono text-sm focus:border-pen"
          value={appt}
          onChange={(e) => saveAppt(e.target.value)}
        />
        {appt && (
          <span className="text-[12.5px] text-inkmut">
            حجز الطيران يكون بعد أسبوعين من هذا التاريخ
          </span>
        )}
      </div>

      {items.map((it, i) => (
        <ReqCard key={it.id} it={it} index={i} savedId={savedId} onUpdate={update} />
      ))}

      <div className="mt-5 rounded-lg border border-foil/50 bg-foil/10 px-5 py-4 text-sm leading-7">
        📌 <b>تذكير:</b> لازم تجيب النسخة الأصلية لجميع المستندات معاك في يوم الموعد.
      </div>
    </div>
  );
}

/* ============ لوحة الأدمن ============ */

function AdminDashboard() {
  const [customers, setCustomers] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    load();
  }, []);

  function load() {
    api("/api/admin/customers").then((d) => setCustomers(d.customers)).catch(() => setCustomers([]));
  }

  const filtered = useMemo(() => {
    if (!customers) return [];
    if (filter === "complete") return customers.filter((c) => c.completion === 100);
    if (filter === "incomplete") return customers.filter((c) => c.completion < 100);
    return customers;
  }, [customers, filter]);

  if (!customers)
    return <div className="py-20 text-center text-inkmut">جاري فتح سجل الزبائن...</div>;

  const completeCount = customers.filter((c) => c.completion === 100).length;

  const chip = (key, label, count) => (
    <button
      className={`rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
        filter === key
          ? "border-ink bg-ink font-bold text-paper"
          : "border-rule bg-paper text-inkmut hover:bg-desk/70"
      }`}
      onClick={() => setFilter(key)}
    >
      {label} <span className="font-mono">({count})</span>
    </button>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      {/* عدادات السجل */}
      <div className="mb-5 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        {[
          { n: customers.length, l: "إجمالي الزبائن", c: "text-ink" },
          { n: completeCount, l: "ملفات جاهزة", c: "text-seal" },
          { n: customers.length - completeCount, l: "ملفات ناقصة", c: "text-stamp" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-rule bg-paper p-4 text-center shadow-[0_1px_3px_rgba(14,36,24,0.07)]">
            <div className={`font-mono text-3xl font-semibold ${s.c}`}>{s.n}</div>
            <div className="mt-0.5 text-[13px] text-inkmut">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {chip("all", "الكل", customers.length)}
        {chip("incomplete", "الناقصين", customers.length - completeCount)}
        {chip("complete", "الجاهزين", completeCount)}
        <span className="flex-1" />
        <button
          className="rounded-full border border-rule bg-paper px-4 py-1.5 text-[13px] text-inkmut transition-colors hover:bg-desk/70"
          onClick={load}
        >
          🔄 تحديث
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-rule bg-paper py-14 text-center text-inkmut">
          لا يوجد زبائن في هذه القائمة
        </div>
      )}

      {filtered.map((c) => (
        <div key={c.id} className="mb-3 overflow-hidden rounded-lg border border-rule bg-paper shadow-[0_1px_3px_rgba(14,36,24,0.07)]">
          <button
            className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-start transition-colors hover:bg-desk/40"
            onClick={() => setOpenId(openId === c.id ? null : c.id)}
          >
            <span className="min-w-40">
              <span className="block text-[15.5px] font-bold">{c.full_name}</span>
              <span className="mt-0.5 block font-mono text-xs text-inkmut" dir="ltr">
                {c.phone}
                {c.appointment_date && <> · {fmtDate(c.appointment_date)}</>}
              </span>
            </span>
            <span className="flex-1" />
            <span className="h-2 w-28 overflow-hidden rounded-full bg-desk">
              <span
                className={`block h-full rounded-full ${
                  c.completion === 100 ? "bg-seal" : c.completion >= 50 ? "bg-pen" : "bg-stamp"
                }`}
                style={{ width: c.completion + "%" }}
              />
            </span>
            <span className="min-w-12 text-left font-mono text-[15px] font-semibold">
              {c.completion}%
            </span>
            {c.completion === 100 ? (
              <Stamp kind="ok" small>جاهز</Stamp>
            ) : (
              <span className="text-[13px] font-bold text-stamp">
                ناقصه <span className="font-mono">{c.missing.length}</span>
              </span>
            )}
            <span className="text-xs text-inkmut">{openId === c.id ? "▲" : "▼"}</span>
          </button>

          {openId === c.id && (
            <div className="border-t border-rule px-5 py-4">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="text-xs text-inkmut">
                    <th className="pb-2 text-start font-bold">المستند</th>
                    <th className="pb-2 text-start font-bold">عنده؟</th>
                    <th className="pb-2 text-start font-bold">مترجمة؟</th>
                    <th className="pb-2 text-start font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {c.items.map((it) => (
                    <tr key={it.requirement_id} className="border-t border-rule/70">
                      <td className="py-2.5 pe-3">{it.title}</td>
                      <td className="py-2.5 pe-3 whitespace-nowrap">
                        {it.has_item === "yes" ? "نعم" : it.has_item === "na" ? "لا ينطبق" : "لا"}
                      </td>
                      <td className="py-2.5 pe-3 whitespace-nowrap">
                        {!it.needs_translation || it.has_item !== "yes"
                          ? "—"
                          : it.is_translated === true
                          ? "نعم"
                          : "لا ❌"}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        {it.complete ? (
                          <span className="font-bold text-seal">
                            {it.has_item === "na" ? "لا ينطبق" : "تمام ✓"}
                          </span>
                        ) : (
                          <span className="font-bold text-stamp">ناقص</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============ التطبيق الرئيسي ============ */

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearToken();
    setUser(null);
  }

  if (loading) return <div className="py-20 text-center text-inkmut">جاري التحميل...</div>;
  if (!user) return <AuthPage onAuth={setUser} />;

  return (
    <>
      <header className="sticky top-0 z-10 bg-ink text-paper shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <span className="font-display text-[21px] font-bold text-foil">
            منصة التأشيرات
          </span>
          <span className="text-[13.5px] text-paper/70">
            {user.role === "admin" ? "سجل الزبائن — " : ""}أهلاً، {user.full_name}
          </span>
          <button
            className="rounded-md border border-paper/25 px-3.5 py-1.5 text-[13px] text-paper/80 transition-colors hover:border-paper/60 hover:text-paper"
            onClick={logout}
          >
            خروج
          </button>
        </div>
        <div className="cover-rule" />
      </header>
      {user.role === "admin" ? <AdminDashboard /> : <Checklist user={user} />}
    </>
  );
}
