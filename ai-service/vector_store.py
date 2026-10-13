import chromadb

# Create a persistent ChromaDB database
client = chromadb.PersistentClient(
    path="./chroma_db"
)

# Create or access the study materials collection
collection = client.get_or_create_collection(
    name="study_materials"
)


def add_chunks(chunks, source_name):
    """Store text chunks in ChromaDB."""

    if not chunks:
        return 0

    ids = [
        f"{source_name}_{index}"
        for index in range(len(chunks))
    ]

    metadatas = [
        {
            "source": source_name,
            "chunk_index": index
        }
        for index in range(len(chunks))
    ]

    # Use upsert so rerunning won't cause duplicate-ID errors
    collection.upsert(
        ids=ids,
        documents=chunks,
        metadatas=metadatas
    )

    return len(chunks)



def search_chunks(query, number_of_results=3, source_name=None):
    """Find relevant chunks, optionally limited to one PDF."""

    total = collection.count()

    if total == 0:
        return []

    query_options = {
        "query_texts": [query],
        "n_results": min(number_of_results, total)
    }

    # If a PDF is selected, search only that PDF's chunks.
    if source_name:
        query_options["where"] = {"source": source_name}

        matching_ids = collection.get(
            where={"source": source_name},
            include=[]
        )["ids"]

        if not matching_ids:
            return []

        query_options["n_results"] = min(
            number_of_results, len(matching_ids)
        )

    results = collection.query(**query_options)

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]

    return [
        {
            "text": document,
            "source": metadata["source"],
            "chunk_index": metadata["chunk_index"]
        }
        for document, metadata in zip(documents, metadatas)
    ]
