# المرحلة الأولى: بناء الواجهة
FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# المرحلة الثانية: الخادم + الواجهة المبنية
FROM node:24-alpine
WORKDIR /app
COPY server/package*.json server/
RUN cd server && npm ci --omit=dev
COPY server/src server/src
COPY --from=client-build /app/client/dist client/dist
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "server/src/index.js"]
