import asyncio
import os

from celery import Celery

from worker import run_batch_enrichment_job

celery_app = Celery(
	"tierforge",
	broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
	backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1"),
)


@celery_app.task(name="tasks.run_enrichment_job")
def run_enrichment_task(job_id: int):
	return asyncio.run(run_batch_enrichment_job(job_id))