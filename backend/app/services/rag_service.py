import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.utils.chunker import chunk_text

logger = logging.getLogger(__name__)


def _get_client() -> chromadb.ClientAPI:
    return chromadb.PersistentClient(
        path=settings.CHROMA_PERSIST_DIR,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def _get_embedding_function():
    """Returns a simple embedding function. Falls back to default (all-MiniLM) if no API key."""
    try:
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
        return SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    except Exception:
        return None


def ingest_artefact(
    artefact_id: str,
    project_id: str,
    pages: List[Dict[str, Any]],
) -> str:
    """
    Chunks and embeds artefact pages into ChromaDB.
    Returns the collection name.
    """
    client = _get_client()
    ef = _get_embedding_function()

    collection_name = f"artefact_{artefact_id.replace('-', '_')}"

    # Delete existing if re-indexing
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass

    kwargs = {"name": collection_name, "metadata": {"project_id": project_id}}
    if ef:
        kwargs["embedding_function"] = ef
    collection = client.get_or_create_collection(**kwargs)

    documents = []
    metadatas = []
    ids = []

    for page_data in pages:
        base_meta = {
            "artefact_id": artefact_id,
            "project_id": project_id,
            "page": page_data.get("page", 1),
            "section": page_data.get("section") or "",
        }
        chunks = chunk_text(page_data["text"], base_meta)
        for chunk in chunks:
            chunk_id = f"{artefact_id}_{chunk['metadata']['page']}_{chunk['metadata']['chunk_index']}"
            documents.append(chunk["text"])
            metadatas.append(chunk["metadata"])
            ids.append(chunk_id)

    if documents:
        # Batch upsert
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            collection.upsert(
                documents=documents[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size],
                ids=ids[i:i+batch_size],
            )

    # Also upsert into project-level collection
    project_collection_name = f"project_{project_id.replace('-', '_')}"
    try:
        proj_kwargs = {"name": project_collection_name, "metadata": {"project_id": project_id}}
        if ef:
            proj_kwargs["embedding_function"] = ef
        proj_collection = client.get_or_create_collection(**proj_kwargs)
        if documents:
            for i in range(0, len(documents), batch_size):
                proj_collection.upsert(
                    documents=documents[i:i+batch_size],
                    metadatas=metadatas[i:i+batch_size],
                    ids=ids[i:i+batch_size],
                )
    except Exception as e:
        logger.warning(f"Failed to update project collection: {e}")

    logger.info(f"Ingested {len(documents)} chunks for artefact {artefact_id}")
    return collection_name


def query_project(
    project_id: str,
    query: str,
    n_results: int = None,
    artefact_role_filter: Optional[List[str]] = None,
    artefact_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Queries the project-level ChromaDB collection.
    Returns list of {text, metadata, distance} dicts, ranked by similarity.
    """
    n_results = n_results or settings.RAG_TOP_K
    client = _get_client()
    ef = _get_embedding_function()

    project_collection_name = f"project_{project_id.replace('-', '_')}"

    try:
        kwargs = {"name": project_collection_name}
        if ef:
            kwargs["embedding_function"] = ef
        collection = client.get_or_create_collection(**kwargs)
    except Exception as e:
        logger.error(f"Failed to get project collection: {e}")
        return []

    where = None
    if artefact_ids:
        where = {"artefact_id": {"$in": artefact_ids}}

    try:
        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, collection.count() or 1),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        logger.error(f"ChromaDB query failed: {e}")
        return []

    chunks = []
    if results and results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({
                "text": doc,
                "metadata": meta,
                "distance": dist,
            })

    return chunks


def delete_artefact_from_chroma(artefact_id: str, project_id: str):
    """Removes artefact chunks from both artefact and project collections."""
    client = _get_client()

    # Delete artefact collection
    collection_name = f"artefact_{artefact_id.replace('-', '_')}"
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass

    # Remove from project collection
    project_collection_name = f"project_{project_id.replace('-', '_')}"
    try:
        ef = _get_embedding_function()
        kwargs = {"name": project_collection_name}
        if ef:
            kwargs["embedding_function"] = ef
        proj_collection = client.get_or_create_collection(**kwargs)
        proj_collection.delete(where={"artefact_id": artefact_id})
    except Exception as e:
        logger.warning(f"Failed to remove artefact from project collection: {e}")
