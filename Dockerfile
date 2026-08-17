# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- dev: Vite dev server with HMR against a bind-mounted source tree ---
FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev"]

# --- build: type-check + produce the static bundle ---
FROM base AS build
COPY . .
RUN npm run build

# --- prod: nginx serving the built bundle, with SPA fallback ---
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
