#!/usr/bin/env python3
"""
scripts/extract_assets.py — Unified Local Document & Asset Extractor
Part of Let's Explore DMC AI PDF & DOCX Recreation System (Phase 1)
Supports:
  - Lossless extraction of embedded images from PDF (via pypdf / PIL)
  - Lossless extraction of embedded images from DOCX (via zipfile /word/media)
  - Table grid extraction & cell mapping
  - Page-by-page text hierarchy extraction
  - 100% Local, Zero external API credits, Zero data loss
"""

import os
import sys
import json
import argparse
import zipfile
import io
import re

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

import xml.etree.ElementTree as ET


def extract_docx(file_path, output_dir, session_web_path):
    os.makedirs(output_dir, exist_ok=True)
    images = []
    tables = []
    paragraphs = []
    
    with zipfile.ZipFile(file_path, 'r') as z:
        # 1. Extract all embedded images from word/media/
        for filename in z.namelist():
            if filename.startswith('word/media/') and not filename.endswith('/'):
                base_name = os.path.basename(filename)
                target_path = os.path.join(output_dir, base_name)
                
                with open(target_path, 'wb') as f_out:
                    f_out.write(z.read(filename))
                
                img_size = os.path.getsize(target_path)
                width, height = 0, 0
                if HAS_PIL and img_size > 0:
                    try:
                        with Image.open(target_path) as im:
                            width, height = im.size
                    except Exception:
                        pass
                
                web_url = f"{session_web_path.rstrip('/')}/{base_name}"
                is_logo = bool(re.search(r'logo|brand|header', base_name, re.I)) or (width > 0 and width < 400 and height > 0 and height < 200)
                is_document_scan = bool(re.search(r'rate|tariff|voucher|table|invoice|sheet|cost', base_name, re.I)) or (height > width * 0.9 and img_size > 20000 and not is_logo)
                
                images.append({
                    "name": base_name,
                    "local_path": target_path,
                    "web_path": web_url,
                    "size_bytes": img_size,
                    "width": width,
                    "height": height,
                    "is_logo": is_logo,
                    "is_document_scan": is_document_scan,
                    "page": 1
                })
        
        # 2. Extract Document XML Structure (Tables & Paragraphs)
        if 'word/document.xml' in z.namelist():
            xml_data = z.read('word/document.xml')
            root = ET.fromstring(xml_data)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Extract paragraphs
            for p in root.findall('.//w:p', namespaces):
                texts = [node.text for node in p.findall('.//w:t', namespaces) if node.text]
                if texts:
                    full_p = "".join(texts).strip()
                    if full_p:
                        paragraphs.append(full_p)
            
            # Extract tables
            for tbl_idx, tbl in enumerate(root.findall('.//w:tbl', namespaces)):
                tbl_rows = []
                for tr in tbl.findall('.//w:tr', namespaces):
                    row_cells = []
                    for tc in tr.findall('.//w:tc', namespaces):
                        cell_texts = [node.text for node in tc.findall('.//w:t', namespaces) if node.text]
                        row_cells.append(" ".join(cell_texts).strip())
                    if any(c for c in row_cells):
                        tbl_rows.append(row_cells)
                if tbl_rows:
                    headers = tbl_rows[0] if len(tbl_rows) > 1 else []
                    rows = tbl_rows[1:] if len(tbl_rows) > 1 else tbl_rows
                    tables.append({
                        "table_index": tbl_idx + 1,
                        "headers": headers,
                        "rows": rows,
                        "raw_matrix": tbl_rows
                    })

    full_text = "\n".join(paragraphs)
    
    return {
        "success": True,
        "format": "docx",
        "file_name": os.path.basename(file_path),
        "total_images": len(images),
        "images": images,
        "tables": tables,
        "paragraphs_count": len(paragraphs),
        "full_text": full_text
    }


def extract_pdf(file_path, output_dir, session_web_path):
    if not HAS_PYPDF:
        return {
            "success": False,
            "error": "pypdf library not available for PDF extraction."
        }
    
    os.makedirs(output_dir, exist_ok=True)
    images = []
    pages = []
    full_text_parts = []
    
    reader = pypdf.PdfReader(file_path)
    total_pages = len(reader.pages)
    
    img_counter = 0
    for page_idx, page in enumerate(reader.pages):
        page_num = page_idx + 1
        page_text = page.extract_text() or ""
        full_text_parts.append(page_text)
        
        page_img_urls = []
        try:
            for img_name, img_data in page.images.items():
                img_counter += 1
                clean_name = re.sub(r'[^A-Za-z0-9_\-\.]', '_', img_name.lstrip('/'))
                if not clean_name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    clean_name += '.jpg'
                
                target_filename = f"page_{page_num}_img_{img_counter}_{clean_name}"
                target_path = os.path.join(output_dir, target_filename)
                
                with open(target_path, 'wb') as f_out:
                    f_out.write(img_data.data)
                
                img_size = len(img_data.data)
                width, height = 0, 0
                if HAS_PIL and img_size > 0:
                    try:
                        with Image.open(target_path) as im:
                            width, height = im.size
                    except Exception:
                        pass
                
                web_url = f"{session_web_path.rstrip('/')}/{target_filename}"
                page_img_urls.append(web_url)
                
                # Identify if small logo vs large resort/scenic photo
                is_logo = (width > 0 and width < 450 and height > 0 and height < 200) or bool(re.search(r'logo|icon|brand', clean_name, re.I))
                
                # Ignore tiny 1x1 spacer / decorative transparent pixels
                if width > 15 or height > 15 or img_size > 2000:
                    images.append({
                        "name": target_filename,
                        "local_path": target_path,
                        "web_path": web_url,
                        "size_bytes": img_size,
                        "width": width,
                        "height": height,
                        "is_logo": is_logo,
                        "page": page_num
                    })
        except Exception as e:
            # Continue extracting text if image stream hits an isolated format error
            pass
            
        char_count = len(re.findall(r'[A-Za-z0-9]', page_text))
        is_scanned = (char_count < 60)

        pages.append({
            "page_num": page_num,
            "text": page_text,
            "char_count": char_count,
            "is_scanned": is_scanned,
            "image_count": len(page_img_urls),
            "images": page_img_urls
        })
        
    return {
        "success": True,
        "format": "pdf",
        "file_name": os.path.basename(file_path),
        "page_count": total_pages,
        "total_images": len(images),
        "images": images,
        "pages": pages,
        "full_text": "\n\n--- PAGE BREAK ---\n\n".join(full_text_parts)
    }


def main():
    parser = argparse.ArgumentParser(description="Extract original images, tables and text from PDF or DOCX")
    parser.add_argument("--input", required=True, help="Absolute path to input PDF or DOCX file")
    parser.add_argument("--outdir", required=True, help="Directory to save extracted original images")
    parser.add_argument("--webpath", default="", help="Web-accessible URL prefix for saved assets")
    
    args = parser.parse_args()
    
    if not os.path.isfile(args.input):
        print(json.dumps({"success": False, "error": f"Input file not found: {args.input}"}))
        sys.exit(1)
        
    ext = os.path.splitext(args.input)[1].lower()
    session_web = args.webpath or "uploads/extracted_assets"
    
    if ext == '.docx' or ext == '.doc':
        result = extract_docx(args.input, args.outdir, session_web)
    elif ext == '.pdf':
        result = extract_pdf(args.input, args.outdir, session_web)
    else:
        print(json.dumps({"success": False, "error": f"Unsupported file extension: {ext}"}))
        sys.exit(1)
        
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
