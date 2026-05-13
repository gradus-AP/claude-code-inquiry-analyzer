from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import summary, topics, inquiries, risk, analysis, service_changes

app = FastAPI(title="CS分析エージェント API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(summary.router)
app.include_router(topics.router)
app.include_router(inquiries.router)
app.include_router(risk.router)
app.include_router(analysis.router)
app.include_router(service_changes.router)
