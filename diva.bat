@echo off
setlocal
REM Start Next.js dev server on port 3000 and open browser automatically
set NEXT_TELEMETRY_DISABLED=1

REM Install dependencies if node_modules is missing
if not exist node_modules (
  echo Installing dependencies...
  npm install
)

start "Open Browser" cmd /c "timeout /t 3 >nul & start http://localhost:3000/"
npm run dev
endlocal
