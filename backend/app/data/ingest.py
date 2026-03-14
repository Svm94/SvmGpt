import os
from pypdf import PdfReader
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv
import shutil

load_dotenv()


# The size of text chunks to add to the DB at once
CHUNK_SIZE = 1000

def get_text_chunks(text, chunk_size):
    """Split text into uniform chunks."""
    chunks = []
    # Basic chunking by replacing newlines with spaces and slicing
    text = text.replace('\n', ' ')
    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i+chunk_size])
    return chunks

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
    return text

def ingest_data():
    """
    Reads PDFs and Text files from the knowledge-base directory,
    chunks them, and stores them in FAISS vector store.
    """
    kb_dir = os.path.join(os.path.dirname(__file__), "../../../knowledge-base")
    db_path = os.path.join(os.path.dirname(__file__), "../../../faiss_index")
    
    if not os.path.exists(kb_dir):
        print(f"Knowledge base directory {kb_dir} not found.")
        return

    print("Starting ingestion process...")
    
    all_docs = []
    chunk_idx = 0
    
    for filename in os.listdir(kb_dir):
        file_path = os.path.join(kb_dir, filename)
        text = ""
        
        print(f"Processing: {filename}")
        
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(file_path)
        elif filename.endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            continue
            
        chunks = get_text_chunks(text, CHUNK_SIZE)
        
        for c in chunks:
            if not c.strip():
                continue
            doc = Document(page_content=c, metadata={"source": filename, "chunk_id": chunk_idx})
            all_docs.append(doc)
            chunk_idx += 1
            
    if not all_docs:
        print("No readable documents found or files are empty.")
        return
        
    print(f"Adding {len(all_docs)} chunks to FAISS vector database...")
    
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    vector_store = FAISS.from_documents(all_docs, embeddings)
    
    # Save the index to disk
    vector_store.save_local(db_path)
    
    print("Ingestion complete. Database is ready for queries.")

if __name__ == "__main__":
    ingest_data()
