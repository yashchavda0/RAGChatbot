"""
SQLAlchemy database models for the RAG chatbot system.
All tables are created automatically on startup.
"""
from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, Float, Text, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()


# =============================================================================
# AGENT MODELS
# =============================================================================

class Agent(Base):
    """Agent registry table."""
    __tablename__ = "agents"

    agent_id = Column(String(255), primary_key=True)
    agent_name = Column(String(255), nullable=False)
    agent_type = Column(String(100), nullable=False)  # orchestration, execution, specialized
    description = Column(Text)
    capabilities = Column(JSON)  # List of agent capabilities
    input_schema = Column(JSON)  # Expected input schema
    output_schema = Column(JSON)  # Expected output schema
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class AgentExecution(Base):
    """Agent execution tracking table."""
    __tablename__ = "agent_executions"

    execution_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(255), index=True)
    agent_id = Column(String(255), index=True)
    input_data = Column(JSON)
    output_data = Column(JSON)
    status = Column(String(50))  # pending, running, completed, failed, cancelled
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)
    execution_time_ms = Column(Integer)
    error_message = Column(Text)
    metadata = Column(JSON)


# =============================================================================
# SESSION & CONVERSATION MODELS
# =============================================================================

class Session(Base):
    """User session table."""
    __tablename__ = "sessions"

    session_id = Column(String(255), primary_key=True)
    user_id = Column(String(255), index=True)
    created_at = Column(DateTime, default=func.now())
    last_activity = Column(DateTime, default=func.now(), onupdate=func.now())
    metadata = Column(JSON)
    is_active = Column(Boolean, default=True)


class ConversationMessage(Base):
    """Conversation message history table."""
    __tablename__ = "conversation_messages"

    message_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(255), index=True)
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    sources = Column(JSON)  # Source tracking
    agent_executions = Column(JSON)  # Link to agent executions
    workflow_execution_id = Column(String(36))  # Link to workflow execution
    timestamp = Column(DateTime, default=func.now(), index=True)
    metadata = Column(JSON)


# =============================================================================
# DOCUMENT MODELS
# =============================================================================

class Document(Base):
    """Document metadata table."""
    __tablename__ = "documents"

    document_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(255), index=True)
    filename = Column(String(255))
    file_type = Column(String(50))  # pdf, docx, txt, image
    file_size = Column(BigInteger)
    storage_path = Column(Text)
    metadata = Column(JSON)
    indexed_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class DocumentChunk(Base):
    """Document chunk tracking table."""
    __tablename__ = "document_chunks"

    chunk_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), index=True)
    chunk_index = Column(Integer)
    content = Column(Text)
    embedding_id = Column(String(255))  # Reference to Milvus
    embedding_models = Column(JSON)  # List of models used for this chunk
    metadata = Column(JSON)
    created_at = Column(DateTime, default=func.now())


# =============================================================================
# WORKFLOW & PLAN MODELS
# =============================================================================

class Workflow(Base):
    """Workflow definition table."""
    __tablename__ = "workflows"

    workflow_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_name = Column(String(255), nullable=False)
    workflow_type = Column(String(100))
    graph_definition = Column(JSON)  # DAG structure
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)


class WorkflowExecution(Base):
    """Workflow execution tracking table."""
    __tablename__ = "workflow_executions"

    execution_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String(36))
    session_id = Column(String(255), index=True)
    input_data = Column(JSON)
    output_data = Column(JSON)
    status = Column(String(50))
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)
    node_executions = Column(JSON)  # Track each node execution
    error_message = Column(Text)
    execution_time_ms = Column(Integer)


class Plan(Base):
    """Generated plan storage table."""
    __tablename__ = "plans"

    plan_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(255), index=True)
    user_query = Column(Text, nullable=False)
    intent = Column(String(100))
    plan_definition = Column(JSON)  # Task graph
    validation_status = Column(String(50))  # pending, validated, rejected
    validated_by = Column(String(255))  # Plan Validator Agent ID
    validation_notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class PlanExecution(Base):
    """Plan execution tracking table."""
    __tablename__ = "plan_executions"

    execution_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_id = Column(String(36))
    session_id = Column(String(255), index=True)
    status = Column(String(50))
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)
    execution_results = Column(JSON)
    error_message = Column(Text)


# =============================================================================
# SOURCE TRACKING MODELS
# =============================================================================

class Source(Base):
    """Source tracking table for citations."""
    __tablename__ = "sources"

    source_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_type = Column(String(100))  # document, web_search, ocr, url
    source_url = Column(Text)
    document_id = Column(String(36), index=True)
    chunk_id = Column(String(36))
    title = Column(String(255))
    snippet = Column(Text)
    relevance_score = Column(Float)
    metadata = Column(JSON)
    created_at = Column(DateTime, default=func.now())


# =============================================================================
# LOGGING MODELS
# =============================================================================

class AgentLog(Base):
    """Structured logging table for agent activities."""
    __tablename__ = "agent_logs"

    log_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    level = Column(String(20), index=True)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    agent_id = Column(String(255))
    execution_id = Column(String(36), index=True)
    session_id = Column(String(255), index=True)
    message = Column(Text)
    context = Column(JSON)
    timestamp = Column(DateTime, default=func.now(), index=True)


# =============================================================================
# DATABASE INITIALIZATION
# =============================================================================

def init_database(database_url: str):
    """
    Initialize the database by creating all tables.

    Args:
        database_url: PostgreSQL connection URL

    Returns:
        SQLAlchemy engine
    """
    from sqlalchemy import create_engine
    from config.logging_config import get_logger

    logger = get_logger(__name__)

    try:
        engine = create_engine(database_url, echo=False)

        # Create all tables
        Base.metadata.create_all(engine)

        logger.info("✓ Database tables created successfully")

        return engine

    except Exception as e:
        logger.error(f"✗ Error creating database tables: {e}")
        raise


def drop_all_tables(database_url: str):
    """
    Drop all tables (use with caution!).

    Args:
        database_url: PostgreSQL connection URL
    """
    from sqlalchemy import create_engine
    from config.logging_config import get_logger

    logger = get_logger(__name__)

    try:
        engine = create_engine(database_url, echo=False)

        # Drop all tables
        Base.metadata.drop_all(engine)

        logger.warning("⚠ All database tables dropped")

    except Exception as e:
        logger.error(f"✗ Error dropping database tables: {e}")
        raise
