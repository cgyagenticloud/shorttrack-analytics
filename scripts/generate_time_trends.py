#!/usr/bin/env python3
"""
Generate skater_time_trends.json from US historical results.
This creates time trend data for the SkaterProfile page.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "public" / "data"

def parse_time_to_seconds(time_str: str) -> Optional[float]:
    """Convert time string like '1:27.792' or '42.245' to seconds."""
    if not time_str:
        return None
    time_str = time_str.strip()
    
    # Handle mm:ss.xxx format
    if ':' in time_str:
        parts = time_str.split(':')
        try:
            mins = int(parts[0])
            secs = float(parts[1])
            return mins * 60 + secs
        except (ValueError, IndexError):
            return None
    
    # Handle ss.xxx format
    try:
        return float(time_str)
    except ValueError:
        return None

def normalize_name(name: str) -> str:
    """Normalize skater name for matching."""
    # Remove extra spaces and convert to lowercase
    name = ' '.join(name.strip().split()).lower()
    # Remove hyphens for matching (e.g., "Santos-Griswold" -> "santos griswold")
    name = name.replace('-', ' ')
    return name

def get_name_variants(name: str) -> list:
    """Generate multiple name variants for matching."""
    variants = []
    original = name.strip()
    
    # Lowercase version
    lower = original.lower()
    variants.append(lower)
    
    # Remove hyphens
    no_hyphen = lower.replace('-', ' ')
    if no_hyphen != lower:
        variants.append(no_hyphen)
    
    # Split into parts
    parts = no_hyphen.split()
    
    if len(parts) >= 2:
        # Check if any part is all uppercase (likely lastname in "Firstname LASTNAME" format)
        caps_parts = [p for p in original.split() if p.isupper() and len(p) > 1]
        
        if caps_parts:
            # Format: "Kristen SANTOS-GRISWOLD" -> try "kristen santos griswold" and "santos griswold kristen"
            # Already have the lowercase version
            # Add reversed: lastname first
            lastname = ' '.join(p.lower() for p in caps_parts)
            firstname = ' '.join(p.lower() for p in original.split() if not p.isupper() or len(p) <= 1)
            variants.append(f"{lastname} {firstname}".strip())
            variants.append(f"{firstname} {lastname}".strip())
        else:
            # Normal format: "Aaron Tran" -> "aaron tran" and "tran aaron"
            variants.append(' '.join(reversed(parts)))
    
    # Remove duplicates while preserving order
    seen = set()
    unique = []
    for v in variants:
        v_normalized = ' '.join(v.split())  # Normalize spaces
        if v_normalized and v_normalized not in seen:
            seen.add(v_normalized)
            unique.append(v_normalized)
    
    return unique

def parse_distance(dist_str: str) -> Optional[int]:
    """Extract distance in meters from string like '500m', '1000', etc."""
    match = re.search(r'(\d+)', str(dist_str))
    if match:
        return int(match.group(1))
    return None

def main():
    print("Loading skaters...")
    with open(DATA_DIR / "skaters.json") as f:
        skaters = json.load(f)
    
    # Build name -> id mapping with multiple variants
    name_to_id = {}
    id_to_skater = {}
    for s in skaters:
        id_to_skater[s['id']] = s
        # Add all name variants
        for variant in get_name_variants(s['name']):
            if variant not in name_to_id:  # Don't overwrite existing
                name_to_id[variant] = s['id']
    
    print(f"  {len(skaters)} skaters loaded")
    print(f"  {len(name_to_id)} name variants indexed")
    
    # Load historical results (older data: 2017-2022)
    print("Loading US historical results...")
    results = []
    
    hist_path = DATA_DIR / "us_historical_results.json"
    if hist_path.exists():
        with open(hist_path) as f:
            hist_data = json.load(f)
        results.extend(hist_data.get('results', []))
        print(f"  {len(hist_data.get('results', []))} from us_historical_results.json")
    
    # Load recent USS results (newer data: 2022-2026)
    # Check multiple locations
    uss_paths = [
        Path(__file__).parent.parent / "data" / "uss_all_results.json",  # /shorttrack-analytics/data/
        DATA_DIR / "uss_all_results.json",  # /shorttrack-analytics/public/data/
    ]
    for uss_path in uss_paths:
        if uss_path.exists():
            with open(uss_path) as f:
                uss_data = json.load(f)
            uss_results = uss_data.get('results', [])
            # Normalize field names to match historical format
            for r in uss_results:
                if 'rank' in r and 'place' not in r:
                    r['place'] = r['rank']
            results.extend(uss_results)
            print(f"  {len(uss_results)} from {uss_path.name}")
            break
    
    print(f"  {len(results)} total results loaded")
    
    # Build time trends: skater_id -> distance -> list of {date, time, competition, place}
    trends = defaultdict(lambda: defaultdict(list))
    matched = 0
    unmatched_names = set()
    
    for r in results:
        if not r.get('time'):
            continue
        
        time_secs = parse_time_to_seconds(r['time'])
        if time_secs is None:
            continue
        
        distance = parse_distance(r.get('distance', ''))
        if distance is None or distance not in [500, 1000, 1500]:
            continue
        
        # Match skater name to ID using multiple variants
        skater_name = r.get('skater', '')
        skater_id = None
        
        for variant in get_name_variants(skater_name):
            if variant in name_to_id:
                skater_id = name_to_id[variant]
                break
        
        if not skater_id:
            unmatched_names.add(skater_name)
            continue
        
        matched += 1
        
        # Parse date
        date_str = r.get('date')
        if date_str:
            try:
                # Validate date format
                datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                date_str = None
        
        trends[skater_id][distance].append({
            'time': time_secs,
            'time_str': r['time'],
            'date': date_str,
            'competition': r.get('competition', 'Unknown'),
            'place': r.get('place'),
            'source': 'uss',
        })
    
    print(f"  {matched} results matched to skaters")
    print(f"  {len(unmatched_names)} unique unmatched names")
    if unmatched_names:
        print(f"  Sample unmatched: {list(unmatched_names)[:5]}")
    
    # Sort each skater's results by date
    for skater_id in trends:
        for distance in trends[skater_id]:
            trends[skater_id][distance].sort(
                key=lambda x: (x['date'] or '9999-99-99', x['time'])
            )
    
    # Convert defaultdict to regular dict for JSON serialization
    trends_dict = {
        skater_id: {
            str(dist): entries 
            for dist, entries in distances.items()
        }
        for skater_id, distances in trends.items()
    }
    
    # Build output
    output = {
        'generated': datetime.now().isoformat(),
        'total_skaters': len(trends_dict),
        'total_entries': sum(
            len(entries)
            for distances in trends_dict.values()
            for entries in distances.values()
        ),
        'trends': trends_dict,
    }
    
    # Write output
    output_path = DATA_DIR / "skater_time_trends.json"
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nWrote {output_path}")
    print(f"  {output['total_skaters']} skaters with time data")
    print(f"  {output['total_entries']} total time entries")
    
    # Show some stats
    entry_counts = [
        sum(len(e) for e in d.values())
        for d in trends_dict.values()
    ]
    if entry_counts:
        print(f"  Avg entries per skater: {sum(entry_counts)/len(entry_counts):.1f}")
        print(f"  Max entries for a skater: {max(entry_counts)}")

if __name__ == '__main__':
    main()
