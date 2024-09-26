FROM node:lts-alpine3.20
WORKDIR /app
COPY . /app

RUN apk update && apk add --no-interactive curl zip && apk cache clean

RUN npm install && npm run build:client && node build/prepkg.js linux
RUN rm ./server/config/application_env && mkdir /library /data


EXPOSE 12380

HEALTHCHECK CMD curl --fail http://localhost:12380 || exit 1


ENTRYPOINT node server --app-dir=/data --lib-dir=/library --inpx=/library/fb2_local.inpx

