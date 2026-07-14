"""Task status and management routes."""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from celery.result import AsyncResult
from celery_app import celery_app
from services.task_manager import TaskManager
from config.logging_config import get_logger

router = APIRouter(prefix="/tasks", tags=["tasks"])
logger = get_logger(__name__)

task_manager = TaskManager()


class TaskStatusResponse(BaseModel):
    """Task status response model."""
    task_id: str
    state: str
    status: str
    progress: int
    message: str
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Get status of a Celery task."""
    try:
        # Get from Celery
        result = AsyncResult(task_id, app=celery_app)
        
        # Get from database for additional info
        task_record = task_manager.get_task(task_id)
        
        response = {
            "task_id": task_id,
            "state": result.state,
            "status": task_record.status if task_record else result.state.lower(),
            "progress": task_record.progress if task_record else 0,
            "message": task_record.message if task_record else "",
        }
        
        # Add state-specific info
        if result.state == 'PENDING':
            response['message'] = 'Task is waiting to start...'
        elif result.state == 'STARTED':
            response['message'] = 'Task has started...'
            response['progress'] = task_record.progress if task_record else 5
        elif result.state == 'PROGRESS':
            info = result.info or {}
            response['progress'] = info.get('progress', 50)
            response['message'] = info.get('message', 'Processing...')
        elif result.state == 'SUCCESS':
            response['result'] = result.result
            response['progress'] = 100
            response['message'] = 'Task completed successfully'
        elif result.state == 'FAILURE':
            response['error'] = str(result.info)
            response['message'] = 'Task failed'
        
        # Add database timestamps
        if task_record:
            response['created_at'] = task_record.created_at.isoformat() if task_record.created_at else None
            response['updated_at'] = task_record.updated_at.isoformat() if task_record.updated_at else None
            response['completed_at'] = task_record.completed_at.isoformat() if task_record.completed_at else None
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting task status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}")
async def cancel_task(task_id: str):
    """Cancel a running task."""
    try:
        celery_app.control.revoke(task_id, terminate=True)
        
        # Update database
        task_manager.update_status(
            task_id=task_id,
            status='cancelled',
            message='Task cancelled by user'
        )
        
        return {"message": "Task cancelled", "task_id": task_id}
        
    except Exception as e:
        logger.error(f"Error cancelling task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chatbot/{chatbot_id}", response_model=List[TaskStatusResponse])
async def get_chatbot_tasks(
    chatbot_id: str,
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
):
    """Get all tasks for a chatbot."""
    try:
        tasks = task_manager.get_chatbot_tasks(
            chatbot_id=chatbot_id,
            task_type=task_type,
            status=status,
            limit=limit
        )
        
        return [
            TaskStatusResponse(
                task_id=task.id,
                state=task.status.upper(),
                status=task.status,
                progress=task.progress,
                message=task.message,
                result=task.result,
                error=task.error,
                created_at=task.created_at.isoformat() if task.created_at else None,
                updated_at=task.updated_at.isoformat() if task.updated_at else None,
                completed_at=task.completed_at.isoformat() if task.completed_at else None,
            )
            for task in tasks
        ]
        
    except Exception as e:
        logger.error(f"Error getting chatbot tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))
