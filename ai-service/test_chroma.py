from vector_store import add_chunks, search_chunks

# Sample study material
chunks = [
    "Machine learning is a subset of artificial intelligence.",
    "Supervised learning uses labelled training data.",
    "Unsupervised learning discovers patterns in data without labels."
]

# Store chunks
count = add_chunks(
    chunks,
    "test_material.pdf"
)

print("Chunks stored:", count)

# Search for relevant information
question = "What is supervised learning?"

results = search_chunks(question)

print("\nQuestion:", question)
print("\nRelevant results:")

for result in results:
    print("Source:", result["source"])
    print("Text:", result["text"])
    print("---")