#!/bin/bash

echo "🔍 Test des endpoints Better-Auth..."
echo "=================================="

echo ""
echo "1️⃣ Test endpoint racine..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/auth/

echo ""
echo "2️⃣ Test session..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/auth/session

echo ""
echo "3️⃣ Test get-session..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/auth/get-session

echo ""
echo "4️⃣ Test use-session..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/auth/use-session

echo ""
echo "5️⃣ Test sign-in..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/auth/sign-in/email

echo ""
echo "6️⃣ Test sign-up..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/api/auth/sign-up/email

echo ""
echo "🏁 Test terminé"