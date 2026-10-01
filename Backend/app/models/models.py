import enum
import uuid
from datetime import datetime
from pydantic import BaseModel

class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class TierCalculationRequest(BaseModel):
    job_id: int
    footfall_bar: int
    footfall_weight: int        
    revenue_bar: int    
    revenue_weight: int
    size_bar: int
    size_weight: int
    large_tier_threshold: int
    medium_tier_threshold: int