"""Base task class with common functionality."""
from celery import Task
from typing import Dict, Any, Optional
from config.logging_config import get_logger

logger = get_logger(__name__)


class CallbackTask(Task):
    """
    Base task class with progress tracking and error handling.
    All async tasks should inherit from this.
    """
    
    def __init__(self):
        super().__init__()
        self._task_manager = None
    
    @property
    def task_manager(self):
        """Lazy load task manager to avoid circular imports."""
        if self._task_manager is None:
            from services.task_manager import TaskManager
            self._task_manager = TaskManager()
        return self._task_manager
    
    def on_success(self, retval: Any, task_id: str, args: tuple, kwargs: dict):
        """Called when task succeeds."""
        logger.info(f"Task {task_id} succeeded")
        try:
            self.task_manager.update_status(
                task_id=task_id,
                status='completed',
                progress=100,
                result=retval
            )
        except Exception as e:
            logger.error(f"Failed to update task success status: {e}")
    
    def on_failure(self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo):
        """Called when task fails."""
        logger.error(f"Task {task_id} failed: {exc}")
        try:
            self.task_manager.update_status(
                task_id=task_id,
                status='failed',
                error=str(exc),
                error_details=str(einfo)
            )
        except Exception as e:
            logger.error(f"Failed to update task failure status: {e}")
    
    def on_retry(self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo):
        """Called when task is retried."""
        logger.warning(f"Task {task_id} retrying: {exc}")
        try:
            self.task_manager.update_status(
                task_id=task_id,
                status='retrying',
                message=f"Retry attempt due to: {str(exc)}"
            )
        except Exception as e:
            logger.error(f"Failed to update task retry status: {e}")
    
    def update_progress(
        self,
        progress: int,
        message: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Update task progress."""
        self.update_state(
            state='PROGRESS',
            meta={
                'progress': progress,
                'message': message,
                'metadata': metadata or {}
            }
        )
        
        # Also update in database
        try:
            self.task_manager.update_status(
                task_id=self.request.id,
                status='processing',
                progress=progress,
                message=message,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Failed to update progress in database: {e}")
