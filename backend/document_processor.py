from typing import List, Dict, Any
import pypdf
import docx
import json
from io import BytesIO
import uuid
from fastapi import UploadFile
from models import DocumentInfo
import fitz
import base64
from openai import OpenAI
import os
from graph_type import GraphState
from llm import get_llm, _extract_usage
from langchain_core.messages import HumanMessage
def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using PyMuPDF (fitz)"""
    try:
        doc = fitz.open(stream=file_content, filetype="pdf")
        text = ""
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text()
            if page_text.strip():  
                text += page_text + "\n"
        
        doc.close()
        return text.strip()
        
    except Exception as e:
        print(f"Error reading PDF with PyMuPDF: {e}")
        return ""

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        print(f"Error reading DOCX: {e}")
        return ""

def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from TXT file"""
    try:
        return file_content.decode('utf-8')
    except Exception as e:
        print(f"Error reading TXT: {e}")
        return ""

def extract_text_from_json(file_content: bytes) -> str:
    """Extract text from JSON file - returns raw JSON string for direct LLM input"""
    try:
        # Decode and return raw JSON string (not converted to text format)
        # This allows the full JSON content to be passed directly to LLM
        json_str = file_content.decode('utf-8')
        # Validate it's valid JSON by parsing it
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format: {e}")
        # Fallback: try to return as text if JSON parsing fails
        try:
            return file_content.decode('utf-8')
        except Exception as e2:
            print(f"Error decoding JSON file: {e2}")
            return ""
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return ""



async def process_uploaded_files_api(uploaded_files: List[UploadFile]) -> List[DocumentInfo]:
    """Process uploaded files and extract text content for API"""
    processed_docs = []
    import asyncio
    
    for file in uploaded_files:
        if file is not None:
            try:
                # Read file content
                file_content = await file.read()
                file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'txt'
                file_id = str(uuid.uuid4())
                
                
                text = ""
                if file_extension == 'pdf':
                    text = await asyncio.to_thread(extract_text_from_pdf, file_content)
                elif file_extension == 'docx':
                    text = await asyncio.to_thread(extract_text_from_docx, file_content)
                elif file_extension == 'txt':
                    text = extract_text_from_txt(file_content)  
                elif file_extension == 'json':
                    text = extract_text_from_json(file_content) 
                else:
                    text = extract_text_from_txt(file_content)  
                
                if text.strip():
                   
                    doc_info = DocumentInfo(
                        id=file_id,
                        filename=file.filename,
                        content=text,
                        file_type=file_extension,
                        file_url=f"uploaded/{file.filename}",  
                        size=len(file_content)
                    )
                    processed_docs.append(doc_info)
                else:
                    print(f"No text content found in {file.filename}")
                    
            except Exception as e:
                print(f"Error processing {file.filename}: {e}")
                continue
    
    return processed_docs

async def process_knowledge_base_files(uploaded_files: List[UploadFile]) -> List[DocumentInfo]:
    """Process knowledge base files and extract text content"""
    processed_docs = []
    import asyncio
    
    for file in uploaded_files:
        if file is not None:
            try:
                # Read file content
                file_content = await file.read()
                file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'txt'
                file_id = str(uuid.uuid4())
                text = ""
                if file_extension == 'pdf':
                    text = await asyncio.to_thread(extract_text_from_pdf, file_content)
                elif file_extension == 'docx':
                    text = await asyncio.to_thread(extract_text_from_docx, file_content)
                elif file_extension == 'txt':
                    text = extract_text_from_txt(file_content)  
                elif file_extension == 'json':
                    text = extract_text_from_json(file_content) 
                else:
                    text = extract_text_from_txt(file_content) 
                
                if text.strip():
                    doc_info = DocumentInfo(
                        id=file_id,
                        filename=file.filename,
                        content=text,
                        file_type=file_extension,
                        file_url=f"kb/{file.filename}",  
                        size=len(file_content)
                    )
                    processed_docs.append(doc_info)
                else:
                    print(f"No text content found in KB file {file.filename}")
                    
            except Exception as e:
                print(f"Error processing KB file {file.filename}: {e}")
                continue
    
    return processed_docs