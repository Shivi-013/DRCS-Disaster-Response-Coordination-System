@echo off
echo ========================================
echo  DRCS Frontend Starting...
echo ========================================
cd /d "%~dp0Frontend"

if not exist "node_modules" (
    echo Installing dependencies (this may take a few minutes)...
    npm install
)

echo.
echo Starting React app on http://localhost:5173
echo.
npm run dev
pause
