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
# docker-compose (Mongo 27017, MailHog 1025/8025). RustFS escucha en 9100 y no
# en su 9000 nativo: un runner compartido puede tener ya algo en 9000 y no basta
# con que "responda alguien" en el puerto.
set -euo pipefail

DIR="${CI_SERVICIOS_DIR:-/tmp/servicios}"
MONGO_VERSION="${MONGO_VERSION:-8.0.4}"
MAILHOG_VERSION="${MAILHOG_VERSION:-v1.0.1}"
RUSTFS_VERSION="${RUSTFS_VERSION:-v1.0.0}"
RUSTFS_PORT="${RUSTFS_PORT:-9100}"

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

# Las credenciales del servidor son SIEMPRE las que usará el cliente
# (AWS_USERNAME / AWS_PASSWORD). No se respeta un RUSTFS_ACCESS_KEY heredado del
# entorno del runner: un valor previo distinto haría que el servidor arrancara
# con otra clave y el cliente recibiera InvalidAccessKeyId.
: "${AWS_USERNAME:?AWS_USERNAME es obligatoria}" "${AWS_PASSWORD:?AWS_PASSWORD es obligatoria}"
heredadas="$(env | grep -E '^(RUSTFS|MINIO)_[A-Z0-9_]+=' | cut -d= -f1 | tr '\n' ' ' || true)"
[ -z "$heredadas" ] || echo "  ⚠ variables heredadas del entorno (se sobrescriben): $heredadas"

RUSTFS_ACCESS_KEY="$AWS_USERNAME" \
RUSTFS_SECRET_KEY="$AWS_PASSWORD" \
RUSTFS_ADDRESS="127.0.0.1:${RUSTFS_PORT}" \
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
esperar_puerto rustfs "$RUSTFS_PORT"

echo "▶ Comprobando que RustFS acepta las credenciales configuradas…"
if ! node --input-type=module -e '
  import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
  const cliente = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_URL,
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.AWS_USERNAME, secretAccessKey: process.env.AWS_PASSWORD },
  });
  const Bucket = process.env.AWS_BUCKET;
  try { await cliente.send(new HeadBucketCommand({ Bucket })); }
  catch { await cliente.send(new CreateBucketCommand({ Bucket })); }
  console.log("  ✓ bucket " + Bucket + " disponible en " + process.env.AWS_URL);
'; then
  echo "  ✗ RustFS rechaza las credenciales o no es el servidor esperado" >&2
  echo "--- procesos escuchando ---" >&2
  (ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep -E ":(9000|9100|27017|1025|8025)\b" >&2 || true
  echo "--- ${DIR}/logs/rustfs.log ---" >&2
  tail -n 40 "$DIR/logs/rustfs.log" >&2 || true
  exit 1
fi
echo "▶ Servicios listos."
