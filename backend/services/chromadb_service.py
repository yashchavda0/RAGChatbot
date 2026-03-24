"""
ChromaDB vector database service for storing and searching document embeddings.
Lightweight alternative to Milvus - runs embedded, no Docker required.
"""
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions
import os
from config.logging_config import get_logger

logger = get_logger(__name__)


class ChromaDBService:
    """
    Service for interacting with ChromaDB vector database.
    Drop-in replacement for MilvusService with the same interface.
    """

    def __init__(
        self,
        persist_directory: str = "./data/chromadb",
        collection_name: str = "document_embeddings",
    ):
        """Initialize ChromaDB service."""
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.collection = None

        # Ensure persist directory exists
        os.makedirs(persist_directory, exist_ok=True)

        self._connect()
        logger.info(
            f"ChromaDB service initialized (persist_dir: {persist_directory}, "
            f"collection: {collection_name})"
        )

    def _connect(self) -> None:
        """Initialize ChromaDB client and collection."""
        try:
            # Create persistent client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                )
            )

            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )

            logger.info(f"Connected to ChromaDB, collection: {self.collection_name}")

        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            raise

    async def insert_embeddings(
        self,
        embeddings: List[List[float]],
        document_id: str,
        chunks: List[str],
        embedding_model: str,
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        """
        Insert document embeddings into ChromaDB.

        Args:
            embeddings: List of embedding vectors
            document_id: Document identifier
            chunks: List of text chunks
            embedding_model: Name of embedding model used
            metadata: Optional metadata for each chunk

        Returns:
            List of inserted entity IDs
        """
        try:
            ids = []
            metadatas = []

            for i, (emb, chunk) in enumerate(zip(embeddings, chunks)):
                # ID format: {document_id}_{chunk_index}_{model_name}
                entity_id = f"{document_id}_{i}_{embedding_model}"
                ids.append(entity_id)

                # Build metadata
                meta = {
                    "document_id": document_id,
                    "chunk_index": i,
                    "embedding_model": embedding_model,
                }
                if metadata and i < len(metadata):
                    meta.update(metadata[i])
                metadatas.append(meta)

            # Add to collection
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
            )

            logger.info(
                f"Inserted {len(ids)} embeddings for document {document_id} "
                f"using {embedding_model}"
            )

            return ids

        except Exception as e:
            logger.error(f"Error inserting embeddings: {e}")
            raise

    async def search(
        self,
        query_embedding: List[float],
        embedding_model: Optional[str] = None,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.

        Args:
            query_embedding: Query embedding vector
            embedding_model: Filter by embedding model
            top_k: Number of results to return
            filters: Optional filters for search

        Returns:
            List of search results with scores
        """
        try:
            # Build where filter
            where_filter = None
            if embedding_model:
                where_filter = {"embedding_model": embedding_model}

            if filters and filters.get("document_id"):
                doc_filter = {"document_id": filters["document_id"]}
                if where_filter:
                    # ChromaDB uses $and for multiple conditions
                    where_filter = {"$and": [where_filter, doc_filter]}
                else:
                    where_filter = doc_filter

            # Execute search
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )

            # Format results to match MilvusService format
            formatted_results = []

            if results and results["ids"] and results["ids"][0]:
                for i, doc_id in enumerate(results["ids"][0]):
                    # Convert distance to similarity score (1 - distance for cosine)
                    distance = results["distances"][0][i] if results.get("distances") else 0
                    score = 1 - distance  # Convert cosine distance to similarity

                    meta = results["metadatas"][0][i] if results.get("metadatas") else {}

                    formatted_results.append({
                        "id": doc_id,
                        "score": score,
                        "document_id": meta.get("document_id", ""),
                        "chunk_index": meta.get("chunk_index", 0),
                        "content": results["documents"][0][i] if results.get("documents") else "",
                        "embedding_model": meta.get("embedding_model", ""),
                        "metadata": meta,
                    })

            logger.info(
                f"Search returned {len(formatted_results)} results "
                f"(model: {embedding_model})"
            )

            return formatted_results

        except Exception as e:
            logger.error(f"Error searching ChromaDB: {e}")
            raise

    async def delete_document(self, document_id: str) -> int:
        """
        Delete all embeddings for a document.

        Args:
            document_id: Document to delete

        Returns:
            Number of entities deleted
        """
        try:
            # Get all IDs for this document
            results = self.collection.get(
                where={"document_id": document_id},
            )

            count = len(results["ids"]) if results["ids"] else 0

            if count > 0:
                self.collection.delete(ids=results["ids"])

            logger.info(f"Deleted document {document_id} from ChromaDB ({count} chunks)")

            return count

        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            raise

    async def get_document_count(self) -> int:
        """Get total number of entities in the collection."""
        try:
            return self.collection.count()
        except Exception as e:
            logger.error(f"Error getting document count: {e}")
            return 0

    async def get_stats(self) -> Dict[str, Any]:
        """Get collection statistics."""
        try:
            stats = {
                "name": self.collection_name,
                "count": self.collection.count(),
                "persist_directory": self.persist_directory,
            }
            return stats
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}

    async def reset(self) -> None:
        """Reset the collection (delete all data)."""
        try:
            self.client.delete_collection(self.collection_name)
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"Reset collection: {self.collection_name}")
        except Exception as e:
            logger.error(f"Error resetting collection: {e}")
            raise


# Global ChromaDB service instance
_chromadb_service: Optional[ChromaDBService] = None


def get_chromadb_service() -> ChromaDBService:
    """Get or create the global ChromaDB service instance."""
    global _chromadb_service
    if _chromadb_service is None:
        _chromadb_service = ChromaDBService()
    return _chromadb_service
