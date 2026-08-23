# GymOS production image. Compatible with Render, Railway, Fly.io, and any Docker-capable host.
FROM node:22-alpine AS build

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts=false

COPY . .
RUN pnpm prisma:generate
RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts=false
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN mkdir -p /app/uploads/member-photos

EXPOSE 3000

# Apply safe, pending Prisma migrations before the web server begins accepting requests.
CMD ["sh", "-c", "pnpm prisma:deploy && node dist/index.js"]
