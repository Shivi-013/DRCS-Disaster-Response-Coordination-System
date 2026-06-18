from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from routes import auth, incidents, volunteers, resources, assignments, relief_camps, notifications, ai_routes, reports, analytics, resource_requests

app = FastAPI(
    title="Disaster Response Coordination System",
    description="DRCS API - State Disaster Management Authority",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/reports", StaticFiles(directory=str(REPORTS_DIR)), name="reports")

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(volunteers.router, prefix="/api/volunteers", tags=["Volunteers"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["Assignments"])
app.include_router(relief_camps.router, prefix="/api/relief-camps", tags=["Relief Camps"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(ai_routes.router, prefix="/api/ai", tags=["AI"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(resource_requests.router, prefix="/api/resource-requests", tags=["Resource Requests"])


@app.get("/")
async def root():
    return {
        "message": "Disaster Response Coordination System API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "DRCS API"}
