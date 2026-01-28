#!/usr/bin/env python3
"""
Data Quality Fix Script for US Speed Skating Historical Results
Based on Phase 4 validation report
"""

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

DATA_FILE = Path("public/data/us_historical_results.json")

def load_data():
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def parse_time_to_seconds(time_str):
    """Convert time string to seconds"""
    if not time_str:
        return None
    
    time_str = str(time_str).strip()
    
    # Handle MM:SS.mmm format
    if ':' in time_str:
        parts = time_str.split(':')
        if len(parts) == 2:
            try:
                minutes = int(parts[0])
                seconds = float(parts[1])
                return minutes * 60 + seconds
            except ValueError:
                return None
    
    # Handle SS.mmm format
    try:
        return float(time_str)
    except ValueError:
        return None

def fix_trailing_dash(results):
    """Fix skater names with trailing ' -' """
    fixed_count = 0
    name_mapping = {}  # old name -> clean name
    
    for result in results:
        skater = result.get('skater', '')
        if skater.endswith(' -'):
            clean_name = skater.rstrip(' -').strip()
            if skater != clean_name:
                name_mapping[skater] = clean_name
                result['skater'] = clean_name
                fixed_count += 1
    
    return fixed_count, name_mapping

def fix_distance_classification(results):
    """Fix distance based on time ranges"""
    fixed_count = 0
    relay_count = 0
    
    for result in results:
        time_str = result.get('time')
        if not time_str:
            continue
            
        seconds = parse_time_to_seconds(time_str)
        if seconds is None:
            continue
        
        current_distance = result.get('distance', '')
        new_distance = None
        
        # Determine correct distance based on time
        if seconds < 35:
            # Very fast - likely 500m or error
            continue
        elif 35 <= seconds <= 65:
            new_distance = '500m'
        elif 65 < seconds <= 130:
            new_distance = '1000m'
        elif 130 < seconds <= 200:
            new_distance = '1500m'
        elif seconds > 200:
            # Likely relay or 3000m superfinal
            if 'relay' not in current_distance.lower():
                new_distance = 'relay'
                relay_count += 1
        
        if new_distance and new_distance != current_distance:
            # Special check: 500m time over 60s is definitely wrong
            if current_distance == '500m' and seconds > 65:
                result['distance'] = new_distance
                result['distance_fixed'] = True
                fixed_count += 1
            # Or if time suggests totally different distance
            elif current_distance in ['500m', '1000m', '1500m']:
                expected_ranges = {
                    '500m': (35, 65),
                    '1000m': (65, 130),
                    '1500m': (130, 200)
                }
                if current_distance in expected_ranges:
                    min_t, max_t = expected_ranges[current_distance]
                    if seconds < min_t * 0.8 or seconds > max_t * 1.2:
                        result['distance'] = new_distance
                        result['distance_fixed'] = True
                        fixed_count += 1
    
    return fixed_count, relay_count

def fix_category_codes(results):
    """Standardize category codes"""
    fixed_count = 0
    
    # Standard categories
    standard_categories = {
        'Senior': ['Senior', 'Open', 'Elite'],
        'Junior': ['Junior', 'JR', 'U20'],
        'U16': ['U16', 'U-16'],
        'U14': ['U14', 'U-14'],
        'U12': ['U12', 'U-12'],
        'U10': ['U10', 'U-10'],
        'U8': ['U8', 'U-8'],
        'Masters': ['Masters', 'Master']
    }
    
    abnormal_categories = ['U1000', 'U8000', 'Unknown']
    
    for result in results:
        category = result.get('category', '')
        
        if category in abnormal_categories or not category:
            # Try to infer from competition name or other context
            competition = result.get('competition', '').lower()
            
            if 'junior' in competition or 'jr ' in competition:
                result['category'] = 'Junior'
                fixed_count += 1
            elif 'u16' in competition or 'u-16' in competition:
                result['category'] = 'U16'
                fixed_count += 1
            elif 'u14' in competition or 'u-14' in competition:
                result['category'] = 'U14'
                fixed_count += 1
            elif 'master' in competition:
                result['category'] = 'Masters'
                fixed_count += 1
            elif category in ['U1000', 'U8000']:
                # These are clearly parsing errors, set to Unknown for now
                result['category'] = 'Senior'
                result['category_inferred'] = True
                fixed_count += 1
            elif category == 'Unknown' or not category:
                result['category'] = 'Senior'
                result['category_inferred'] = True
                fixed_count += 1
    
    return fixed_count

def infer_dates(results):
    """Infer dates from competition names and seasons"""
    fixed_count = 0
    
    # Common competition patterns with approximate dates
    competition_dates = {
        'amcup 1': {'month': 10, 'day': 15},  # Early October
        'amcup 2': {'month': 11, 'day': 15},  # Mid November
        'amcup 3': {'month': 12, 'day': 15},  # Mid December
        'amcup 4': {'month': 1, 'day': 15},   # Mid January
        'amcup 5': {'month': 2, 'day': 15},   # Mid February
        'amcup 6': {'month': 3, 'day': 15},   # Mid March
        'fall wc': {'month': 10, 'day': 1},
        'us championship': {'month': 12, 'day': 20},
        'us nationals': {'month': 12, 'day': 20},
        'american cup final': {'month': 3, 'day': 20},
    }
    
    for result in results:
        if result.get('date'):
            continue
            
        season = result.get('season', '')
        competition = result.get('competition', '').lower()
        
        if not season or season == 'unknown':
            continue
        
        # Parse season to get year range (e.g., "2017-2018")
        match = re.match(r'(\d{4})-(\d{4})', season)
        if not match:
            continue
            
        start_year, end_year = int(match.group(1)), int(match.group(2))
        
        # Find matching competition pattern
        estimated_date = None
        for pattern, date_info in competition_dates.items():
            if pattern in competition:
                month = date_info['month']
                day = date_info['day']
                year = end_year if month <= 6 else start_year
                estimated_date = f"{year}-{month:02d}-{day:02d}"
                break
        
        # If no pattern matched, use mid-season estimate
        if not estimated_date:
            # Extract year from competition name if present
            year_match = re.search(r'20(\d{2})', competition)
            if year_match:
                year = int('20' + year_match.group(1))
                estimated_date = f"{year}-01-01"
            else:
                # Default to mid-season (January of end year)
                estimated_date = f"{end_year}-01-15"
        
        if estimated_date:
            result['date'] = estimated_date
            result['date_inferred'] = True
            fixed_count += 1
    
    return fixed_count

