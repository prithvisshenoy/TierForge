from fastapi import FastAPI
from fastapi import File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from utils import db_utils
from collections import deque
import csv
import io
from worker import run_batch_enrichment_job
from loguru import logger
from celery.result import AsyncResult
import asyncio
from models.models import TierCalculationRequest
from service import process_csv_and_insert_job, fetch_job_status, calculate_scores_and_tiers

app = FastAPI(title="TierForge API", description="API for TierForge application", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.post("/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    contents = await file.read()
    
    return await asyncio.to_thread(
        process_csv_and_insert_job,
        contents,
        background_tasks,
        run_batch_enrichment_job
    )

    
@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    job_data = await asyncio.to_thread(fetch_job_status, job_id)

    if not job_data:
        raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
        
    return job_data

@app.post("/tiers")
async def create_tier(payload: TierCalculationRequest, background_tasks: BackgroundTasks):
    try:
        result = await asyncio.to_thread(calculate_scores_and_tiers, payload, background_tasks=background_tasks)

        return result

    except Exception as e:
        logger.error(f"Error in /tiers endpoint: {str(e)}")