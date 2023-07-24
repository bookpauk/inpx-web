FROM ubuntu:22.04

WORKDIR /app
COPY . /app

RUN useradd -ms /bin/bash -u 1000 -U -d /app inpx-web

RUN set -e \
	&& apt update \
	&& apt -y upgrade \
	&& apt install -y --no-install-recommends curl wget zip ca-certificates \
	&& curl -sL https://deb.nodesource.com/setup_20.x | bash \
	&& apt install -y --no-install-recommends nodejs \
	&& apt clean

RUN set -e \
	&& npm install \
	&& npm run build:client \
	&& node build/prepkg.js linux \
	&& mkdir -p /app/data \
	&& chown -R inpx-web:inpx-web /app \
	&& mkdir -p /library \
	&& rm ./server/config/application_env \
	&& echo "chown -R inpx-web:inpx-web /app"

RUN echo "#!/bin/bash" >> /entrypoint.sh \
	&& echo "set -e" >> /entrypoint.sh \
	&& echo "su inpx-web -c \"node server --lib-dir=/library --app-dir=/app/data --inpx=/app/data/index.inpx --recreate\"" >> /entrypoint.sh \
	&& chmod +x /entrypoint.sh

EXPOSE 12380

HEALTHCHECK CMD curl --fail http://localhost:12380 || exit 1   

ENTRYPOINT [ "/entrypoint.sh" ]
