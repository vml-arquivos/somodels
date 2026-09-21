FROM node:22-alpine AS build
WORKDIR /app
RUN npm install --global pnpm@10.4.1
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm check && pnpm build
# Coolify/Cloudflare must serve the same-origin CSS without a CORS mode that
# can leave the stylesheet unloaded when the proxy omits ACAO on cached assets.
RUN sed -i 's/ crossorigin=""//g; s/ crossorigin//g' /app/dist/public/index.html
# Only these packages remain external in the server bundle. Keeping this
# manifest separate avoids copying the full development dependency graph.
RUN cd /app/runtime && pnpm install --prod --frozen-lockfile --ignore-scripts
# The Vite dev chunk is lazy-loaded only when NODE_ENV=development.
RUN rm -f /app/dist/vite-*.js

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache curl
COPY --from=build /app/runtime/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
USER node
CMD ["sh", "-c", "node dist/migrate.mjs && node dist/index.js"]
