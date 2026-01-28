#!/usr/bin/env python3
"""
Complete USS data update workflow:
1. Scrape PDF links from usspeedskating.org/results
2. Download new PDFs
3. Parse all PDFs
4. Update uss_all_results.json
5. Run build_time_trends.py

Usage: python3 scripts/update_uss_data.py
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
import pdfplumber

# Paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'dist' / 'data'
KB_DIR = Path.home() / 'clawd' / 'shorttrack-knowledge-base'
PDF_DIR = KB_DIR / 'raw_data' / 'uss_pdfs'
OUTPUT_PATH = KB_DIR / 'processed_data' / 'uss_all_results.json'

PDF_DIR.mkdir(parents=True, exist_ok=True)

def scrape_pdf_links() -> list[dict]:
    """Scrape PDF links from USS results page."""
    print("Scraping USS results page...")
    
    result = subprocess.run(
        ['curl', '-s', 'https://www.usspeedskating.org/results'],
        capture_output=True, text=True, timeout=60
    )
    html = result.stdout
    
    # Extract PDF links with dates using the pattern that matches the actual HTML
    pattern = r'<a[^>]+href="(https://assets\.contentstack\.io/[^"]+\.pdf)"[^>]*>([^<]+)</a>'
    matches = re.findall(pattern, html, re.IGNORECASE)
    
    pdfs = []
    seen_urls = set()
    
    for url, text in matches:
        if url in seen_urls:
            continue
        seen_urls.add(url)
        
        text = text.strip()
        # Decode HTML entities
        text = text.replace('&amp;', '&').replace('&nbsp;', ' ')
        
        # Parse date from text (format: YYYY-MM-DD - Name)
        date_match = re.match(r'(\d{4}-\d{2}-\d{2})\s*-\s*(.+)', text)
        if date_match:
            pdfs.append({
                'url': url,
                'date': date_match.group(1),
                'name': date_match.group(2).strip()
            })
        else:
            pdfs.append({'url': url, 'date': None, 'name': text})
    
    # Filter for short track only
    st_keywords = ['short track', 'st ', ' st ', 'silver skates', 'heartland', 'nest', 
                   'mast', 'masa', 'buffalo', 'great lakes', 'badger', 'land of lincoln',
                   'age group', 'junior', 'park ridge', 'gateway', 'thaw', 'january',
                   'amcup', 'champions challenge', 'empire state', 'baystate', 'bay state',
                   'presidential', 'adirondack', 'northburke', 'ohio', 'michigan']
    
    st_pdfs = []
    for p in pdfs:
        name_lower = p['name'].lower()
        if any(kw in name_lower for kw in st_keywords):
            st_pdfs.append(p)
        elif 'long track' not in name_lower and 'marathon' not in name_lower:
            # Include if not explicitly long track/marathon
            if p['date']:  # Only if we have a date
                st_pdfs.append(p)
    
    print(f"  Found {len(pdfs)} total PDFs, {len(st_pdfs)} short track")
    return st_pdfs

def download_pdf(url: str, name: str) -> Optional[Path]:
    """Download a PDF if not already present."""
    # Sanitize filename
    safe_name = re.sub(r'[<>:"/\\|?*]', '_', name)
    safe_name = re.sub(r'\s+', '_', safe_name)[:80]
    filename = f"{safe_name}.pdf"
    filepath = PDF_DIR / filename
    
    if filepath.exists() and filepath.stat().st_size > 1000:
        return filepath
    
    # Fix malformed URLs
    if url.count('http') > 1:
        url = 'https://assets' + url.split('https://assets')[-1]
    
    try:
        result = subprocess.run(
            ['curl', '-sL', '-o', str(filepath), url],
            capture_output=True, timeout=120
        )
        if result.returncode == 0 and filepath.exists() and filepath.stat().st_size > 1000:
            return filepath
    except Exception as e:
        print(f"    Error downloading {name}: {e}")
    
    return None

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
                            # Filter out pure numbers (bib) and short codes (club)
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
                
                # Also try table extraction
                tables = page.extract_tables()
                for table in tables:
                    if not table:
                        continue
                    for row in table:
                        if not row or len(row) < 3:
                            continue
                        # Look for rows that start with a place number
                        try:
                            place = int(str(row[0]).strip().rstrip('.'))
                            if place < 1 or place > 200:
                                continue
                            
                            # Find name and time in row
                            name = None
                            time_str = None
                            for cell in row[1:]:
                                if not cell:
                                    continue
                                cell = str(cell).strip()
                                if re.match(r'\d{1,2}:\d{2}\.\d{2,3}|\d{1,2}\.\d{2,3}', cell):
                                    time_str = parse_time(cell)
                                elif len(cell) > 5 and not cell.isdigit():
                                    if not name:
                                        name = cell
                            
                            if name and time_str and current_distance:
                                # Check if we already have this result
                                exists = any(
                                    r['rank'] == place and 
                                    r['distance'] == f"{current_distance}m" and
                                    r['skater'] == name
                                    for r in results
                                )
                                if not exists:
                                    results.append({
                                        'rank': place,
                                        'skater': name,
                                        'time': time_str,
                                        'distance': f"{current_distance}m",
                                        'category': current_category or 'Unknown',
                                        'competition': comp_name,
                                        'date': comp_date,
                                    })
                        except (ValueError, TypeError):
                            continue
    
    except Exception as e:
        print(f"    Error parsing {filepath.name}: {e}")
    
    return results

def main():
    print("=" * 60)
    print("USS Data Update Workflow")
    print("=" * 60)
    
    # 1. Scrape PDF links
    pdf_links = scrape_pdf_links()
    
    if not pdf_links:
        print("No PDF links found. Check the scraping logic.")
        return
    
    # 2. Download PDFs
    print(f"\nDownloading {len(pdf_links)} PDFs...")
    downloaded = []
    for i, pdf in enumerate(pdf_links):
        filepath = download_pdf(pdf['url'], pdf['name'])
        if filepath:
            downloaded.append({
                'path': filepath,
                'name': pdf['name'],
                'date': pdf['date']
            })
            print(f"  [{i+1}/{len(pdf_links)}] ✓ {pdf['name'][:50]}")
        else:
            print(f"  [{i+1}/{len(pdf_links)}] ✗ {pdf['name'][:50]}")
    
    print(f"\nDownloaded {len(downloaded)} PDFs")
    
    # 3. Parse all PDFs
    print(f"\nParsing PDFs...")
    all_results = []
    competitions = []
    
    for pdf in downloaded:
        results = parse_pdf(pdf['path'], pdf['name'], pdf['date'])
        if results:
            all_results.extend(results)
            competitions.append({
                'name': pdf['name'],
                'date': pdf['date'],
                'result_count': len(results)
            })
            print(f"  ✓ {pdf['name'][:40]}: {len(results)} results")
    
    # 4. Save results
    print(f"\nSaving {len(all_results)} results from {len(competitions)} competitions...")
    
    # Determine seasons
    seasons = set()
    for r in all_results:
        if r['date']:
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
        'results': all_results,
        'failed': []
    }
    
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Saved to {OUTPUT_PATH}")
    
    # 5. Run build_time_trends.py
    print("\nRebuilding time trends...")
    subprocess.run([sys.executable, str(SCRIPT_DIR / 'build_time_trends.py')])
    
    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)

if __name__ == '__main__':
    main()
