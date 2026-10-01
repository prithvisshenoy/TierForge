import asyncio
from fastapi import FastAPI, HTTPException
from models.models import TierCalculationRequest
from utils.db_utils import execute_query
from typing import Optional

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

def calculate_scores_and_tiers(config: TierCalculationRequest, tier_filter: Optional[str] = None):
    query = """
        WITH calculated_score AS
            (
                SELECT DISTINCT(s.store_id), s.store_name, est_monthly_footfall, est_monthly_revenue, store_size_sqft,
                (CASE WHEN e.est_monthly_footfall >= :footfall_bar THEN :footfall_weight ELSE 0 END +
                CASE WHEN e.est_monthly_revenue >= :revenue_bar THEN :revenue_weight ELSE 0 END +
                CASE WHEN e.store_size_sqft >= :size_bar THEN :size_weight ELSE 0 END
                ) as score
                FROM stores s JOIN enrichments e ON
                s.store_id = e.store_id
                WHERE e.status='COMPLETED'
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
        "footfall_bar": config.footfall_bar,
        "revenue_bar": config.revenue_bar,
        "size_bar": config.size_bar,
        "footfall_weight": config.footfall_weight,
        "revenue_weight": config.revenue_weight,
        "size_weight": config.size_weight,
        "large_tier_threshold": config.large_tier_threshold,
        "medium_tier_threshold": config.medium_tier_threshold
    }

    # if tier_filter:
    #     query += " WHERE LOWER(tier) = LOWER(:tier_filter)"

    # query += " ORDER BY score DESC, store_name ASC;"

    stores = execute_query(query, params)

    if not stores:
        return {
            "tier_breakdown": {"large": 0, "medium": 0, "small": 0, "total_enriched": 0},
            "stores": []
        }

    # Extract breakdown directly from window function results of the first row
    first_row = stores[0]
    
    return {
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
