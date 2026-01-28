#!/usr/bin/env python3
"""
Build SQLite database from processed JSON data.
"""

import json
import sqlite3
import os
from datetime import datetime

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'public/data')
    db_path = os.path.join(data_dir, 'shorttrack.db')
    
    # Remove existing database
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed existing database: {db_path}")
    
    # Create database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create tables
    cursor.executescript('''
        CREATE TABLE skaters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            seasons TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            skater_id INTEGER NOT NULL,
            competition TEXT,
            season TEXT,
            date TEXT,
            distance TEXT NOT NULL,
            category TEXT,
            place INTEGER,
            time TEXT,
            FOREIGN KEY (skater_id) REFERENCES skaters(id)
        );
        
        CREATE TABLE personal_bests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            skater_id INTEGER NOT NULL,
            distance TEXT NOT NULL,
            time TEXT NOT NULL,
            FOREIGN KEY (skater_id) REFERENCES skaters(id),
            UNIQUE(skater_id, distance)
        );
        
        CREATE INDEX idx_results_skater ON results(skater_id);
        CREATE INDEX idx_results_distance ON results(distance);
        CREATE INDEX idx_results_season ON results(season);
        CREATE INDEX idx_skaters_name ON skaters(name);
    ''')
    
    # Load data
    print("Loading data files...")
    
    with open(os.path.join(data_dir, 'us_historical_results.json')) as f:
        results_data = json.load(f)
    
    with open(os.path.join(data_dir, 'skaters.json')) as f:
        skaters_data = json.load(f)
    
    # Insert skaters
    print("Inserting skaters...")
    skater_id_map = {}
    for name, data in skaters_data['skaters'].items():
        seasons = ','.join(data.get('seasons', []))
        cursor.execute('INSERT INTO skaters (name, seasons) VALUES (?, ?)', (name, seasons))
        skater_id_map[name] = cursor.lastrowid
        
        # Insert personal bests
        for distance, time in data.get('best_times', {}).items():
            cursor.execute(
                'INSERT OR IGNORE INTO personal_bests (skater_id, distance, time) VALUES (?, ?, ?)',
                (skater_id_map[name], distance, time)
            )
    
    # Insert results
    print("Inserting results...")
    for result in results_data['results']:
        skater_name = result['skater']
        if skater_name not in skater_id_map:
            continue
        
        cursor.execute('''
            INSERT INTO results (skater_id, competition, season, date, distance, category, place, time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            skater_id_map[skater_name],
            result.get('competition'),
            result.get('season'),
            result.get('date'),
            result['distance'],
            result.get('category'),
            result.get('place'),
            result.get('time')
        ))
    
    conn.commit()
    
    # Print stats
    cursor.execute('SELECT COUNT(*) FROM skaters')
    skater_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM results')
    result_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM personal_bests')
    pb_count = cursor.fetchone()[0]
    
    print(f"\n=== Database Built ===")
    print(f"Skaters: {skater_count}")
    print(f"Results: {result_count}")
    print(f"Personal Bests: {pb_count}")
    print(f"Database: {db_path}")
    
    # Sample query
    print("\n=== Top 500m Times ===")
    cursor.execute('''
        SELECT s.name, pb.time 
        FROM personal_bests pb 
        JOIN skaters s ON pb.skater_id = s.id 
        WHERE pb.distance = '500m' 
        ORDER BY pb.time 
        LIMIT 10
    ''')
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")
    
    conn.close()

if __name__ == '__main__':
    main()
