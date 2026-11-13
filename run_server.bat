@echo off
cd /d "%~dp0"
echo ===================================================
echo   BVMT Trading Assistant - Web App & API Server
echo ===================================================
echo Starting server at http://localhost:8000
echo Dashboard: http://localhost:8000
echo API Docs:  http://localhost:8000/api/docs
echo.
echo Default Admin Credentials:
echo   Email:    admin@bvmt.tn
echo   Password: admin123
echo ===================================================
"C:\Users\Anasg\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn src.api.app:app --host 0.0.0.0 --port 8000 --reload
pause
