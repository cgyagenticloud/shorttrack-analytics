#!/usr/bin/env python3
"""
Integrate US Speed Skating PDF parsed data into clean format.
Handles messy PDF extraction data and produces standardized output.
"""

import json
import re
import os
from collections import defaultdict
from datetime import datetime

# Standard short track distances
STANDARD_DISTANCES = ['500m', '1000m', '1500m', '3000m', '5000m']
RELAY_DISTANCES = ['2000m relay', '3000m relay', '5000m relay']

def clean_name(raw_name):
    """Extract clean skater name from messy PDF data."""
    if not raw_name:
        return None
    
    # Remove common noise patterns
    # Pattern: "Name Club 12345 67 8" (name, club, points/rankings)
    # Pattern: "Name 23 512 410 945" (name with numbers)
    
    name = raw_name.strip()
    
    # Remove trailing numbers and whitespace
    name = re.sub(r'\s+\d+(\s+\d+)*\s*$', '', name)
    
    # Common club names to remove if they're at the end
    clubs = [
        'Direct', 'Potomac', 'Garden State', 'Bay State', 'Northbrook',
        'Oval Speed', 'Cleveland Heights', 'Danbury', 'Puget Sound',
        'Conneticut', 'Connecticut', 'GSSC', 'PSSC', 'Salt Lake',
        'Utah Olympic', 'Milwaukee', 'Pettit', 'Twin Cities', 'Minnesota'
    ]
    
    for club in clubs:
        if name.endswith(' ' + club):
            name = name[:-len(club)-1].strip()
    
    # Remove any remaining trailing numbers
    name = re.sub(r'\s+\d+.*$', '', name)
    
    # Validate: should have at least first and last name
    parts = name.split()
    if len(parts) < 2:
        return None
    
    # Check if it looks like a valid name (alphabetic characters)
    if not all(re.match(r'^[A-Za-z\-\'\.]+$', p) for p in parts):
        # Try to extract just the name part
        valid_parts = []
        for p in parts:
            if re.match(r'^[A-Za-z\-\'\.]+$', p):
                valid_parts.append(p)
            else:
                break
        if len(valid_parts) >= 2:
            name = ' '.join(valid_parts)
        else:
            return None
    
    return name.strip() if name else None

def normalize_distance(dist):
    """Normalize distance to standard short track format."""
    if not dist:
        return None
    
    dist = str(dist).lower().strip()
    
    # Extract number
    match = re.search(r'(\d+)', dist)
    if not match:
        return None
    
    num = int(match.group(1))
    
    # Map to standard short track distances only
    # Be strict - only accept distances close to standard values
    if 450 <= num <= 550:
        return '500m'
    elif 900 <= num <= 1100:
        return '1000m'
    elif 1400 <= num <= 1600:
        return '1500m'
    elif 2900 <= num <= 3100:
        if 'relay' in dist:
            return '3000m relay'
        return '3000m'
    elif 1900 <= num <= 2100:
        return '2000m relay'
    elif 4900 <= num <= 5100:
        if 'relay' in dist:
            return '5000m relay'
        return '5000m'
    
    # Reject non-standard distances (likely PDF parsing errors)
    return None

def normalize_category(cat):
    """Normalize category/division."""
    if not cat:
        return 'Open'
    
    cat = str(cat).strip()
    
    # Standardize gender
    cat_lower = cat.lower()
    if cat_lower in ['men', 'male', 'm']:
        return 'Men'
    if cat_lower in ['women', 'female', 'w', 'ladies']:
        return 'Women'
    
    # Age groups
    if cat_lower.startswith('u ') or cat_lower.startswith('u-'):
        age = re.search(r'\d+', cat)
        if age:
            return f'U{age.group()}'
    
    # Masters
    if 'master' in cat_lower:
        return 'Masters'
    
    return cat

def parse_time(time_str):
    """Parse time string to standardized format."""
    if not time_str:
        return None
    
    time_str = str(time_str).strip()
    
    # Skip invalid times
    if time_str in ['DNF', 'DNS', 'DSQ', 'DQ', '-', '']:
        return None
    
    # Already in MM:SS.mmm format
    if re.match(r'^\d{1,2}:\d{2}\.\d{2,3}$', time_str):
        # Validate it's a reasonable time (not 00:00.000)
        if time_str.startswith('0:00.') or time_str.startswith('00:00.'):
            return None
        return time_str
    
    # SS.mmm format
    if re.match(r'^\d{2}\.\d{2,3}$', time_str):
        # Validate reasonable seconds (e.g., 40-59 seconds for 500m)
        secs = float(time_str.split('.')[0])
        if secs < 20:  # Too fast to be real
            return None
        return f'0:{time_str}'
    
    return None

def extract_season_year(season):
    """Extract start year from season string."""
    if not season:
        return None
    match = re.search(r'(\d{4})', str(season))
    return int(match.group(1)) if match else None

