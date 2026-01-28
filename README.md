# ShortTrack Analytics

US Speed Skating Short Track results database.

## Data Sources

- **US Speed Skating** (2017-2023): PDF archives from [usspeedskating.org/results](https://www.usspeedskating.org/results)

## Data Summary

- **13,779 race results** spanning 6 seasons (2017-2023)
- **1,639 unique skaters** with personal bests
- **Events covered**: 500m, 1000m, 1500m, 3000m, relays
- **Data quality score**: 94.4/100 (A grade)

## Database

SQLite database at `public/data/shorttrack.db` with:
- `skaters` table - athlete profiles
- `results` table - race results
- `personal_bests` table - PBs by distance

## JSON Files

- `public/data/us_historical_results.json` - All race results
- `public/data/skaters.json` - Skater profiles and stats

## Scripts

```bash
# Rebuild database from JSON
python3 scripts/build_db.py

# Validate data quality
python3 scripts/validate_data.py

# Integrate US data from PDFs
python3 scripts/integrate_us_data.py
```

## Data Coverage by Season

| Season | Results |
|--------|---------|
| 2017-2018 | 2,128 |
| 2018-2019 | 4,656 |
| 2019-2020 | 1,630 |
| 2020-2021 | 102 |
| 2021-2022 | 1,905 |
| 2022-2023 | 2,210 |

## License

Data sourced from US Speed Skating public results archives.
