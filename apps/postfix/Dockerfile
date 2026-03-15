FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends postfix ca-certificates gettext-base \
    && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY main.cf.template /etc/postfix/main.cf.template

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 25

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["postfix", "start-fg"]