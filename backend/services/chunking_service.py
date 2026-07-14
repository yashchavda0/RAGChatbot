"""
Chunking service for splitting text into manageable chunks for vector storage.
Default: 1024 characters with 50 character overlap.
"""
from typing import List, Dict, Any, Optional
from config.logging_config import get_logger

logger = get_logger(__name__)


class ChunkingService:
    """
    Service for splitting text into chunks.

    Uses recursive character text splitting optimized for RAG:
    - Default chunk size: 1024 characters
    - Default overlap: 50 characters
    - Split order: paragraph > sentence > word > character
    """

    def __init__(
        self,
        chunk_size: int = 1024,
        chunk_overlap: int = 50,
    ):
        """
        Initialize the chunking service.

        Args:
            chunk_size: Maximum characters per chunk (default: 1024)
            chunk_overlap: Characters to overlap between chunks (default: 50)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Split separators in order of preference
        self.separators = [
            "\n\n\n",  # Triple newline (major section break)
            "\n\n",    # Double newline (paragraph break)
            "\n",      # Single newline
            ". ",      # Sentence end
            "! ",      # Exclamation
            "? ",      # Question
            "; ",      # Semicolon
            ", ",      # Comma
            " ",       # Space
            "",        # Character
        ]

        logger.info(f"ChunkingService initialized (size: {chunk_size}, overlap: {chunk_overlap})")

    def split_text(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Split text into chunks.

        Args:
            text: Text to split
            metadata: Optional metadata to include with each chunk

        Returns:
            List of chunk dictionaries with content and metadata
        """
        if not text or not text.strip():
            return []

        # Clean the text
        text = self._clean_text(text)

        # Split into chunks
        raw_chunks = self._split_by_separators(text)

        # Create chunk objects with metadata
        chunks = []
        for i, chunk_content in enumerate(raw_chunks):
            chunk = {
                "chunk_index": i,
                "content": chunk_content,
                "char_count": len(chunk_content),
                "metadata": metadata or {},
            }
            chunks.append(chunk)

        logger.info(f"Split text into {len(chunks)} chunks (avg size: {sum(len(c['content']) for c in chunks) // max(len(chunks), 1)})")

        return chunks

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove excessive whitespace
        import re
        text = re.sub(r'\n{4,}', '\n\n\n', text)  # Max 3 consecutive newlines
        text = re.sub(r' {2,}', ' ', text)        # Max 1 consecutive space
        return text.strip()

    def _split_by_separators(self, text: str) -> List[str]:
        """
        Split text recursively using separators.

        Args:
            text: Text to split

        Returns:
            List of text chunks
        """
        chunks = []
        current_chunk = ""

        # Try to split by largest separators first
        paragraphs = text.split("\n\n")

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # If paragraph fits, add it
            if len(current_chunk) + len(para) + 2 <= self.chunk_size:
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
            else:
                # Save current chunk if not empty
                if current_chunk:
                    chunks.append(current_chunk)
                    # Start new chunk with overlap
                    current_chunk = self._get_overlap_text(current_chunk)

                # If paragraph itself is too large, split it further
                if len(para) > self.chunk_size:
                    sub_chunks = self._split_large_text(para)
                    for sub in sub_chunks:
                        if len(current_chunk) + len(sub) <= self.chunk_size:
                            if current_chunk:
                                current_chunk += " " + sub
                            else:
                                current_chunk = sub
                        else:
                            if current_chunk:
                                chunks.append(current_chunk)
                            current_chunk = sub
                else:
                    current_chunk = para

        # Don't forget the last chunk
        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    def _split_large_text(self, text: str) -> List[str]:
        """
        Split large text that doesn't fit in a single chunk.

        Args:
            text: Text that exceeds chunk_size

        Returns:
            List of smaller text pieces
        """
        pieces = []

        # Try sentence-level splitting
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)

        current = ""
        for sentence in sentences:
            if len(current) + len(sentence) + 1 <= self.chunk_size:
                if current:
                    current += " " + sentence
                else:
                    current = sentence
            else:
                if current:
                    pieces.append(current)
                current = self._get_overlap_text(current) if current else ""

                # If single sentence is too long, split by words
                if len(sentence) > self.chunk_size:
                    words = sentence.split()
                    word_chunk = ""
                    for word in words:
                        if len(word_chunk) + len(word) + 1 <= self.chunk_size:
                            if word_chunk:
                                word_chunk += " " + word
                            else:
                                word_chunk = word
                        else:
                            if word_chunk:
                                pieces.append(word_chunk)
                            word_chunk = word
                    if word_chunk:
                        current = word_chunk
                else:
                    current = sentence

        if current:
            pieces.append(current)

        return pieces

    def _get_overlap_text(self, text: str) -> str:
        """
        Get the overlap portion from the end of a chunk.

        Args:
            text: Current chunk text

        Returns:
            Overlap text for next chunk
        """
        if len(text) <= self.chunk_overlap:
            return text

        overlap = text[-self.chunk_overlap:]

        # Try to start at a word boundary
        space_idx = overlap.find(" ")
        if space_idx > 0:
            overlap = overlap[space_idx + 1:]

        return overlap

    def split_documents(
        self,
        documents: List[Dict[str, Any]],
        chatbot_id: str,
        document_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Split multiple documents into chunks.

        Args:
            documents: List of documents with 'content' and 'metadata' keys
            chatbot_id: Chatbot ID for filtering
            document_id: Document ID for tracking

        Returns:
            List of all chunks from all documents
        """
        all_chunks = []

        for doc_idx, doc in enumerate(documents):
            content = doc.get("content", "")
            metadata = doc.get("metadata", {})

            # Add chatbot and document info to metadata
            metadata["chatbot_id"] = chatbot_id
            metadata["document_id"] = document_id

            chunks = self.split_text(content, metadata)
            all_chunks.extend(chunks)

        logger.info(
            f"Split {len(documents)} documents into {len(all_chunks)} total chunks "
            f"(chatbot: {chatbot_id})"
        )

        return all_chunks


def get_chunking_service(
    chunk_size: int = 1024,
    chunk_overlap: int = 50,
) -> ChunkingService:
    """
    Create a chunking service instance.

    Args:
        chunk_size: Maximum characters per chunk
        chunk_overlap: Characters to overlap

    Returns:
        ChunkingService instance
    """
    return ChunkingService(chunk_size, chunk_overlap)
