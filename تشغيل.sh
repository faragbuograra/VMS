#!/bin/zsh
# سكربت تشغيل منصة التأشيرات — يشغل قاعدة البيانات والخادم والواجهة

DIR="$(cd "$(dirname "$0")" && pwd)"

# 1) قاعدة البيانات (Postgres على المنفذ 5433)
if ! pg_isready -h 127.0.0.1 -p 5433 -q 2>/dev/null; then
  echo "⏳ تشغيل قاعدة البيانات..."
  /opt/homebrew/opt/postgresql@14/bin/pg_ctl \
    -D /opt/homebrew/var/postgresql@14 \
    -o "-p 5433" \
    -l /opt/homebrew/var/log/postgresql@14-5433.log start
fi

# 2) الخادم (API على المنفذ 4000)
echo "⏳ تشغيل الخادم..."
npm start --prefix "$DIR/server" &

# 3) الواجهة (على المنفذ 5173)
echo "⏳ تشغيل الواجهة..."
npm run dev --prefix "$DIR/client" &

sleep 2
echo ""
echo "✅ المنصة شغالة: http://localhost:5173"
wait
