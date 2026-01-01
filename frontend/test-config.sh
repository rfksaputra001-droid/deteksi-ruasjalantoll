# Debug Script for Frontend Testing

echo "🔧 Testing Frontend Configuration..."

echo ""
echo "📍 Environment Variables:"
echo "VITE_API_BASE_URL: $(grep VITE_API_BASE_URL .env)"

echo ""
echo "🌐 Testing API Connection:"
curl -s -o /dev/null -w "%{http_code}" https://yolo-detection-api.onrender.com/health

echo ""
echo "📊 Testing Debug Endpoint:"
curl -s https://yolo-detection-api.onrender.com/debug | jq .success

echo ""
echo "🔐 Testing Login Endpoint:"
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"emailUser":"test@example.com","passwordUser":"wrong"}' \
  https://yolo-detection-api.onrender.com/api/auth/login

echo ""
echo "✅ Test Complete!"