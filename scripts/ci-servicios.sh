#!/usr/bin/env bash
#
# Levanta MongoDB, MailHog y RustFS como procesos, sin Docker.
#
# Existe porque el runner de GitLab de este proyecto usa el executor `shell`:
# `image:` y `services:` se ignoran y no hay daemon de Docker. Es el equivalente
# de `docker compose up -d` para ese entorno. En local NO se usa: allí sigue
# siendo `docker compose up -d`.
#
# Los servicios quedan escuchando en 127.0.0.1 y en los mismos puertos que en
# docker-compose (Mongo 27017, MailHog 1025/8025); RustFS escucha en 9000, que
# es su puerto nativo (en compose se publica como 9001).
set -euo pipefail

DIR="${CI_SERVICIOS_DIR:-/tmp/servicios}"
MONGO_VERSION="${MONGO_VERSION:-8.0.4}"
MAILHOG_VERSION="${MAILHOG_VERSION:-v1.0.1}"
RUSTFS_VERSION="${RUSTFS_VERSION:-v1.0.0}"

mkdir -p "$DIR/bin" "$DIR/logs" "$DIR/mongo-datos" "$DIR/rustfs-datos" "$DIR/descargas"

descargar() {
  # curl con reintentos: los binarios vienen de GitHub y de fastdl.mongodb.org.
  curl -fsSL --retry 4 --retry-delay 3 --retry-all-errors -o "$2" "$1"
}

echo "▶ Descargando binarios en paralelo…"
descargar "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2404-${MONGO_VERSION}.tgz" \
  "$DIR/descargas/mongo.tgz" &
descargar "https://github.com/mailhog/MailHog/releases/download/${MAILHOG_VERSION}/MailHog_linux_amd64" \
  "$DIR/bin/mailhog" &
descargar "https://github.com/rustfs/rustfs/releases/download/${RUSTFS_VERSION#v}/rustfs-linux-x86_64-musl-${RUSTFS_VERSION}.zip" \
  "$DIR/descargas/rustfs.zip" &
wait

tar -xzf "$DIR/descargas/mongo.tgz" -C "$DIR" --strip-components=1 --wildcards '*/bin/mongod'
unzip -o -q "$DIR/descargas/rustfs.zip" -d "$DIR/bin"
chmod +x "$DIR/bin/"*
rm -rf "$DIR/descargas"

# mongod enlaza dinámicamente con libcurl y libssl. Si falta alguna, se instala.
if ldd "$DIR/bin/mongod" | grep -q "not found"; then
  echo "▶ Instalando librerías que faltan para mongod…"
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends libcurl4t64 libssl3t64 liblzma5 ca-certificates
fi

echo "▶ Arrancando servicios…"
"$DIR/bin/mongod" --dbpath "$DIR/mongo-datos" --bind_ip 127.0.0.1 --port 27017 \
  --logpath "$DIR/logs/mongo.log" --fork >/dev/null

nohup "$DIR/bin/mailhog" >"$DIR/logs/mailhog.log" 2>&1 &

RUSTFS_ACCESS_KEY="${RUSTFS_ACCESS_KEY:-rustfsadmin}" \
RUSTFS_SECRET_KEY="${RUSTFS_SECRET_KEY:-rustfsadmin}" \
RUSTFS_ADDRESS="127.0.0.1:9000" \
RUSTFS_CONSOLE_ENABLE="false" \
  nohup "$DIR/bin/rustfs" "$DIR/rustfs-datos" >"$DIR/logs/rustfs.log" 2>&1 &

esperar_puerto() {
  local nombre="$1" puerto="$2"
  for _ in $(seq 1 60); do
    if (exec 3<>"/dev/tcp/127.0.0.1/${puerto}") 2>/dev/null; then
      echo "  ✓ ${nombre} responde en :${puerto}"
      return 0
    fi
    sleep 1
  done
  echo "  ✗ ${nombre} no ha arrancado en :${puerto} tras 60 s" >&2
  echo "--- ${DIR}/logs/${nombre}.log ---" >&2
  tail -n 40 "$DIR/logs/${nombre}.log" >&2 || true
  return 1
}

esperar_puerto mongo 27017
esperar_puerto mailhog 8025
esperar_puerto mailhog 1025
esperar_puerto rustfs 9000
echo "▶ Servicios listos."
