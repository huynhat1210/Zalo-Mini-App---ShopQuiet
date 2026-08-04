FROM quay.io/keycloak/keycloak:24.0.5

COPY keycloak-realm-export.json /opt/keycloak/data/import/shopquiet-realm.json

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["/opt/keycloak/bin/kc.sh start --import-realm --http-enabled=true --http-port=${PORT:-8080} --proxy-headers=xforwarded --hostname-strict=false --health-enabled=true"]
