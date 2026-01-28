#!/usr/bin/env python3
"""
US Speed Skating Data Validation Script
Phase 4: 验证数据完整性
"""

import json
from collections import defaultdict
import re

def parse_time_to_seconds(time_str):
    """将时间字符串转换为秒数"""
    if not time_str:
        return None
    
    # 处理不同格式
    # M:SS.mmm (如 2:38.840)
    # M:SS.mm (如 1:23.45)
    # SS.mmm (如 45.820)
    
    try:
        if ':' in time_str:
            parts = time_str.split(':')
            if len(parts) == 2:
                minutes = float(parts[0])
                seconds = float(parts[1])
                return minutes * 60 + seconds
            elif len(parts) == 3:  # H:M:S
                hours = float(parts[0])
                minutes = float(parts[1])
                seconds = float(parts[2])
                return hours * 3600 + minutes * 60 + seconds
        else:
            return float(time_str)
    except:
        return None

def validate_data():
    # 读取数据
    with open('/Users/garychen/dev/shorttrack-analytics/public/data/us_historical_results.json', 'r') as f:
        data = json.load(f)
    
    results = data['results']
    total_records = len(results)
    
    print("=" * 70)
    print("US Speed Skating 数据验证报告")
    print("=" * 70)
    print(f"\n总记录数: {total_records}")
    print(f"覆盖赛季: {', '.join(data['seasons'])}")
    
    # 统计变量
    issues = []
    warnings = []
    
    # 1. 基础字段检查
    print("\n" + "=" * 70)
    print("1. 基础字段完整性检查")
    print("=" * 70)
    
    field_stats = {
        'skater': {'null': 0, 'empty': 0},
        'competition': {'null': 0, 'empty': 0},
        'season': {'null': 0, 'empty': 0, 'unknown': 0},
        'date': {'null': 0, 'empty': 0},
        'distance': {'null': 0, 'empty': 0},
        'category': {'null': 0, 'empty': 0},
        'place': {'null': 0, 'invalid': 0},
        'time': {'null': 0, 'empty': 0}
    }
    
    for r in results:
        for field in ['skater', 'competition', 'season', 'distance', 'category']:
            if r.get(field) is None:
                field_stats[field]['null'] += 1
            elif str(r.get(field)).strip() == '':
                field_stats[field]['empty'] += 1
        
        if r.get('season') == 'unknown':
            field_stats['season']['unknown'] += 1
        
        if r.get('date') is None:
            field_stats['date']['null'] += 1
        
        if r.get('place') is None:
            field_stats['place']['null'] += 1
        elif not isinstance(r.get('place'), int) or r.get('place') < 1:
            field_stats['place']['invalid'] += 1
        
        if r.get('time') is None:
            field_stats['time']['null'] += 1
        elif str(r.get('time')).strip() == '':
            field_stats['time']['empty'] += 1
    
    print(f"\n字段 | 空值(null) | 空字符串 | 其他问题")
    print("-" * 50)
    print(f"选手名 | {field_stats['skater']['null']} | {field_stats['skater']['empty']} | -")
    print(f"比赛 | {field_stats['competition']['null']} | {field_stats['competition']['empty']} | -")
    print(f"赛季 | {field_stats['season']['null']} | {field_stats['season']['empty']} | unknown: {field_stats['season']['unknown']}")
    print(f"日期 | {field_stats['date']['null']} | - | -")
    print(f"距离 | {field_stats['distance']['null']} | {field_stats['distance']['empty']} | -")
    print(f"组别 | {field_stats['category']['null']} | {field_stats['category']['empty']} | -")
    print(f"名次 | {field_stats['place']['null']} | - | 无效: {field_stats['place']['invalid']}")
    print(f"成绩 | {field_stats['time']['null']} | {field_stats['time']['empty']} | -")
    
    time_coverage = (total_records - field_stats['time']['null']) / total_records * 100
    date_coverage = (total_records - field_stats['date']['null']) / total_records * 100
    
    # 2. 时间格式检查
    print("\n" + "=" * 70)
    print("2. 时间格式统一性检查")
    print("=" * 70)
    
    time_formats = defaultdict(int)
    invalid_times = []
    
    for r in results:
        time_str = r.get('time')
        if time_str:
            # 检测格式
            if re.match(r'^\d+:\d{2}\.\d{2,3}$', str(time_str)):
                time_formats['M:SS.mmm'] += 1
            elif re.match(r'^\d+:\d{2}:\d{2}\.\d{2,3}$', str(time_str)):
                time_formats['H:MM:SS.mmm'] += 1
            elif re.match(r'^\d+\.\d{2,3}$', str(time_str)):
                time_formats['SS.mmm'] += 1
            else:
                time_formats['其他'] += 1
                if len(invalid_times) < 10:
                    invalid_times.append((r['skater'], r['distance'], time_str))
    
    print("\n时间格式分布:")
    for fmt, count in sorted(time_formats.items(), key=lambda x: -x[1]):
        print(f"  {fmt}: {count} ({count/total_records*100:.1f}%)")
    
    if invalid_times:
        print(f"\n异常时间格式示例 (前{len(invalid_times)}个):")
        for skater, dist, t in invalid_times:
            print(f"  {skater} - {dist}: {t}")
    
    # 3. PB合理性检查
    print("\n" + "=" * 70)
    print("3. 成绩合理性检查 (PB范围)")
    print("=" * 70)
    
    # 定义合理范围（秒）
    pb_ranges = {
        '500m': (35, 60),    # 35秒 - 60秒
        '1000m': (70, 120),  # 70秒 - 120秒
        '1500m': (120, 180), # 120秒 - 180秒
    }
    
    pb_issues = defaultdict(list)
    distance_stats = defaultdict(lambda: {'total': 0, 'with_time': 0, 'out_of_range': 0, 'min': float('inf'), 'max': 0})
    
    for r in results:
        dist = r.get('distance')
        time_str = r.get('time')
        
        if dist:
            distance_stats[dist]['total'] += 1
            
        if dist and time_str:
            seconds = parse_time_to_seconds(time_str)
            if seconds is not None:
                distance_stats[dist]['with_time'] += 1
                distance_stats[dist]['min'] = min(distance_stats[dist]['min'], seconds)
                distance_stats[dist]['max'] = max(distance_stats[dist]['max'], seconds)
                
                if dist in pb_ranges:
                    min_t, max_t = pb_ranges[dist]
                    if seconds < min_t or seconds > max_t:
                        distance_stats[dist]['out_of_range'] += 1
                        if len(pb_issues[dist]) < 5:
                            pb_issues[dist].append({
                                'skater': r['skater'],
                                'time': time_str,
                                'seconds': seconds,
                                'competition': r['competition']
                            })
    
    print("\n距离 | 总数 | 有成绩 | 超出范围 | 最快 | 最慢")
    print("-" * 70)
    for dist in sorted(distance_stats.keys()):
        stats = distance_stats[dist]
        min_time = f"{stats['min']:.3f}s" if stats['min'] != float('inf') else "-"
        max_time = f"{stats['max']:.3f}s" if stats['max'] > 0 else "-"
        print(f"{dist:8} | {stats['total']:5} | {stats['with_time']:5} | {stats['out_of_range']:5} | {min_time:10} | {max_time:10}")
    
    print("\n超出范围的成绩示例:")
    for dist, items in pb_issues.items():
        if items:
            print(f"\n{dist} (合理范围: {pb_ranges[dist][0]}-{pb_ranges[dist][1]}秒):")
            for item in items:
                print(f"  {item['skater']}: {item['time']} ({item['seconds']:.2f}s) @ {item['competition']}")
    
    # 4. 选手数据一致性检查
    print("\n" + "=" * 70)
    print("4. 选手数据一致性检查")
    print("=" * 70)
    
    skater_records = defaultdict(list)
    for r in results:
        skater = r.get('skater', '').strip()
        if skater:
            skater_records[skater].append(r)
    
    unique_skaters = len(skater_records)
    print(f"\n唯一选手数: {unique_skaters}")
    
    # 检查选手名带有特殊字符
    name_issues = []
    for skater in skater_records.keys():
        if skater.endswith(' -') or skater.endswith('-'):
            name_issues.append(skater)
        if re.search(r'[^\w\s\-\'\.]', skater):
            name_issues.append(skater)
    
    if name_issues:
        print(f"\n选手名异常 (共{len(name_issues)}个):")
        for name in list(set(name_issues))[:10]:
            print(f"  - '{name}'")
    
    # 检查可能的重复选手（名字相似）
    from difflib import SequenceMatcher
    similar_names = []
    skater_list = list(skater_records.keys())
    
    # 只检查前1000个选手以节省时间
    check_limit = min(500, len(skater_list))
    for i in range(check_limit):
        for j in range(i+1, check_limit):
            name1, name2 = skater_list[i], skater_list[j]
            # 跳过完全相同
            if name1 == name2:
                continue
            # 检查相似度
            ratio = SequenceMatcher(None, name1.lower(), name2.lower()).ratio()
            if ratio > 0.85 and ratio < 1.0:
                similar_names.append((name1, name2, ratio))
    
    if similar_names:
        print(f"\n可能的重复选手 (名字相似度>85%, 共{len(similar_names)}对):")
        for n1, n2, r in similar_names[:15]:
            print(f"  '{n1}' <-> '{n2}' (相似度: {r:.1%})")
    
    # 5. 重复数据检测
    print("\n" + "=" * 70)
    print("5. 重复数据检测")
    print("=" * 70)
    
    # 创建唯一键：选手+比赛+距离+组别+名次+时间
    record_keys = defaultdict(list)
    for idx, r in enumerate(results):
        key = (
            r.get('skater', ''),
            r.get('competition', ''),
            r.get('distance', ''),
            r.get('category', ''),
            r.get('place'),
            r.get('time')
        )
        record_keys[key].append(idx)
    
    duplicates = {k: v for k, v in record_keys.items() if len(v) > 1}
    dup_count = sum(len(v) - 1 for v in duplicates.values())
    
    print(f"\n完全重复记录: {dup_count} 条")
    if duplicates:
        print(f"涉及 {len(duplicates)} 组数据")
        print("\n重复示例:")
        for key, indices in list(duplicates.items())[:5]:
            r = results[indices[0]]
            print(f"  {r['skater']} @ {r['competition']} - {r['distance']} ({len(indices)}次重复)")
    
    # 6. 类别/组别一致性
    print("\n" + "=" * 70)
    print("6. 组别分布检查")
    print("=" * 70)
    
    category_counts = defaultdict(int)
    for r in results:
        cat = r.get('category', 'null')
        category_counts[cat] += 1
    
    print("\n组别分布 (按数量排序):")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1])[:20]:
        print(f"  {cat}: {count}")
    
    # 检查异常组别
    unusual_categories = []
    for cat in category_counts.keys():
        if cat and (cat.startswith('U') and len(cat) > 4):  # 如 U1000, U328 等
            unusual_categories.append(cat)
    
    if unusual_categories:
        print(f"\n可能异常的组别: {unusual_categories[:10]}")
    
    # 7. 赛季分布
    print("\n" + "=" * 70)
    print("7. 赛季分布检查")
    print("=" * 70)
    
    season_counts = defaultdict(int)
    for r in results:
        season = r.get('season', 'unknown')
        season_counts[season] += 1
    
    print("\n赛季分布:")
    for season in sorted(season_counts.keys()):
        count = season_counts[season]
        print(f"  {season}: {count} ({count/total_records*100:.1f}%)")
    
    # ====== 数据质量评分 ======
    print("\n" + "=" * 70)
    print("数据质量评分")
    print("=" * 70)
    
    scores = {}
    
    # 字段完整性得分 (40分)
    skater_complete = (total_records - field_stats['skater']['null'] - field_stats['skater']['empty']) / total_records
    competition_complete = (total_records - field_stats['competition']['null'] - field_stats['competition']['empty']) / total_records
    distance_complete = (total_records - field_stats['distance']['null'] - field_stats['distance']['empty']) / total_records
    time_complete = (total_records - field_stats['time']['null']) / total_records
    
    scores['字段完整性'] = ((skater_complete + competition_complete + distance_complete + time_complete) / 4) * 40
    
    # 数据一致性得分 (25分)
    name_issue_rate = len(set(name_issues)) / unique_skaters if unique_skaters > 0 else 0
    scores['数据一致性'] = max(0, (1 - name_issue_rate * 5)) * 25
    
    # 重复数据得分 (15分)
    dup_rate = dup_count / total_records if total_records > 0 else 0
    scores['无重复'] = max(0, (1 - dup_rate * 10)) * 15
    
    # PB合理性得分 (20分)
    total_pb_check = sum(distance_stats[d]['with_time'] for d in pb_ranges.keys())
    total_out_range = sum(distance_stats[d]['out_of_range'] for d in pb_ranges.keys())
    pb_valid_rate = (total_pb_check - total_out_range) / total_pb_check if total_pb_check > 0 else 1
    scores['PB合理性'] = pb_valid_rate * 20
    
    total_score = sum(scores.values())
    
    print(f"\n评分明细:")
    for name, score in scores.items():
        max_score = {'字段完整性': 40, '数据一致性': 25, '无重复': 15, 'PB合理性': 20}[name]
        print(f"  {name}: {score:.1f}/{max_score}")
    
    print(f"\n总评分: {total_score:.1f}/100")
    
    if total_score >= 90:
        grade = "A (优秀)"
    elif total_score >= 80:
        grade = "B (良好)"
    elif total_score >= 70:
        grade = "C (中等)"
    elif total_score >= 60:
        grade = "D (及格)"
    else:
        grade = "F (需改进)"
    
    print(f"等级: {grade}")
    
    # ====== 建议修复 ======
    print("\n" + "=" * 70)
    print("建议修复")
    print("=" * 70)
    
    recommendations = []
    
    if field_stats['time']['null'] / total_records > 0.3:
        recommendations.append(f"1. [高优先级] {field_stats['time']['null']}条记录缺少成绩时间，占{field_stats['time']['null']/total_records*100:.1f}%")
    
    if field_stats['date']['null'] / total_records > 0.5:
        recommendations.append(f"2. [中优先级] {field_stats['date']['null']}条记录缺少日期，考虑从比赛名称推断")
    
    if name_issues:
        recommendations.append(f"3. [中优先级] 清理{len(set(name_issues))}个选手名中的特殊字符（如尾随的 '-'）")
    
    if dup_count > 0:
        recommendations.append(f"4. [中优先级] 删除{dup_count}条完全重复的记录")
    
    if total_out_range > 0:
        recommendations.append(f"5. [低优先级] 检查{total_out_range}条超出合理范围的成绩（可能是接力或数据错误）")
    
    if unusual_categories:
        recommendations.append(f"6. [低优先级] 标准化组别名称（发现{len(unusual_categories)}个不常见组别）")
    
    for rec in recommendations:
        print(f"\n{rec}")
    
    if not recommendations:
        print("\n数据质量良好，无需紧急修复！")
    
    print("\n" + "=" * 70)
    print("验证完成")
    print("=" * 70)

if __name__ == '__main__':
    validate_data()
