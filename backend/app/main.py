# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base

# Import all models FIRST (so Base knows about them)
from app.models.project_model import ProjectRecord
from app.models.defi_model import DeFiProject
from app.models.risk_history_model import RiskHistory

# NOW create tables (after models are imported)
Base.metadata.create_all(bind=engine)

# Import routes AFTER models and tables are created
from app.routes.defi_routes import router as defi_router
from app.routes.defillama_routes import router as defillama_router
from app.routes.analytics_routes import router as analytics_router

from app.services.scheduler import start_scheduler, stop_scheduler
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting DeFiRisk AI...")
    start_scheduler()
    yield
    # Shutdown
    print("🛑 Shutting down DeFiRisk AI...")
    stop_scheduler()

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="DeFiRisk AI",
    description="AI-powered DeFi risk analysis with real-time data and historical tracking",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(defi_router, prefix="/defi", tags=["Risk Analysis"])
app.include_router(defillama_router, prefix="/defillama", tags=["DeFiLlama Data"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics & History"])

@app.get("/")
def root():
    return {
        "message": "🚀 DeFiRisk AI v2.0",
        "docs": "https://defirisk-ai-backend.onrender.com/docs",
        "endpoints": {
            "/defi/projects": "Get all analyzed projects",
            "/defi/analyze_risk": "Analyze a protocol",
            "/defillama/search": "Search protocols",
            "/defillama/protocol/{slug}": "Get protocol data",
            "/analytics/history/{id}": "Get risk history",
            "/analytics/trends": "Get risk trends"
        }
    }

print("✅ DeFiRisk AI backend started successfully!")
print("📡 DeFiLlama integration enabled")
print("🔗 API Docs: https://defirisk-ai-backend.onrender.com/docs")