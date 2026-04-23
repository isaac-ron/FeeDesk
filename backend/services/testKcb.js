/*
curl -i -X POST https://feedesk-backend.onrender.com/api/payments/bank/validate/kcb \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "TEST-VAL-OTC-001",
    "customerReference": "12032",
    "organizationReference": "777777"
  }'

*/