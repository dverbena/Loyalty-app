docker compose down loyalty-app
docker compose up loyalty-app --build -d
docker tag loyalty-app danyver/loyalty-app:latest
docker push danyver/loyalty-app:latest