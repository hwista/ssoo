FROM nginx:stable-alpine@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94
COPY docker/error-pages/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/error-pages/__ssoo_unavailable.html /usr/share/nginx/html/__ssoo_unavailable.html
COPY docker/error-pages/services.html.template /opt/ssoo/services.html.template
COPY docker/error-pages/40-ssoo-recovery-links.sh /docker-entrypoint.d/40-ssoo-recovery-links.sh
RUN chmod +x /docker-entrypoint.d/40-ssoo-recovery-links.sh
ENV SSOO_ERROR_UPSTREAM=http://admin:3000
EXPOSE 8080
