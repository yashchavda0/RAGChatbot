"""
Task Manager Service for tracking Celery task status.
Stores task metadata and progress in PostgreSQL.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON
from sqlalchemy.sql import func
from services.postgres_service import get_postgres_service
from services.models import Base
from config.logging_config import get_logger

logger = get_logger(__name__)


class CeleryTask(Base):
    """Model for tracking Celery task status."""
    
    __tablename__ = "celery_tasks"
    
    id = Column(String, primary_key=True)  # Celery task ID
    chatbot_id = Column(String, nullable=False, index=True)
    task_type = Column(String, nullable=False)  # 'document_processing', 'url_crawl', etc.
    status = Column(String, default='pending')  # pending, processing, completed, failed, retrying
    progress = Column(Integer, default=0)  # 0-100
    message = Column(String, default='')
    error = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)
    result = Column(JSON, nullable=True)
    task_metadata = Column(JSON, nullable=True)  # Renamed from 'metadata' to avoid SQLAlchemy conflict
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class TaskManager:
    """Service for managing Celery tasks."""
    
    def __init__(self):
        self.postgres_service = get_postgres_service()
    
    def create_task(
        self,
        task_id: str,
        chatbot_id: str,
        task_type: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CeleryTask:
        """Create a new task record."""
        session = self.postgres_service.session_factory()
        
        try:
            task = CeleryTask(
                id=task_id,
                chatbot_id=chatbot_id,
                task_type=task_type,
                status='pending',
                progress=0,
                task_metadata=metadata or {},
            )
            session.add(task)
            session.commit()
            session.refresh(task)
            
            logger.info(f"Created task record: {task_id} ({task_type})")
            return task
            
        finally:
            session.close()
    
    def update_status(
        self,
        task_id: str,
        status: str,
        progress: Optional[int] = None,
        message: str = "",
        error: Optional[str] = None,
        error_details: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Update task status and progress."""
        session = self.postgres_service.session_factory()
        
        try:
            task = session.query(CeleryTask).filter_by(id=task_id).first()
            
            if not task:
                logger.warning(f"Task not found: {task_id}")
                return False
            
            task.status = status
            if progress is not None:
                task.progress = progress
            if message:
                task.message = message
            if error is not None:
                task.error = error
            if error_details is not None:
                task.error_details = error_details
            if result is not None:
                task.result = result
            if metadata is not None:
                task.task_metadata = metadata
            
            if status in ('completed', 'failed'):
                task.completed_at = datetime.utcnow()
            
            session.commit()
            
            logger.debug(f"Updated task {task_id}: {status} ({progress}%)")
            return True
            
        finally:
            session.close()
    
    def get_task(self, task_id: str) -> Optional[CeleryTask]:
        """Get task by ID."""
        session = self.postgres_service.session_factory()
        
        try:
            return session.query(CeleryTask).filter_by(id=task_id).first()
        finally:
            session.close()
    
    def get_chatbot_tasks(
        self,
        chatbot_id: str,
        task_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[CeleryTask]:
        """Get tasks for a chatbot."""
        session = self.postgres_service.session_factory()
        
        try:
            query = session.query(CeleryTask).filter_by(chatbot_id=chatbot_id)
            
            if task_type:
                query = query.filter_by(task_type=task_type)
            if status:
                query = query.filter_by(status=status)
            
            return query.order_by(CeleryTask.created_at.desc()).limit(limit).all()
            
        finally:
            session.close()
    
    def cleanup_old_tasks(self, days: int = 7):
        """Delete tasks older than specified days."""
        from datetime import timedelta
        
        session = self.postgres_service.session_factory()
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            deleted = session.query(CeleryTask).filter(
                CeleryTask.created_at < cutoff_date,
                CeleryTask.status.in_(['completed', 'failed'])
            ).delete()
            
            session.commit()
            logger.info(f"Cleaned up {deleted} old tasks")
            return deleted
            
        finally:
            session.close()
