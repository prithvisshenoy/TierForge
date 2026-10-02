import csv
import io
from datetime import datetime, timezone

from fastapi import BackgroundTasks, HTTPException
from loguru import logger

from models.models import TierCalculationRequest
from utils.db_utils import execute_insert_returning, execute_query, execute_statement


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

    now = datetime.now(timezone.utc)

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
    enrichment_params = {"now": now}

    for idx, store_row in enumerate(inserted_stores):
        enrichment_value_clauses.append(f"(:store_id_{idx}, 'PENDING', 0, :now, :now)")
        enrichment_params[f"store_id_{idx}"] = store_row["store_id"]

    bulk_enrichment_sql = f"""
        INSERT INTO enrichments (store_id, status, retry_count, created_at, updated_at)
        VALUES {', '.join(enrichment_value_clauses)}
        ON CONFLICT (store_id) DO UPDATE SET
            status = 'PENDING',
            retry_count = 0,
            last_error = NULL,
            updated_at = EXCLUDED.updated_at
        WHERE enrichments.status !='COMPLETED'; 
    """
    execute_statement(bulk_enrichment_sql, enrichment_params)

    background_tasks.add_task(batch_enrichment_job, job_id)

    return {
        "job_id": job_id,
        "status": "PENDING",
        "total_records": len(validated_rows),
        "message": "File accepted. Batch enrichment job initiated successfully."
    }

def fetch_job_status(job_id: int) -> dict | None:
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
    successful = job.get("successful_records") or 0
    failed = job.get("failed_records") or 0
    total = job.get("total_records") or 0

    processed_records = successful + failed
    pending_records = max(total - processed_records, 0)

    failed_records_query = """
        SELECT DISTINCT s.store_id, s.store_name, e.last_error as failure_reason
        FROM stores s
        JOIN enrichments e ON e.store_id = s.store_id
        WHERE s.job_id = :job_id AND e.status = 'FAILED';
    """
    failed_records = execute_query(failed_records_query, {"job_id": job_id})
    
    progress_percentage = round((processed_records / total) * 100, 2) if total > 0 else 0.0

    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": {
            "total_records": total,
            "successful_records": successful,
            "failed_records": failed,
            "failed_records_details": failed_records,
            "pending_records": pending_records,
            "percentage": progress_percentage
        },
    }

def insert_score_tier_calculation_results(job_id: int, results: list[dict]):
    if not results:
        logger.warning(f"No results to insert for job_id {job_id}")
        return

    insert_query = """
        INSERT INTO store_tier_results (job_id, store_id, score, tier, footfall_snapshot, revenue_snapshot, size_sqft_snapshot, calculated_at)
        VALUES (:job_id, :store_id, :score, :tier, :footfall_snapshot, :revenue_snapshot, :size_sqft_snapshot, NOW())
        ON CONFLICT (job_id, store_id) DO UPDATE SET
            score = EXCLUDED.score,
            tier = EXCLUDED.tier,
            footfall_snapshot = EXCLUDED.footfall_snapshot,
            revenue_snapshot = EXCLUDED.revenue_snapshot,
            size_sqft_snapshot = EXCLUDED.size_sqft_snapshot,
            calculated_at = CURRENT_TIMESTAMP;
    """

    insert_params = [
        {
            "job_id": job_id,
            "store_id": r["store_id"],
            "score": float(r["score"]) if r.get("score") is not None else 0.0,
            "tier": r.get("tier", "Small"),
            "footfall_snapshot": r.get("est_monthly_footfall"),
            "revenue_snapshot": float(r["est_monthly_revenue"]) if r.get("est_monthly_revenue") is not None else 0.0,
            "size_sqft_snapshot": r.get("store_size_sqft")
        }
        for r in results
    ]

    execute_statement(insert_query, insert_params)

def calculate_scores_and_tiers(config: TierCalculationRequest, background_tasks: BackgroundTasks) -> dict:
    query = """
        WITH calculated_score AS (
            SELECT DISTINCT
                s.store_id,
                s.job_id,
                s.store_name,
                e.est_monthly_footfall,
                e.est_monthly_revenue,
                e.store_size_sqft,
                (
                    CASE WHEN COALESCE(e.est_monthly_footfall, 0) >= :footfall_bar THEN :footfall_weight ELSE 0 END +
                    CASE WHEN COALESCE(e.est_monthly_revenue, 0) >= :revenue_bar THEN :revenue_weight ELSE 0 END +
                    CASE WHEN COALESCE(e.store_size_sqft, 0) >= :size_bar THEN :size_weight ELSE 0 END
                ) AS score
            FROM stores s
            JOIN enrichments e ON s.store_id = e.store_id
            WHERE s.job_id = :job_id AND e.status = 'COMPLETED'
        ),
        tiers AS (
            SELECT *,
                (
                    CASE   
                        WHEN score >= :large_tier_threshold THEN 'Large'
                        WHEN score >= :medium_tier_threshold AND score < :large_tier_threshold THEN 'Medium'
                        ELSE 'Small'
                    END
                ) AS tier,
                COUNT(*) OVER() AS total_enriched,
                COUNT(*) FILTER (WHERE score >= :large_tier_threshold) OVER() AS large_count,
                COUNT(*) FILTER (WHERE score >= :medium_tier_threshold AND score < :large_tier_threshold) OVER() AS medium_count,
                COUNT(*) FILTER (WHERE score < :medium_tier_threshold) OVER() AS small_count
            FROM calculated_score
        )
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

    background_tasks.add_task(insert_score_tier_calculation_results, config.job_id, stores)

    if not stores:
        return {
            "job_id": config.job_id,
            "tier_breakdown": {"large": 0, "medium": 0, "small": 0, "total_enriched": 0},
            "stores": []
        }

    first_row = stores[0]
    
    return {
        "job_id": config.job_id,
        "tier_breakdown": {
            "large": first_row.get("large_count", 0),
            "medium": first_row.get("medium_count", 0),
            "small": first_row.get("small_count", 0),
            "total_enriched": first_row.get("total_enriched", 0)
        },
        "stores": [
            {
                "store_id": s["store_id"],
                "store_name": s["store_name"],
                "metrics": {
                    "footfall": s.get("est_monthly_footfall"),
                    "revenue": float(s["est_monthly_revenue"]) if s.get("est_monthly_revenue") is not None else 0.0,
                    "size_sqft": s.get("store_size_sqft")
                },
                "score_percentage": float(s["score"]) if s.get("score") is not None else 0.0,
                "tier": s.get("tier", "Small")
            }
            for s in stores
        ]
    }