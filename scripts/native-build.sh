#!/bin/bash
# Native build script that ensures Docker is in PATH

export PATH="$PATH:/c/Program Files/Docker/Docker/resources/bin"
export DOCKER_HOST=tcp://localhost:2375

cd "$(dirname "$0")/.."

./gradlew build -x test \
  -Dquarkus.native.enabled=true \
  -Dquarkus.native.container-build=true \
  -Dquarkus.native.container-runtime=docker \
  -Dquarkus.native.builder-image=quay.io/quarkus/ubi-quarkus-mandrel-builder-image:jdk-21 \
  -Dquarkus.package.jar.enabled=false \
  "$@"
