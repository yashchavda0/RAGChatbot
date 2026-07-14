"""
SQLAlchemy database models for the RAG chatbot system.
All tables are created automatically on startup.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    JSON,
    Boolean,
    Float,
    Text,
    BigInteger,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import uuid

# Note: uuid is used for generating primary keys

Base = declarative_base()


# =============================================================================
# USER / AUTH MODELS
# =============================================================================


class User(Base):
    """User accounts for authentication."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String(50), default="free")  # free, pro, enterprise
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# =============================================================================
# CHATBOT MODELS (Multi-tenant RAG)
# =============================================================================


class Chatbot(Base):
    """Chatbot configuration table for multi-tenant RAG."""

    __tablename__ = "chatbots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    system_prompt = Column(
        Text,
        default="You are a helpful assistant. Answer based only on the provided context.",
    )
    status = Column(String(50), default="draft")  # draft, training, active, error
    embedding_model = Column(String(100), default="gemini-embedding-001")
    chunk_size = Column(Integer, default=1024)
    chunk_overlap = Column(Integer, default=50)
    web_search_threshold = Column(
        Float, default=0.6, nullable=False
    )  # Threshold for triggering web search fallback
    settings = Column(
        JSON, default=dict
    )  # Flexible settings: temperature, max_tokens, model, rate limits, security, etc.
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class ChatbotDocument(Base):
    """Documents associated with a chatbot's knowledge base."""

    __tablename__ = "chatbot_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chatbot_id = Column(String(36), index=True, nullable=False)
    filename = Column(String(255))
    source_type = Column(String(50))  # upload, url, text
    source_url = Column(Text)
    file_size = Column(BigInteger)
    status = Column(
        String(50), default="pending"
    )  # pending, processing, completed, error
    chunks_count = Column(Integer, default=0)
    error_message = Column(Text)
    parent_document_id = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime, default=func.now())
    processed_at = Column(DateTime)


class ChatbotCustomization(Base):
    """Widget customization settings for a chatbot."""

    __tablename__ = "chatbot_customizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chatbot_id = Column(String(36), index=True, nullable=False, unique=True)
    primary_color = Column(String(20), default="#5B5EFF")
    position = Column(String(20), default="bottom-right")
    size = Column(String(20), default="default")
    border_radius = Column(Integer, default=18)
    font_family = Column(String(50), default="Inter")
    greeting = Column(String(100), default="Hello!")
    welcome_message = Column(
        Text, default="How can I help you today? Feel free to ask any questions."
    )
    placeholder = Column(String(100), default="Type your message...")
    bot_name = Column(String(50), default="AI Assistant")
    avatar_url = Column(Text, nullable=True)
    auto_open = Column(Boolean, default=False)
    show_typing_indicator = Column(Boolean, default=True)
    collect_user_info = Column(Boolean, default=False)
    input_max_chars = Column(Integer, default=2000)
    button_text = Column(String(50), default="Chat with us")
    show_branding = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class ChatbotMetadata(Base):
    """Tracking metadata for chatbot training status."""

    __tablename__ = "chatbot_metadata"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chatbot_id = Column(String(36), index=True, nullable=False, unique=True)
    total_chunks = Column(Integer, default=0)
    total_documents = Column(Integer, default=0)
    training_progress = Column(Integer, default=0)  # 0-100
    last_trained_at = Column(DateTime)
    training_error = Column(Text)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# =============================================================================
# AGENT MODELS
# =============================================================================


class Agent(Base):
    """Agent registry table."""

    __tablename__ = "agents"

    agent_id = Column(String(255), primary_key=True)
    agent_name = Column(String(255), nullable=False)
    agent_type = Column(
        String(100), nullable=False
    )  # orchestration, execution, specialized
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

    execution_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id = Column(String(255), index=True)
    agent_id = Column(String(255), index=True)
    input_data = Column(JSON)
    output_data = Column(JSON)
    status = Column(String(50))  # pending, running, completed, failed, cancelled
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)
    execution_time_ms = Column(Integer)
    error_message = Column(Text)
    meta_data = Column(JSON)


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
    meta_data = Column(JSON)
    is_active = Column(Boolean, default=True)


class ConversationMessage(Base):
    """Conversation message history table."""

    __tablename__ = "conversation_messages"

    message_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(255), index=True)
    chatbot_id = Column(String(36), index=True)  # Multi-tenant chatbot identifier
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    sources = Column(JSON)  # Source tracking
    agent_executions = Column(JSON)  # Link to agent executions
    workflow_execution_id = Column(String(36))  # Link to workflow execution
    timestamp = Column(DateTime, default=func.now(), index=True)
    meta_data = Column(JSON)


# =============================================================================
# DOCUMENT MODELS
# =============================================================================


class Document(Base):
    """Document metadata table."""

    __tablename__ = "documents"

    document_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id = Column(String(255), index=True)
    filename = Column(String(255))
    file_type = Column(String(50))  # pdf, docx, txt, image
    file_size = Column(BigInteger)
    storage_path = Column(Text)
    meta_data = Column(JSON)
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
    meta_data = Column(JSON)
    created_at = Column(DateTime, default=func.now())


# =============================================================================
# WORKFLOW & PLAN MODELS
# =============================================================================


class Workflow(Base):
    """Workflow definition table."""

    __tablename__ = "workflows"

    workflow_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
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

    execution_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
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

    execution_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
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
    meta_data = Column(JSON)
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


def init_database():
    """
    Initialize the database by creating all tables using the shared engine.

    Returns:
        SQLAlchemy engine
    """
    from services.postgres_service import get_postgres_service
    from config.logging_config import get_logger

    logger = get_logger(__name__)

    try:
        pg = get_postgres_service()
        Base.metadata.create_all(pg.engine)

        logger.info("Database tables created successfully")

        # Run migrations to update existing tables
        try:
            from migrations import run_all_migrations

            run_all_migrations(pg.engine)
        except Exception as migration_error:
            logger.warning(f"Error running migrations (non-fatal): {migration_error}")

        return pg.engine

    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise
