#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -p pir-control build
docker compose -p pir-control up -d db
docker compose -p pir-control run --rm api python manage.py migrate
docker compose -p pir-control run --rm api python manage.py seed_demo --password "${PIR_DEMO_PASSWORD:-PirDemo2026!}"
docker compose -p pir-control up -d
echo "ПИР Контроль: http://localhost:${PIR_PORT:-8088}"
echo 'Учебные логины: gip, coordinator, technical, finance, director, department.'
