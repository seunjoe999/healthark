@echo off
echo Pulling latest code...
git pull origin claude/audit-caregiver-platform-MTK8g

echo.
echo Killing any existing backend on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>nul

echo.
echo Starting backend...
cd backend
start "HealthArk Backend" cmd /k "npm run dev"

echo.
echo Done! Backend is starting in a new window.
echo Frontend (Vite) hot-reloads automatically.
pause
