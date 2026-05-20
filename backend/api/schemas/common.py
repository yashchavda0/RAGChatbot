"""
Common Pydantic schemas for API request/response models.
Includes pagination, error handling, and health check schemas.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Generic, TypeVar

T = TypeVar("T")


# =============================================================================
# PAGINATION SCHEMAS
# =============================================================================

class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(default="created_at", description="Field to sort by")
    sort_order: Optional[str] = Field(default="desc", description="Sort order (asc/desc)")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class SuccessResponse(BaseModel):
    """Success response schema."""
    message: str
    data: Optional[Dict[str, any]] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    services: Dict[str, any]
    version: str = "2.0.0"
