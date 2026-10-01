from fastapi import FastAPI
from fastapi import File, UploadFile, HTTPException, BackgroundTasks
from utils import db_utils
from collections import deque
import csv
import io
from worker import enrich_single_store, run_batch_enrichment_job
from loguru import logger
from celery.result import AsyncResult
import asyncio
from datetime import datetime   

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv file")

    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    validated_rows = []
    validation_errors = []

    for idx, row in enumerate(reader, start=2):
        clean_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
        
        # Check non-null & non-empty store_id
        store_id_val = clean_row.get("store_id")
        if not store_id_val:
            validation_errors.append(f"Row {idx}: missing or empty 'store_id'")
            continue

        validated_rows.append(clean_row)

    if validation_errors:
        raise HTTPException(
            status_code=422,
            detail={"message": "CSV row validation failed", "errors": validation_errors[:15]}
        )

    if not validated_rows:
        raise HTTPException(status_code=400, detail="CSV file contains no valid records")

    now = datetime.utcnow()

  
    job_result = db_utils.execute_insert_returning(
        """
        INSERT INTO jobs (status, total_records, successful_records, failed_records, created_at, updated_at)
        VALUES ('PENDING', :total, 0, 0, :now, :now)
        RETURNING id;
        """,
        {"total": len(validated_rows), "now": now}
    )
    job_id = job_result[0]["id"]

    store_value_clauses = []
    store_params = {"job_id": job_id, "now": now}

    for idx, row in enumerate(validated_rows):
        store_value_clauses.append(
            f"(:s_id_{idx}, :s_name_{idx}, :addr_{idx}, :city_{idx}, :state_{idx}, :country_{idx}, :job_id, :now)"
        )
        store_params[f"s_id_{idx}"] = row.get("store_id")
        store_params[f"s_name_{idx}"] = row.get("store_name", "")
        store_params[f"addr_{idx}"] = row.get("address", "")
        store_params[f"city_{idx}"] = row.get("city", "")
        store_params[f"state_{idx}"] = row.get("state", "")
        store_params[f"country_{idx}"] = row.get("country", "")

    bulk_store_sql = f"""
        INSERT INTO stores (store_id, store_name, address, city, state, country, job_id, created_at)
        VALUES {', '.join(store_value_clauses)}
        RETURNING id;
    """
    inserted_stores = db_utils.execute_insert_returning(bulk_store_sql, store_params)

    enrichment_value_clauses = []
    enrichment_params = {"now": now}

    for idx, store_row in enumerate(inserted_stores):
        enrichment_value_clauses.append(f"(:store_id_{idx}, 'PENDING', 0, :now, :now)")
        enrichment_params[f"store_id_{idx}"] = store_row["id"]

    bulk_enrichment_sql = f"""
        INSERT INTO enrichments (store_id, status, retry_count, created_at, updated_at)
        VALUES {', '.join(enrichment_value_clauses)};
    """
    db_utils.execute_statement(bulk_enrichment_sql, enrichment_params)

    background_tasks.add_task(run_batch_enrichment_job, job_id)

    return {
        "job_id": job_id,
        "status": "PENDING",
        "total_records": len(validated_rows),
        "message": "File accepted. Batch enrichment job initiated successfully."
    }

    
@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    job_status = db_utils.execute_query(f"SELECT * FROM jobs WHERE id: job_id", {"job_id": job_id})
    return {"job_status": job_status.status, "total_records": job_status.total_records, "successful_records": job_status.successful_records, "failed_records": job_status.failed_records, "total_records": job_status.total_records}
