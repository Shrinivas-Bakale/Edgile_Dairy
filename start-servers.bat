@echo off
echo Starting Edgile servers...

:: Start backend server
echo Starting backend server...
start cmd /k "cd edgile-backend && set PORT=5001 && node server.js"

:: Wait a few seconds for backend to initialize
timeout /t 5 /nobreak

:: Start frontend server
echo Starting frontend server...
start cmd /k "cd edgile-frontend && npm run dev"

echo.
echo Both servers have been started!
echo Backend: http://localhost:5001
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul 