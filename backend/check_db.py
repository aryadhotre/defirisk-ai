# backend/check_db.py
from app.db import SessionLocal
from app.models.risk_history_model import RiskHistory
from app.models.project_model import ProjectRecord

db = SessionLocal()

# Check projects
projects = db.query(ProjectRecord).all()
print(f"\n{'='*50}")
print(f"Total projects: {len(projects)}")
print(f"{'='*50}")
for p in projects:
    print(f"  - {p.name} (ID: {p.id}) - TVL: ${p.total_value_locked:,.0f}")

# Check history
history = db.query(RiskHistory).all()
print(f"\n{'='*50}")
print(f"Total history records: {len(history)}")
print(f"{'='*50}")

if history:
    for h in history[:10]:  # Show first 10
        print(f"  - Project ID: {h.project_id}, Timestamp: {h.timestamp}, TVL: ${h.total_value_locked:,.0f}")
else:
    print("  ⚠️ NO HISTORY RECORDS FOUND!")

db.close()