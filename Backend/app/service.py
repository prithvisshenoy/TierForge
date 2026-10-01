import asyncio
from fastapi import FastAPI, HTTPException
from models.models import TierCalculationRequest
from utils.db_utils import execute_query, execute_insert_returning, execute_statement
import csv
import io
from datetime import datetime   
from loguru import logger

def process_csv_and_insert_job(contents: bytes, background_tasks, batch_enrichment_job) -> dict:
    try:
        decoded = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(decoded))

    validated_rows = []
    validation_errors = []

    for idx, row in enumerate(reader, start=2):
        if not row:
            continue
        clean_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}
        
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

    job_result = execute_insert_returning(
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
        RETURNING store_id;
    """
    inserted_stores = execute_insert_returning(bulk_store_sql, store_params)

    enrichment_value_clauses = []
    enrichment_params =  {"job_id": job_id, "now": now}

    for idx, store_row in enumerate(inserted_stores):
        enrichment_value_clauses.append(f"(:store_id_{idx}, :job_id, 'PENDING', 0, :now, :now)")
        enrichment_params[f"store_id_{idx}"] = store_row["store_id"]

    bulk_enrichment_sql = f"""
        INSERT INTO enrichments (store_id, job_id, status, retry_count, created_at, updated_at)
        VALUES {', '.join(enrichment_value_clauses)};
    """
    execute_statement(bulk_enrichment_sql, enrichment_params)


    background_tasks.add_task(batch_enrichment_job, job_id)

    return {
        "job_id": job_id,
        "status": "PENDING",
        "total_records": len(validated_rows),
        "message": "File accepted. Batch enrichment job initiated successfully."
    }

def fetch_job_status(job_id: int):
    job_query = """
        SELECT 
            id AS job_id,
            status,
            total_records,
            successful_records,
            failed_records,
            created_at,
            updated_at,
            completed_at
        FROM jobs
        WHERE id = :job_id;
    """
    job_rows = execute_query(job_query, {"job_id": job_id})
    if not job_rows:
        return None

    job = job_rows[0]

    processed_records = job["successful_records"] + job["failed_records"]
    pending_records = job["total_records"] - processed_records
    
    progress_percentage = 0.0
    if job["total_records"] > 0:
        progress_percentage = round((processed_records / job["total_records"]) * 100, 2)

    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": {
            "total_records": job["total_records"],
            "successful_records": job["successful_records"],
            "failed_records": job["failed_records"],
            "pending_records": pending_records,
            "percentage": progress_percentage
        },
    }

def calculate_scores_and_tiers(config: TierCalculationRequest):
    query = """
        WITH calculated_score AS
            (
                SELECT DISTINCT(s.store_id), s.job_id, s.store_name, est_monthly_footfall, est_monthly_revenue, store_size_sqft,
                (CASE WHEN e.est_monthly_footfall >= :footfall_bar THEN :footfall_weight ELSE 0 END +
                CASE WHEN e.est_monthly_revenue >= :revenue_bar THEN :revenue_weight ELSE 0 END +
                CASE WHEN e.store_size_sqft >= :size_bar THEN :size_weight ELSE 0 END
                ) as score
                FROM stores s JOIN enrichments e ON
                s.store_id = e.store_id
                WHERE s.job_id=:job_id AND e.status='COMPLETED'
            ),
            tiers AS
            (SELECT *,
            (CASE 	
                WHEN score >= :large_tier_threshold THEN 'Large'
                WHEN score>= :medium_tier_threshold AND score< :large_tier_threshold THEN 'Medium'
                ELSE 'Small'
            END) as tier,
            COUNT(*) OVER() AS total_enriched,
            COUNT(*) FILTER (WHERE score >= :large_tier_threshold) OVER() AS large_count,
            COUNT(*) FILTER (WHERE score >= :medium_tier_threshold AND score < :large_tier_threshold) OVER() AS medium_count,
            COUNT(*) FILTER (WHERE score < :medium_tier_threshold) OVER() AS small_count
            FROM calculated_score)

            SELECT * FROM tiers;
    """
    
    params = {
        "job_id": config.job_id,
        "footfall_bar": config.footfall_bar,
        "revenue_bar": config.revenue_bar,
        "size_bar": config.size_bar,
        "footfall_weight": config.footfall_weight,
        "revenue_weight": config.revenue_weight,
        "size_weight": config.size_weight,
        "large_tier_threshold": config.large_tier_threshold,
        "medium_tier_threshold": config.medium_tier_threshold
    }

    stores = execute_query(query, params)

    if not stores:
        return {
            "job_id": config.job_id,
            "tier_breakdown": {"large": 0, "medium": 0, "small": 0, "total_enriched": 0},
            "stores": []
        }

    # Extract breakdown directly from window function results of the first row
    first_row = stores[0]
    
    return {
        "job_id": config.job_id,
        "tier_breakdown": {
            "large": first_row["large_count"],
            "medium": first_row["medium_count"],
            "small": first_row["small_count"],
            "total_enriched": first_row["total_enriched"]
        },
        "stores": [
            {
                "store_id": s["store_id"],
                "store_name": s["store_name"],
                "metrics": {
                    "footfall": s["est_monthly_footfall"],
                    "revenue": float(s["est_monthly_revenue"]) if s["est_monthly_revenue"] is not None else 0.0,
                    "size_sqft": s["store_size_sqft"]
                },
                "score_percentage": float(s["score"]),
                "tier": s["tier"]
            }
            for s in stores
        ]
    }
