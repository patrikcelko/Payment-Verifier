#!/usr/bin/env bash

function rebuild_docker_containers_payment_verifier () {
    info "Rebuilding containers for Payment Verifier. Please wait..."

    docker compose -f docker/docker-compose.yml down
    docker compose -f docker/docker-compose.yml build --no-cache
    docker compose -f docker/docker-compose.yml up
}

function start_docker_container_payment_verifier () {
    info "Starting docker containers for Payment Verifier. Please wait..."

    docker compose -f docker/docker-compose.yml up -d
}
