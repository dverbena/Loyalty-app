docker buildx create --use --name multiarch-builder
docker buildx inspect --bootstrap
docker buildx build --platform linux/amd64,linux/arm64 -t danyver/loyalty-app:latest --push .
