# CIVITAS starter

Minimal backend scaffold for the government intelligence prototype.

## Start API

```bash
cd backend
uv pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit http://localhost:8000/api/health and http://localhost:8000/docs.

This is a foundation only, not the completed multi-agent platform.
