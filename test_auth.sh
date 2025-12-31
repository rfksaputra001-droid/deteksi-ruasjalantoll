#!/bin/bash

echo "Testing login API..."
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailUser":"admin@yolo.com","passwordUser":"Admin123!"}' \
  -w "\n" \
  -s

echo -e "\nTesting protected endpoint without token..."
curl -X GET http://localhost:3001/api/deteksi/list \
  -w "\n" \
  -s

echo -e "\nDone."