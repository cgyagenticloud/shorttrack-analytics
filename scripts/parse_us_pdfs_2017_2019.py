#!/usr/bin/env python3
"""
Parse US Speed Skating Short Track PDFs for 2017-2019 seasons
Extracts: competitor name, club, category, distance, time, place
"""

import json
import os
import re
import sys
import tempfile
import traceback
from datetime import datetime
from pathlib import Path
from functools import partial

# Make print flush immediately
print = partial(print, flush=True)

import pdfplumber
import requests

# Target seasons for 2017-2019
TARGET_SEASONS = ["2018-2019", "2017-2018", "unknown"]

def load_catalog(catalog_path):
    """Load and filter catalog for short track competitions in target seasons."""
    with open(catalog_path, 'r') as f:
        catalog = json.load(f)
    
    competitions = []
    for season_data in catalog.get("seasons", []):
        season = season_data.get("season", "")
        if season not in TARGET_SEASONS:
            continue
        
        for comp in season_data.get("competitions", []):
            # Include short_track and unknown (might be short track)
            if comp.get("type") in ["short_track", "unknown"]:
                comp["season"] = season
                competitions.append(comp)
    
    return competitions

def download_pdf(url, temp_dir):
    """Download PDF to temp directory, return path."""
    try:
        # Fix malformed URLs
        if "https://assets.contentstack.io" in url and "https://www.usspeedskating.org" in url:
            url = url.split("https://assets.contentstack.io")[1]
            url = "https://assets.contentstack.io" + url
        
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        
        # Extract filename from URL
        filename = url.split("/")[-1]
        if not filename.endswith(".pdf"):
            filename = "temp.pdf"
        
        filepath = os.path.join(temp_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        return filepath
    except Exception as e:
        print(f"  Error downloading: {e}")
        return None

def normalize_time(time_str):
    """Normalize time format to mm:ss.xxx or ss.xxx"""
    if not time_str:
        return None
    
    time_str = time_str.strip()
    
    # Remove common non-time text
    if any(x in time_str.lower() for x in ['dns', 'dnf', 'dq', 'adv', 'pn', 'yc', 'rc']):
        return time_str.upper()
    
    # Already good format
    if re.match(r'^\d{1,2}:\d{2}\.\d{2,3}$', time_str):
        return time_str
    if re.match(r'^\d{1,2}\.\d{2,3}$', time_str):
        return time_str
    
    return time_str

def parse_name(name_str):
    """Parse name from various formats."""
    if not name_str:
        return None
    
    name_str = name_str.strip()
    
    # Skip non-name entries
    if len(name_str) < 2:
        return None
    if name_str.isdigit():
        return None
    
    return name_str

def extract_distance_from_text(text):
    """Extract distance from text (e.g., '500m', '1000m', '1500m')"""
    patterns = [
        r'(\d{3,4})\s*[mM](?:eters?)?',  # 500m, 1000m, 1500m
        r'(\d{3,4})\s*[mM]\s+(?:Final|Heat|Quarter|Semi)',
        r'Distance[:\s]+(\d{3,4})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            dist = match.group(1)
            return f"{dist}m"
    
    return None

def extract_category_from_text(text):
    """Extract category/age group from text."""
    # Common category patterns
    patterns = [
        r'(Senior\s+(?:Men|Women|Ladies))',
        r'(Junior\s+(?:Men|Women|Ladies|Boys|Girls))',
        r'(Masters?\s+(?:Men|Women|Ladies)\s*\d*)',
        r'((?:Midget|Juvenile|Intermediate|Novice)\s+(?:Boys|Girls))',
        r'(Open\s+(?:Men|Women))',
        r'((?:U|Under)\s*\d+\s*(?:Men|Women|Boys|Girls)?)',
        r'(Men|Women|Boys|Girls)(?:\s+\d+)?',
        r'(\d+(?:\+|-)?\s*(?:Men|Women))',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    return None

def is_result_line(text):
    """Check if line looks like a result line (has place number at start)."""
    if not text or len(text.strip()) < 5:
        return False
    
    # Start with a number (place)
    stripped = text.strip()
    if re.match(r'^\d{1,2}[\s\.]', stripped):
        return True
    
    return False

def parse_result_line(line, current_distance=None, current_category=None):
    """Parse a single result line."""
    if not line:
        return None
    
    line = line.strip()
    
    # Common patterns for result lines:
    # 1 LASTNAME Firstname    CLUB    42.123
    # 1. LASTNAME Firstname   CLUB    42.123
    # 1  123  LASTNAME Firstname  CLUB  42.123  (with bib number)
    
    # Try to extract components
    parts = line.split()
    if len(parts) < 3:
        return None
    
    result = {
        "place": None,
        "name": None,
        "club": None,
        "time": None,
    }
    
    # First part should be place
    place_match = re.match(r'^(\d{1,2})\.?$', parts[0])
    if place_match:
        result["place"] = int(place_match.group(1))
    else:
        return None
    
    # Find time (usually last numeric-looking value with decimal)
    time_idx = None
    for i in range(len(parts) - 1, 0, -1):
        p = parts[i]
        if re.match(r'^\d{1,2}:\d{2}\.\d{2,3}$', p) or re.match(r'^\d{1,2}\.\d{2,3}$', p):
            result["time"] = normalize_time(p)
            time_idx = i
            break
        elif p.upper() in ['DNS', 'DNF', 'DQ', 'ADV', 'PN', 'YC', 'RC']:
            result["time"] = p.upper()
            time_idx = i
            break
    
    # Skip bib number if present (usually 2nd or 3rd position)
    name_start = 1
    if len(parts) > 3 and parts[1].isdigit() and len(parts[1]) <= 4:
        name_start = 2
    
    # Find club (usually 3-5 char uppercase string before time)
    club_idx = None
    name_end = time_idx if time_idx else len(parts)
    
    for i in range(name_end - 1, name_start, -1):
        p = parts[i]
        # Club patterns: PTSC, SSSC, SSC, WWSC, etc.
        if re.match(r'^[A-Z]{2,6}$', p) and not p.upper() in ['DNS', 'DNF', 'DQ', 'ADV']:
            result["club"] = p
            club_idx = i
            name_end = i
            break
    
    # Name is between name_start and name_end
    if name_end > name_start:
        name_parts = parts[name_start:name_end]
        result["name"] = " ".join(name_parts)
    
    # Validate result
    if result["place"] and result["name"] and len(result["name"]) > 2:
        return result
    
    return None

def parse_pdf_with_pdfplumber(pdf_path):
    """Parse PDF using pdfplumber - works well for most formats."""
    races = []
    current_distance = None
    current_category = None
    current_results = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
            
            lines = full_text.split('\n')
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check for distance header
                new_distance = extract_distance_from_text(line)
                if new_distance:
                    # Save previous race if exists
                    if current_distance and current_results:
                        races.append({
                            "distance": current_distance,
                            "category": current_category or "Unknown",
                            "results": current_results
                        })
                    current_distance = new_distance
                    current_results = []
                    # Try to get category from same line
                    cat = extract_category_from_text(line)
                    if cat:
                        current_category = cat
                    continue
                
                # Check for category line
                new_category = extract_category_from_text(line)
                if new_category and not new_distance:
                    # Save previous race if distance changes
                    if current_results and current_distance:
                        races.append({
                            "distance": current_distance,
                            "category": current_category or "Unknown",
                            "results": current_results
                        })
                        current_results = []
                    current_category = new_category
                    continue
                
                # Try to parse as result line
                if is_result_line(line):
                    result = parse_result_line(line)
                    if result:
                        current_results.append(result)
            
            # Don't forget last race
            if current_distance and current_results:
                races.append({
                    "distance": current_distance,
                    "category": current_category or "Unknown",
                    "results": current_results
                })
    
    except Exception as e:
        print(f"  Error parsing PDF: {e}")
        traceback.print_exc()
    
    return races

def parse_pdf_tables(pdf_path):
    """Try to extract structured tables from PDF."""
    races = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # First try to find tables
                tables = page.extract_tables()
                
                if tables:
                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        
                        # Try to identify header row and structure
                        header = table[0] if table else []
                        
                        # Look for common header patterns
                        place_col = None
                        name_col = None
                        club_col = None
                        time_col = None
                        
                        for i, h in enumerate(header):
                            if not h:
                                continue
                            h_lower = str(h).lower()
                            if any(x in h_lower for x in ['place', 'rank', 'pos', '#']):
                                place_col = i
                            elif any(x in h_lower for x in ['name', 'skater', 'athlete']):
                                name_col = i
                            elif any(x in h_lower for x in ['club', 'team', 'aff']):
                                club_col = i
                            elif any(x in h_lower for x in ['time', 'result']):
                                time_col = i
                        
                        # If we found structure, extract results
                        if place_col is not None and name_col is not None:
                            results = []
                            for row in table[1:]:
                                if len(row) <= max(place_col, name_col):
                                    continue
                                
                                try:
                                    place = int(row[place_col]) if row[place_col] else None
                                except:
                                    continue
                                
                                name = row[name_col] if name_col < len(row) else None
                                club = row[club_col] if club_col and club_col < len(row) else None
                                time = row[time_col] if time_col and time_col < len(row) else None
                                
                                if place and name:
                                    results.append({
                                        "place": place,
                                        "name": str(name).strip(),
                                        "club": str(club).strip() if club else None,
                                        "time": normalize_time(str(time)) if time else None
                                    })
                            
                            if results:
                                races.append({
                                    "distance": "Unknown",
                                    "category": "Unknown",
                                    "results": results
                                })
    
    except Exception as e:
        print(f"  Table extraction error: {e}")
    
    return races

def parse_competition_pdf(pdf_path, comp_name):
    """Parse a competition PDF and extract all races."""
    print(f"  Parsing: {os.path.basename(pdf_path)}")
    
    # Try text-based parsing first
    races = parse_pdf_with_pdfplumber(pdf_path)
    
    # If we got no results, try table-based parsing
    if not races:
        races = parse_pdf_tables(pdf_path)
    
    return races

def main():
    # Paths
    base_dir = Path("/Users/garychen/dev/shorttrack-analytics")
    catalog_path = base_dir / "data" / "us_pdf_catalog.json"
    output_dir = base_dir / "data" / "us_parsed_results"
    output_path = output_dir / "2017-2019.json"
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("Loading catalog...")
    competitions = load_catalog(catalog_path)
    print(f"Found {len(competitions)} short track competitions in target seasons: {TARGET_SEASONS}")
    
    # Process each competition
    all_competitions = []
    total_races = 0
    total_results = 0
    failed = []
    
    with tempfile.TemporaryDirectory() as temp_dir:
        for i, comp in enumerate(competitions):
            name = comp.get("name", "Unknown")
            date = comp.get("date")
            pdf_url = comp.get("pdf_url")
            season = comp.get("season")
            comp_type = comp.get("type", "unknown")
            
            print(f"\n[{i+1}/{len(competitions)}] {name} ({season})")
            
            if not pdf_url:
                print("  No PDF URL, skipping")
                failed.append({"name": name, "reason": "No PDF URL"})
                continue
            
            # Download PDF
            pdf_path = download_pdf(pdf_url, temp_dir)
            if not pdf_path:
                failed.append({"name": name, "reason": "Download failed"})
                continue
            
            # Parse PDF
            races = parse_competition_pdf(pdf_path, name)
            
            if not races:
                print(f"  Warning: No races extracted")
                failed.append({"name": name, "reason": "No races extracted"})
            else:
                race_count = len(races)
                result_count = sum(len(r.get("results", [])) for r in races)
                print(f"  Extracted {race_count} races, {result_count} results")
                total_races += race_count
                total_results += result_count
            
            # Add to output
            all_competitions.append({
                "date": date,
                "name": name,
                "season": season,
                "type": comp_type,
                "pdf_url": pdf_url,
                "races": races
            })
            
            # Clean up
            try:
                os.remove(pdf_path)
            except:
                pass
    
    # Sort by season then name
    all_competitions.sort(key=lambda x: (x.get("season") or "zzz", x.get("name") or ""))
    
    # Build output
    output = {
        "competitions": all_competitions,
        "stats": {
            "total_competitions": len(all_competitions),
            "total_races": total_races,
            "total_results": total_results,
            "failed_count": len(failed),
            "seasons": TARGET_SEASONS,
            "generated_at": datetime.now().isoformat()
        },
        "failed": failed
    }
    
    # Write output
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total competitions processed: {len(all_competitions)}")
    print(f"Total races extracted: {total_races}")
    print(f"Total results extracted: {total_results}")
    print(f"Failed/No results: {len(failed)}")
    print(f"Output saved to: {output_path}")
    
    if failed:
        print(f"\nFailed competitions:")
        for f_item in failed[:10]:
            print(f"  - {f_item['name']}: {f_item['reason']}")
        if len(failed) > 10:
            print(f"  ... and {len(failed) - 10} more")

if __name__ == "__main__":
    main()