def analyze_issues(results):
    """Analyze current data issues"""
    issues = {
        'trailing_dash': [],
        'distance_mismatch': [],
        'abnormal_category': [],
        'missing_date': 0
    }
    
    for i, result in enumerate(results):
        skater = result.get('skater', '')
        if skater.endswith(' -'):
            issues['trailing_dash'].append(skater)
        
        time_str = result.get('time')
        distance = result.get('distance', '')
        if time_str and distance == '500m':
            seconds = parse_time_to_seconds(time_str)
            if seconds and seconds > 65:
                issues['distance_mismatch'].append({
                    'skater': skater,
                    'distance': distance,
                    'time': time_str,
                    'seconds': seconds
                })
        
        category = result.get('category', '')
        if category in ['U1000', 'U8000', 'Unknown', ''] or not category:
            issues['abnormal_category'].append({
                'skater': skater,
                'category': category,
                'competition': result.get('competition', '')
            })
        
        if not result.get('date'):
            issues['missing_date'] += 1
    
    return issues

def calculate_quality_score(results):
    """Calculate data quality score"""
    total = len(results)
    if total == 0:
        return 0
    
    issues = 0
    
    for result in results:
        # Check for issues
        if result.get('skater', '').endswith(' -'):
            issues += 1
        if not result.get('date'):
            issues += 0.5
        if result.get('category') in ['U1000', 'U8000', 'Unknown', '']:
            issues += 0.5
        if not result.get('time'):
            issues += 0.3
    
    score = max(0, 100 - (issues / total * 100))
    return round(score, 2)

def main():
    print("=" * 60)
    print("US Speed Skating Data Quality Fix")
    print("=" * 60)
    
    # Load data
    data = load_data()
    results = data['results']
    print(f"\nLoaded {len(results)} results")
    
    # Analyze current issues
    print("\n--- Current Issues Analysis ---")
    issues = analyze_issues(results)
    
    print(f"Skaters with trailing '-': {len(set(issues['trailing_dash']))}")
    for name in list(set(issues['trailing_dash']))[:10]:
        print(f"  - '{name}'")
    if len(issues['trailing_dash']) > 10:
        print(f"  ... and {len(set(issues['trailing_dash'])) - 10} more")
    
    print(f"\n500m times over 65 seconds: {len(issues['distance_mismatch'])}")
    for item in issues['distance_mismatch'][:5]:
        print(f"  - {item['skater']}: {item['distance']} in {item['seconds']:.1f}s")
    
    print(f"\nAbnormal categories: {len(issues['abnormal_category'])}")
    category_counts = defaultdict(int)
    for item in issues['abnormal_category']:
        category_counts[item['category'] or 'empty'] += 1
    for cat, count in category_counts.items():
        print(f"  - '{cat}': {count}")
    
    print(f"\nMissing dates: {issues['missing_date']}")
    
    initial_score = calculate_quality_score(results)
    print(f"\nInitial Quality Score: {initial_score}%")
    
    # Apply fixes
    print("\n--- Applying Fixes ---")
    
    # 1. Fix trailing dash
    dash_fixed, name_mapping = fix_trailing_dash(results)
    print(f"✓ Fixed {dash_fixed} trailing dash issues")
    if name_mapping:
        print("  Name mappings:")
        for old, new in list(name_mapping.items())[:5]:
            print(f"    '{old}' → '{new}'")
    
    # 2. Fix distance classification
    dist_fixed, relay_count = fix_distance_classification(results)
    print(f"✓ Fixed {dist_fixed} distance classification issues")
    print(f"  ({relay_count} marked as relay)")
    
    # 3. Fix category codes
    cat_fixed = fix_category_codes(results)
    print(f"✓ Fixed {cat_fixed} abnormal category codes")
    
    # 4. Infer dates
    date_fixed = infer_dates(results)
    print(f"✓ Inferred {date_fixed} dates from competition names")
    
    # Calculate new quality score
    final_score = calculate_quality_score(results)
    print(f"\n--- Results ---")
    print(f"Initial Quality Score: {initial_score}%")
    print(f"Final Quality Score:   {final_score}%")
    print(f"Improvement:           +{final_score - initial_score:.2f}%")
    
    # Update metadata
    data['data_quality_fixes'] = {
        'fix_date': datetime.now().isoformat(),
        'trailing_dash_fixed': dash_fixed,
        'distance_fixed': dist_fixed,
        'category_fixed': cat_fixed,
        'dates_inferred': date_fixed,
        'quality_score': final_score
    }
    
    # Save fixed data
    save_data(data)
    print(f"\n✓ Saved fixed data to {DATA_FILE}")
    
    # Summary of total fixes
    total_fixes = dash_fixed + dist_fixed + cat_fixed + date_fixed
    print(f"\n{'=' * 60}")
    print(f"TOTAL FIXES APPLIED: {total_fixes}")
    print(f"{'=' * 60}")

if __name__ == '__main__':
    main()
