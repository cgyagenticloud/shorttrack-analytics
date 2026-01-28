# US Speed Skating Results Scraping Project

## Overview
Scrape all Short Track results from https://www.usspeedskating.org/results to enhance the shorttrack-analytics database.

## Data Source
- URL: https://www.usspeedskating.org/results
- Format: PDF files organized by season
- Seasons: 2014 - 2026 (13 seasons)
- Estimated: ~300-400 total competitions, ~150-200 Short Track

## Phases

### Phase 1: Discovery & Cataloging ✅ IN PROGRESS
**Agent:** `uss-phase1-catalog`
**Output:** `data/us_pdf_catalog.json`

Tasks:
- [x] Explore all 13 seasons
- [ ] Extract all PDF links
- [ ] Classify Short Track vs Long Track
- [ ] Generate catalog JSON

### Phase 2: PDF Download & Parsing
**Agents:** 2-3 parallel agents by season range
**Output:** `data/us_parsed_results/`

Tasks:
- [ ] Download PDFs
- [ ] Parse race results (OCR if needed)
- [ ] Extract: skater names, times, positions, distances, categories
- [ ] Handle different PDF formats

### Phase 3: Data Integration
**Agent:** `uss-phase3-integrate`
**Output:** Updated `skaters.json`, `scraped_us_results.json`

Tasks:
- [ ] Match existing skaters
- [ ] Create new skater entries
- [ ] Update race records, PBs, medals
- [ ] Rebuild database with `build_db.py`

### Phase 4: Validation
**Agent:** `uss-phase4-validate`

Tasks:
- [ ] Data integrity checks
- [ ] Duplicate detection
- [ ] PB sanity checks
- [ ] Cross-reference with existing data

## PDF Format Notes

### Common PDF Structures:
1. **Protocol Reports** - Full competition results with all heats
2. **Final Reports** - Summary with final standings
3. **Combined Reports** - Multiple events in one PDF

### Expected Fields:
- Skater Name (LAST First format)
- Club/Team
- Category (Senior, Junior, Youth JA-JG)
- Distance (500m, 777m, 1000m, 1500m)
- Time (mm:ss.xxx or ss.xxx)
- Position/Place
- Heat number (for protocol reports)

## Known Short Track Events (Keywords)
- Short Track, ST
- Heartland Series (#1-#4)
- NEST (NorthEast Racing Series)
- Bay State Championships
- Buffalo ST Championships
- Chicago Silver Skates
- Gateway Championships
- Park Ridge Open
- January Thaw
- Badger International
- Ohio Invitational
- Great Lakes Championships (ST)
- Saratoga Cup
- Franklin Park Barrel Buster
- Beehive Burn
- Western States Championships
- Full Throttle Sprint Cup
- UOO Fall/Winter Challenge
- Desert Classic (ST)
- US Short Track Championships
- US Junior Short Track Championships

## Timeline Estimate
- Phase 1: ~30 min
- Phase 2: ~2-3 hours (parallel processing)
- Phase 3: ~1 hour
- Phase 4: ~30 min

Total: ~4-5 hours

## Progress Log
- 2026-01-28 09:40: Started Phase 1 cataloging
