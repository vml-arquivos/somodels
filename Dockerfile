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

# Separate stage that installs ONLY production dependencies. server/_core/index.ts
# lazy-loads server/_core/vite-dev.ts (which imports the `vite` package) only when
# NODE_ENV=development, so the runtime image no longer needs any devDependency
# (vite, typescript, tailwindcss, vitest, drizzle-kit, esbuild, etc.) to boot.
FROM node:22-alpine AS deps-prod
WORKDIR /app
RUN npm install --global pnpm@10.4.1
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache curl
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
