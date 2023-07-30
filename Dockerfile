FROM node:20-alpine as build

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY .babelrc .eslintrc nodemon.json package-lock.json package.json README.md ./
COPY build ./build/
COPY client ./client/
COPY server ./server/

RUN apk add zip
RUN npm install --omit=dev
RUN npm run build:client
RUN node build/prepkg.js linux
RUN pkg -t node18-linux-x64 -C Brotli --options max-old-space-size=4096,expose-gc -o dist/linux/inpx-web .

# Build the prod image
FROM alpine:latest

# Move to /dist directory as the place for resulting binary folder
WORKDIR /app
RUN apk add libgcc libstdc++ gcompat
RUN mkdir -m 0777 data
COPY docker_entrypoint.sh entrypoint.sh
COPY --from=build /app/dist/linux/inpx-web .

EXPOSE 12380

HEALTHCHECK CMD curl --fail http://localhost:12380 || exit 1   

ENTRYPOINT [ "/app/entrypoint.sh" ]
