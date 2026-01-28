#!/usr/bin/env python3
"""Parse USS PDFs in batches to avoid memory issues."""

import json
import os
import re
import gc
from datetime import datetime
from pathlib import Path
import pdfplumber

KB_DIR = Path.home() / 'clawd' / 'shorttrack-knowledge-base'
PDF_DIR = KB_DIR / 'raw_data' / 'uss_pdfs'
OUTPUT_PATH = KB_DIR / 'processed_data' / 'uss_all_results.json'

def extract_distance(text: str):
    """Extract distance from text."""
    patterns = [
        (r'\b222\s*m', 222), (r'\b333\s*m', 333), (r'\b500\s*m', 500),
        (r'\b777\s*m', 777), (r'\b1000\s*m', 1000), (r'\b1500\s*m', 1500),
        (r'\b3000\s*m', 3000), (r'\b222M\b', 222), (r'\b333M\b', 333),
        (r'\b500M\b', 500), (r'\b777M\b', 777), (r'\b1000M\b', 1000),
        (r'\b1500M\b', 1500), (r'\b3000M\b', 3000),
    ]
    for pattern, dist in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return dist
    return None

def extract_category(text: str):
    """Extract category from text."""
    patterns = [
        (r'Open\s+Men', 'Open Men'), (r'Open\s+Women', 'Open Women'),
        (r'Open\s+M\b', 'Open Men'), (r'Open\s+W\b', 'Open Women'),
        (r'Masters\s+Men', 'Masters Men'), (r'Masters\s+Women', 'Masters Women'),
        (r'U8\s+Boys', 'U8 Boys'), (r'U8\s+Girls', 'U8 Girls'),
        (r'U10\s+Boys', 'U10 Boys'), (r'U10\s+Girls', 'U10 Girls'),
        (r'U12\s+Boys', 'U12 Boys'), (r'U12\s+Girls', 'U12 Girls'),
        (r'U14\s+Boys', 'U14 Boys'), (r'U14\s+Girls', 'U14 Girls'),
        (r'U16\s+Boys', 'U16 Boys'), (r'U16\s+Girls', 'U16 Girls'),
        (r'U18\s+Men', 'U18 Men'), (r'U18\s+Women', 'U18 Women'),
        (r'U20\s+Men', 'U20 Men'), (r'U20\s+Women', 'U20 Women'),
    ]
    for pattern, cat in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return cat
    return None

def parse_time(time_str: str) -> str:
    """Normalize time string."""
    time_str = time_str.strip()
    if ':' in time_str:
        return time_str
    try:
        secs = float(time_str)
        if secs >= 60:
            mins = int(secs // 60)
            secs = secs % 60
            return f"{mins}:{secs:05.2f}"
        return f"{secs:.2f}"
    except:
        return time_str

def parse_pdf(filepath: Path, comp_name: str, comp_date: str):
    """Parse a single PDF and return results."""
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
                    
                    dist = extract_distance(line)
                    if dist and dist in [222, 333, 500, 777, 1000, 1500, 3000]:
                        current_distance = dist
                        cat = extract_category(line)
                        if cat:
                            current_category = cat
                        continue
                    
                    cat = extract_category(line)
                    if cat and not re.match(r'^\d', line):
                        current_category = cat
                        continue
                    
                    match = re.match(r'^(\d{1,3})\.?\s+(.+)', line)
                    if match and current_distance:
                        place = int(match.group(1))
                        rest = match.group(2)
                        
                        time_match = re.search(r'(\d{1,2}:\d{2}\.\d{2,3}|\d{1,2}\.\d{2,3})\s*$', rest)
                        if time_match:
                            time_str = parse_time(time_match.group(1))
                            name_part = rest[:time_match.start()].strip()
                            
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
        print(f"    Error: {e}")
    
    return results

def main():
    print("=" * 60)
    print("USS PDF Batch Parser")
    print("=" * 60)
    
    # Get all PDFs
    pdfs = sorted(PDF_DIR.glob('*.pdf'))
    print(f"Found {len(pdfs)} PDFs")
    
    all_results = []
    competitions = []
    
    for i, pdf_path in enumerate(pdfs):
        # Extract name and date from filename
        name = pdf_path.stem
        # Try to extract date (YYYY-MM-DD at start)
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})', name)
        if date_match:
            comp_date = date_match.group(1)
            comp_name = name[len(comp_date):].strip(' -_')
        else:
            comp_date = None
            comp_name = name
        
        results = parse_pdf(pdf_path, comp_name, comp_date)
        
        if results:
            all_results.extend(results)
            competitions.append({
                'name': comp_name,
                'date': comp_date,
                'result_count': len(results),
                'results': results
            })
            print(f"  [{i+1}/{len(pdfs)}] ✓ {comp_name[:45]}: {len(results)} results")
        else:
            print(f"  [{i+1}/{len(pdfs)}] - {comp_name[:45]}: 0 results")
        
        # Clear memory periodically
        if (i + 1) % 20 == 0:
            gc.collect()
    
    # Determine seasons
    seasons = set()
    for r in all_results:
        if r.get('date'):
            try:
                year = int(r['date'][:4])
                month = int(r['date'][5:7])
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
        'total_results': len(all_results),
        'total_competitions': len(competitions),
        'competitions': competitions,
    }
    
    print(f"\nSaving {len(all_results)} results from {len(competitions)} competitions...")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Saved to {OUTPUT_PATH}")
    print(f"\n{'=' * 60}")
    print(f"SUMMARY:")
    print(f"  Competitions: {len(competitions)}")
    print(f"  Total results: {len(all_results)}")
    print(f"  Seasons: {', '.join(sorted(seasons))}")
    print(f"{'=' * 60}")

if __name__ == '__main__':
    main()
