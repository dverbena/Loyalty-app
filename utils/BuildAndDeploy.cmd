docker compose down app
docker compose up app --build -d
docker tag mttf-loyalty-app danyver/loyalty-app:latest
docker push danyver/loyalty-app:latest