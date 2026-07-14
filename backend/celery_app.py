"""
Celery application configuration for async task processing.
Handles document processing, URL crawling, and other long-running tasks.
"""
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
from config.settings import settings
from config.logging_config import get_logger

logger = get_logger(__name__)

# Create Celery app
celery_app = Celery(
    'rag_chatbot',
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        'tasks.document_tasks',
        'tasks.url_tasks',
    ]
)

# Celery configuration
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_time_limit=600,  # 10 minutes hard limit
    task_soft_time_limit=540,  # 9 minutes soft limit
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
    worker_disable_rate_limits=True,
    
    # Result backend
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        'master_name': 'mymaster',
        'visibility_timeout': 3600,
    },
    
    # Broker settings
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    
    # Task routing
    task_routes={
        'tasks.process_document': {'queue': 'documents'},
        'tasks.crawl_urls': {'queue': 'urls'},
        'tasks.process_url_content': {'queue': 'urls'},
    },
    
    # Rate limits
    task_default_rate_limit='10/m',  # 10 tasks per minute default
)


# Signal handlers for logging
@task_prerun.connect
def task_prerun_handler(task_id, task, *args, **kwargs):
    """Log when task starts."""
    logger.info(f"Task started: {task.name} [ID: {task_id}]")


@task_postrun.connect
def task_postrun_handler(task_id, task, *args, **kwargs):
    """Log when task completes."""
    logger.info(f"Task completed: {task.name} [ID: {task_id}]")


@task_failure.connect
def task_failure_handler(task_id, exception, *args, **kwargs):
    """Log when task fails."""
    logger.error(f"Task failed: [ID: {task_id}] - {exception}")


if __name__ == '__main__':
    celery_app.start()
