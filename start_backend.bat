@echo off
echo ========================================
echo  DRCS Backend Starting...
echo ========================================
cd /d "%~dp0Backend"

if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env
    echo IMPORTANT: Edit Backend\.env and add your GOOGLE_API_KEY for AI features
)

if not exist "data\users.json" (
    echo Initializing sample data...
    python setup.py
) else (
    for /f %%i in ('python -c "import json; d=json.load(open(\"data/users.json\")); print(len(d))"') do set COUNT=%%i
    if "!COUNT!"=="0" (
        echo Initializing sample data...
        python setup.py
    )
)

echo.
echo Starting FastAPI server on http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
