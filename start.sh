#!/bin/sh

echo "FLASK_ENV=$FLASK_ENV"

if [ "$FLASK_ENV" = "development" ]; then
    echo "Starting in development mode..."
    exec python run.py
else
    echo "Starting in production mode..."
    # Escape the parentheses for sh
    exec gunicorn app:create_app\(\) -b 0.0.0.0:5000 -w 4
fi
