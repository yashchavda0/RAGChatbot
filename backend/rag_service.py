import os
import uuid
import asyncio
import ipaddress
import socket
from typing import List, Dict, Any
from urllib.parse import urlparse
import chromadb
from chromadb.config import Settings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from langchain.llms import OpenAI
from langchain.chains import RetrievalQA
from langchain.docstore.document import Document
import PyPDF2
from docx import Document as DocxDocument
import requests
import io

# SSRF protection - blocked IP ranges
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),  # AWS metadata / cloud metadata
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("224.0.0.0/4"),  # Multicast
    ipaddress.ip_network("240.0.0.0/4"),  # Reserved
]

ALLOWED_SCHEMES = {"http", "https"}


def validate_url(url: str) -> str:
    """
    Validate URL to prevent SSRF attacks.

    Args:
        url: URL to validate

    Returns:
        Validated URL

    Raises:
        ValueError: If URL is invalid or points to blocked resource
    """
    try:
        parsed = urlparse(url)

        # Check scheme
        if parsed.scheme.lower() not in ALLOWED_SCHEMES:
            raise ValueError(f"URL scheme '{parsed.scheme}' is not allowed. Only HTTP/HTTPS are permitted.")

        # Check hostname exists
        hostname = parsed.hostname
        if not hostname:
            raise ValueError("URL must contain a valid hostname")

        # Resolve hostname to IP and check if blocked
        try:
            # Get all IP addresses for the hostname
            addr_info = socket.getaddrinfo(hostname, None)
            for family, socktype, proto, canonname, sockaddr in addr_info:
                ip = ipaddress.ip_address(sockaddr[0])

                # Check if IP is in blocked networks
                for network in BLOCKED_IP_NETWORKS:
                    if ip in network:
                        raise ValueError(f"URL resolves to blocked IP address: {ip}")
        except socket.gaierror:
            raise ValueError(f"Could not resolve hostname: {hostname}")

        return url

    except Exception as e:
        if "not allowed" in str(e) or "blocked" in str(e) or "resolve" in str(e):
            raise
        raise ValueError(f"Invalid URL: {str(e)}")

class RAGService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        self.chroma_client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(anonymized_telemetry=False)
        )
        
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        self.llm = OpenAI(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
        
        self.vectorstore = Chroma(
            client=self.chroma_client,
            collection_name="documents",
            embedding_function=self.embeddings
        )
        
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vectorstore.as_retriever(search_kwargs={"k": 3}),
            return_source_documents=True
        )

    async def process_document(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        document_id = str(uuid.uuid4())
        
        text = await self._extract_text(file_content, filename)
        chunks = self.text_splitter.split_text(text)
        
        documents = []
        ids = []
        metadatas = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{document_id}_{i}"
            documents.append(chunk)
            ids.append(chunk_id)
            metadatas.append({
                "document_id": document_id,
                "filename": filename,
                "chunk_index": i,
                "source": filename
            })
        
        self.collection.add(
            documents=documents,
            ids=ids,
            metadatas=metadatas
        )
        
        return {
            "message": "Document processed successfully",
            "document_id": document_id,
            "chunks_created": len(chunks)
        }

    async def process_url(self, url: str) -> Dict[str, Any]:
        try:
            # Validate URL to prevent SSRF attacks
            validated_url = validate_url(url)

            # Use timeout to prevent hanging connections
            response = requests.get(validated_url, timeout=30)
            response.raise_for_status()

            if validated_url.endswith('.pdf'):
                content = response.content
                filename = validated_url.split('/')[-1] or "document.pdf"
                return await self.process_document(content, filename)
            else:
                text = response.text
                document_id = str(uuid.uuid4())
                chunks = self.text_splitter.split_text(text)

                documents = []
                ids = []
                metadatas = []

                for i, chunk in enumerate(chunks):
                    chunk_id = f"{document_id}_{i}"
                    documents.append(chunk)
                    ids.append(chunk_id)
                    metadatas.append({
                        "document_id": document_id,
                        "filename": validated_url,
                        "chunk_index": i,
                        "source": validated_url
                    })

                self.collection.add(
                    documents=documents,
                    ids=ids,
                    metadatas=metadatas
                )

                return {
                    "message": "URL content processed successfully",
                    "document_id": document_id,
                    "chunks_created": len(chunks)
                }

        except ValueError as e:
            # Re-raise validation errors
            raise Exception(f"URL validation failed: {str(e)}")
        except requests.exceptions.Timeout:
            raise Exception("URL request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching URL: {str(e)}")
        except Exception as e:
            raise Exception(f"Error processing URL: {str(e)}")

    async def _extract_text(self, file_content: bytes, filename: str) -> str:
        try:
            if filename.endswith('.pdf'):
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                return text
            
            elif filename.endswith('.docx'):
                doc = DocxDocument(io.BytesIO(file_content))
                text = ""
                for paragraph in doc.paragraphs:
                    text += paragraph.text + "\n"
                return text
            
            elif filename.endswith('.txt'):
                return file_content.decode('utf-8')
            
            else:
                raise Exception(f"Unsupported file type: {filename}")
                
        except Exception as e:
            raise Exception(f"Error extracting text from {filename}: {str(e)}")

    async def chat(self, message: str, session_id: str = "default") -> Dict[str, Any]:
        try:
            result = self.qa_chain({"query": message})
            
            sources = []
            if result.get("source_documents"):
                sources = [doc.metadata.get("source", "Unknown") for doc in result["source_documents"]]
            
            return {
                "response": result["result"],
                "sources": list(set(sources))
            }
            
        except Exception as e:
            return {
                "response": f"I'm sorry, I encountered an error: {str(e)}",
                "sources": []
            }

    async def list_documents(self) -> List[Dict[str, Any]]:
        try:
            results = self.collection.get()
            
            documents = {}
            for metadata in results["metadatas"]:
                doc_id = metadata["document_id"]
                if doc_id not in documents:
                    documents[doc_id] = {
                        "document_id": doc_id,
                        "filename": metadata["filename"],
                        "chunks": 0
                    }
                documents[doc_id]["chunks"] += 1
            
            return list(documents.values())
            
        except Exception as e:
            raise Exception(f"Error listing documents: {str(e)}")

    async def delete_document(self, document_id: str):
        try:
            results = self.collection.get(
                where={"document_id": document_id}
            )
            
            if results["ids"]:
                self.collection.delete(ids=results["ids"])
            else:
                raise Exception("Document not found")
                
        except Exception as e:
            raise Exception(f"Error deleting document: {str(e)}")