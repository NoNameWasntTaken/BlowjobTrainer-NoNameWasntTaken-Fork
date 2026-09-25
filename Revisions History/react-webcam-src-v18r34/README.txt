React Webcam Application
=====================

This package contains a pre-built version of the React Webcam application that you can run locally without needing to install additional dependencies (except Node.js).

Prerequisites
------------
- Node.js (Download from https://nodejs.org)

Running the Application
----------------------

For Windows Users:
1. Extract all files from the zip archive
2. Double-click the 'start-app.bat' file
3. Wait for the application to start
4. Open your web browser and go to: http://localhost:3000
5. To stop the application, close the command prompt window

For Mac Users:
1. Extract all files from the zip archive
2. Open Terminal
3. Navigate to the extracted folder using 'cd' command
   Example: cd ~/Downloads/react-webcam-standalone
4. Make the startup script executable (if needed):
   chmod +x start-app.sh
5. Run the application:
   ./start-app.sh
6. Open your web browser and go to: http://localhost:3000
7. To stop the application, press Ctrl+C in the Terminal

Troubleshooting
--------------
- If you see an error about Node.js not being installed, please download and install it from https://nodejs.org
- If you see an error about port 3000 being in use, make sure no other applications are using that port
- For Mac users: If you get a permission denied error, run 'chmod +x start-app.sh' in Terminal

Note: This is an offline version of the application. Once started, it runs entirely on your local machine and doesn't require an internet connection. 