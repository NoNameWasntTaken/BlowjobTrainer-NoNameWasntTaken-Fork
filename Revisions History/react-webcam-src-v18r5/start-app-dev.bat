@echo off
echo Checking for Node.js...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please download and install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install

echo Starting the development server...
npm start
pause
