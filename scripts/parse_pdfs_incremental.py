#!/usr/bin/env python3
"""
Incremental PDF parser - processes PDFs one at a time and saves after each.
Avoids memory issues with large batch processing.
"""

import json
import os
import re
import gc
from datetime import datetime
from pathlib import Path
from typing import Optional

# Paths
KB_DIR = Path.home() / 'clawd' / 'shorttrack-knowledge-base'
PDF_DIR = KB_DIR / 'raw_data' / 'uss_pdfs'
OUTPUT_PATH = KB_DIR / 'processed_data' / 'uss_all_results.json'

def parse_time(time_str: str) -> Optional[str]:
    """Normalize time format."""
    if not time_str:
        return None
    
    time_str = time_str.strip()
    
    # Skip non-time entries
    if any(x in time_str.upper() for x in ['DNS', 'DNF', 'DQ', 'ADV', 'PEN', 'YC', 'RC']):
        return time_str.upper()
    
    # Already in good format
    if re.match(r'^\d{1,2}:\d{2}\.\d{2,3}$', time_str):
        return time_str
    if re.match(r'^\d{1,2}\.\d{2,3}$', time_str):
        return time_str
    
    return time_str if time_str else None

def extract_distance(text: str) -> Optional[int]:
    """Extract distance from text."""
    match = re.search(r'(\d{3,4})\s*[mM]', text)
    if match:
        return int(match.group(1))
    return None

def extract_category(text: str) -> Optional[str]:
    """Extract category/class from text."""
    patterns = [
        r'(JUNIOR\s+[A-G])',
        r'(SENIOR\s+(?:MEN|WOMEN))',
        r'(MASTERS?\s+(?:MEN|WOMEN)\s*\d*)',
        r'(DIVISION\s+\d+)',
        r'(NOVICE\s+[AB])',
        r'((?:MEN|WOMEN|BOYS|GIRLS))',
    ]
    for p in patterns:
        match = re.search(p, text, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    return None

def parse_pdf(filepath: Path, comp_name: str, comp_date: str) -> list[dict]:
    """Parse a single PDF and extract results."""
    import pdfplumber
    
    results = []
    
    try:
        with pdfplumber.open(filepath) as pdf:
            current_distance = None
            current_category = None
            
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                
                for line in text.split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Check for distance header
                    dist = extract_distance(line)
                    if dist and dist in [222, 333, 500, 777, 1000, 1500, 3000]:
                        current_distance = dist
                        cat = extract_category(line)
                        if cat:
                            current_category = cat
                        continue
                    
                    # Check for category header
                    cat = extract_category(line)
                    if cat and not re.match(r'^\d', line):
                        current_category = cat
                        continue
                    
                    # Try to parse as result line (starts with place number)
                    match = re.match(r'^(\d{1,3})\.?\s+(.+)', line)
                    if match and current_distance:
                        place = int(match.group(1))
                        rest = match.group(2)
                        
                        # Find time (last number with decimal)
                        time_match = re.search(r'(\d{1,2}:\d{2}\.\d{2,3}|\d{1,2}\.\d{2,3})\s*$', rest)
                        if time_match:
                            time_str = parse_time(time_match.group(1))
                            name_part = rest[:time_match.start()].strip()
                            
                            # Extract name (remove bib numbers, club codes)
                            name_parts = name_part.split()
                            name_tokens = [p for p in name_parts if not p.isdigit() and len(p) > 3]
                            name = ' '.join(name_tokens[:3]) if name_tokens else name_part
                            
                            if name and time_str:
                                results.append({
                                    'rank': place,
                                    'skater': name,
                                    'time': time_str,
                                    'distance': f"{current_distance}m",
                                    'category': current_category or 'Unknown',
                                    'competition': comp_name,
                                    'date': comp_date,
                                })
    
    except Exception as e:
        print(f"    Error parsing {filepath.name}: {e}")
    
    return results

def get_pdf_date(filename: str) -> Optional[str]:
    """Extract date from filename or return None."""
    # Try to match date patterns in filename
    patterns = [
        r'(\d{4})-(\d{2})-(\d{2})',  # YYYY-MM-DD
        r'(\d{4})_(\d{2})_(\d{2})',  # YYYY_MM_DD
    ]
    
    for p in patterns:
        match = re.search(p, filename)
        if match:
            return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    
    # Try to extract year
    year_match = re.search(r'(20\d{2})', filename)
    if year_match:
        return f"{year_match.group(1)}-01-01"
    
    return None

def main():
    print("=" * 60)
    print("Incremental PDF Parser")
    print("=" * 60)
    
    # Get all PDFs
    pdfs = sorted(PDF_DIR.glob('*.pdf'))
    print(f"Found {len(pdfs)} PDFs to parse")
    
    # Load existing results if any
    all_results = []
    all_competitions = []
    processed_pdfs = set()
    
    if OUTPUT_PATH.exists():
        try:
            with open(OUTPUT_PATH) as f:
                existing = json.load(f)
            all_results = existing.get('results', [])
            all_competitions = existing.get('competitions', [])
            processed_pdfs = {c['name'] for c in all_competitions}
            print(f"Loaded {len(all_results)} existing results from {len(all_competitions)} competitions")
        except:
            pass
    
    # Process each PDF
    for i, pdf_path in enumerate(pdfs):
        comp_name = pdf_path.stem.replace('_', ' ')
        
        # Skip if already processed
        if comp_name in processed_pdfs:
            print(f"  [{i+1}/{len(pdfs)}] Skip (exists): {comp_name[:50]}")
            continue
        
        comp_date = get_pdf_date(pdf_path.name)
        
        print(f"  [{i+1}/{len(pdfs)}] Parsing: {comp_name[:50]}...", end='', flush=True)
        
        results = parse_pdf(pdf_path, comp_name, comp_date)
        
        if results:
            all_results.extend(results)
            all_competitions.append({
                'name': comp_name,
                'date': comp_date,
                'result_count': len(results)
            })
            processed_pdfs.add(comp_name)
            print(f" {len(results)} results")
            
            # Save after every 10 PDFs
            if (i + 1) % 10 == 0:
                save_results(all_results, all_competitions)
                gc.collect()  # Force garbage collection
        else:
            print(" 0 results")
    
    # Final save
    save_results(all_results, all_competitions)
    print(f"\n{'=' * 60}")
    print(f"Done! Total: {len(all_results)} results from {len(all_competitions)} competitions")
    print(f"{'=' * 60}")

def save_results(results, competitions):
    """Save results to JSON."""
    # Determine seasons
    seasons = set()
    for r in results:
        if r.get('date'):
            try:
                year = int(r['date'][:4])
                month = int(r['date'][5:7]) if len(r['date']) > 5 else 1
                if month >= 8:
                    seasons.add(f"{year}-{year+1}")
                else:
                    seasons.add(f"{year-1}-{year}")
            except:
                pass
    
    output = {
        'source': 'US Speed Skating PDF archives',
        'scraped_at': datetime.now().isoformat(),
        'seasons': sorted(seasons),
        'total_results': len(results),
        'total_competitions': len(competitions),
        'competitions': competitions,
        'results': results,
    }
    
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"    [Saved: {len(results)} results]")

if __name__ == '__main__':
    main()