def process_competitions(data):
    """Process raw competition data into clean format."""
    results = []
    skaters = defaultdict(lambda: {
        'name': None,
        'seasons': set(),
        'events': [],
        'best_times': {}
    })
    
    for comp in data.get('competitions', []):
        comp_name = comp.get('name', 'Unknown')
        season = comp.get('season', 'unknown')
        comp_date = comp.get('date')
        
        for race in comp.get('races', []):
            distance = normalize_distance(race.get('distance'))
            category = normalize_category(race.get('category'))
            
            if not distance:
                continue
            
            for result in race.get('results', []):
                raw_name = result.get('name')
                clean = clean_name(raw_name)
                
                if not clean:
                    continue
                
                time = parse_time(result.get('time'))
                place = result.get('place')
                
                # Create result record
                record = {
                    'skater': clean,
                    'competition': comp_name,
                    'season': season,
                    'date': comp_date,
                    'distance': distance,
                    'category': category,
                    'place': place,
                    'time': time
                }
                results.append(record)
                
                # Update skater profile
                skaters[clean]['name'] = clean
                skaters[clean]['seasons'].add(season)
                
                # Track best times
                if time and distance not in skaters[clean]['best_times']:
                    skaters[clean]['best_times'][distance] = time
                elif time:
                    # Simple comparison (works for MM:SS.mmm format)
                    if time < skaters[clean]['best_times'][distance]:
                        skaters[clean]['best_times'][distance] = time
    
    return results, skaters

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Load both data files
    print("Loading data files...")
    
    with open(os.path.join(base_dir, 'data/us_parsed_results/2017-2019.json')) as f:
        data_2017 = json.load(f)
    
    with open(os.path.join(base_dir, 'data/us_parsed_results/2019-2023.json')) as f:
        data_2019 = json.load(f)
    
    # Process both datasets
    print("\nProcessing 2017-2019 data...")
    results1, skaters1 = process_competitions(data_2017)
    print(f"  Extracted {len(results1)} results, {len(skaters1)} unique skaters")
    
    print("\nProcessing 2019-2023 data...")
    results2, skaters2 = process_competitions(data_2019)
    print(f"  Extracted {len(results2)} results, {len(skaters2)} unique skaters")
    
    # Merge results
    all_results = results1 + results2
    
    # Merge skaters
    all_skaters = {}
    for name, data in {**skaters1, **skaters2}.items():
        if name in all_skaters:
            all_skaters[name]['seasons'].update(data['seasons'])
            for dist, time in data['best_times'].items():
                if dist not in all_skaters[name]['best_times']:
                    all_skaters[name]['best_times'][dist] = time
                elif time < all_skaters[name]['best_times'][dist]:
                    all_skaters[name]['best_times'][dist] = time
        else:
            all_skaters[name] = data
    
    # Convert sets to lists for JSON
    for skater in all_skaters.values():
        skater['seasons'] = sorted(list(skater['seasons']))
    
    # Deduplicate results
    seen = set()
    unique_results = []
    for r in all_results:
        key = (r['skater'], r['competition'], r['distance'], r['category'], r['place'])
        if key not in seen:
            seen.add(key)
            unique_results.append(r)
    
    print(f"\n=== Summary ===")
    print(f"Total unique results: {len(unique_results)}")
    print(f"Total unique skaters: {len(all_skaters)}")
    
    # Count by season
    season_counts = defaultdict(int)
    for r in unique_results:
        season_counts[r['season']] += 1
    
    print("\nResults by season:")
    for season in sorted(season_counts.keys()):
        print(f"  {season}: {season_counts[season]}")
    
    # Create output directory
    output_dir = os.path.join(base_dir, 'public/data')
    os.makedirs(output_dir, exist_ok=True)
    
    # Save results
    results_file = os.path.join(output_dir, 'us_historical_results.json')
    with open(results_file, 'w') as f:
        json.dump({
            'source': 'US Speed Skating PDF archives',
            'generated': datetime.now().isoformat(),
            'total_results': len(unique_results),
            'seasons': sorted(season_counts.keys()),
            'results': unique_results
        }, f, indent=2)
    print(f"\nSaved results to: {results_file}")
    
    # Save skaters
    skaters_file = os.path.join(output_dir, 'skaters.json')
    with open(skaters_file, 'w') as f:
        json.dump({
            'source': 'US Speed Skating PDF archives',
            'generated': datetime.now().isoformat(),
            'total_skaters': len(all_skaters),
            'skaters': all_skaters
        }, f, indent=2)
    print(f"Saved skaters to: {skaters_file}")
    
    # Print some sample data
    print("\n=== Sample cleaned results ===")
    for r in unique_results[:5]:
        print(f"  {r['skater']} | {r['distance']} | {r['place']} | {r['time']} | {r['competition']}")
    
    return len(unique_results), len(all_skaters)

if __name__ == '__main__':
    main()
