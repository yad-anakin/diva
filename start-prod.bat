@echo off
setlocal
REM Build and start Next.js in production, skipping type and lint errors as configured in next.config.mjs
set NEXT_TELEMETRY_DISABLED=1

REM Install dependencies if node_modules is missing
if not exist node_modules (
  echo Installing dependencies...
  npm install
)

echo Building production bundle...
npm run build
if errorlevel 1 (
  echo Build reported errors (TypeScript/ESLint are ignored by config). Continuing if possible...
)

echo Starting server on http://localhost:3000
start "Open Browser" cmd /c "timeout /t 3 >nul & start http://localhost:3000/"
 npm run start
endlocal
