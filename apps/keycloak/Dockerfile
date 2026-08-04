FROM quay.io/keycloak/keycloak:24.0.5 AS builder

# Pre-build the optimized Keycloak image. Doing this during the Render image
# build avoids Quarkus augmentation consuming the small runtime instance.
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_PROXY_HEADERS=xforwarded

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:24.0.5

COPY --from=builder /opt/keycloak/ /opt/keycloak/

COPY keycloak-realm-export.json /opt/keycloak/data/import/shopquiet-realm.json

# Render Free has limited memory; leave room for native/JVM overhead.
ENV JAVA_OPTS_KC_HEAP="-Xms64m -Xmx256m -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=192m"

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["export KEYCLOAK_ADMIN=\"${KC_BOOTSTRAP_ADMIN_USERNAME}\"; export KEYCLOAK_ADMIN_PASSWORD=\"${KC_BOOTSTRAP_ADMIN_PASSWORD}\"; exec /opt/keycloak/bin/kc.sh start --optimized --import-realm --http-enabled=true --http-port=${PORT:-8080} --proxy-headers=xforwarded --hostname-strict=false"]
