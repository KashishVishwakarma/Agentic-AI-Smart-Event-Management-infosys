from typing import List
from sqlalchemy.orm import Session
from .models import KnowledgeChunk, KnowledgeDocument

def retrieve_relevant_chunks(db: Session, query: str, top_k: int = 3) -> List[str]:
    """
    Retrieves the most relevant knowledge chunks for a given query
    using lightweight keyword scoring and fallback text search.
    """
    if not query or not query.strip():
        return []

    chunks = db.query(KnowledgeChunk).all()
    if not chunks:
        return []

    query_words = set(query.lower().split())
    scored_chunks = []

    for chunk in chunks:
        chunk_words = set(chunk.chunk_text.lower().split())
        overlap = len(query_words.intersection(chunk_words))
        if overlap > 0:
            scored_chunks.append((overlap, chunk.chunk_text))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    if scored_chunks:
        return [text for _, text in scored_chunks[:top_k]]

    # Fallback: Return first few chunks if no exact word overlap
    return [c.chunk_text for c in chunks[:top_k]]

def add_document_and_chunks(db: Session, title: str, content: str, chunk_size: int = 400):
    """
    Helper to chunk and store documents into the knowledge base.
    """
    doc = KnowledgeDocument(title=title, file_type="text")
    db.add(doc)
    db.commit()
    db.refresh(doc)

    words = content.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk_str = " ".join(words[i:i + chunk_size])
        chunk = KnowledgeChunk(
            document_id=doc.id,
            chunk_text=chunk_str,
            chunk_index=len(chunks)
        )
        chunks.append(chunk)

    db.bulk_save_objects(chunks)
    db.commit()
    return doc.id
