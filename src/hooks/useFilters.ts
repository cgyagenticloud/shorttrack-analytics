import { useState, useCallback } from 'react';
import type { Category, Gender, Skater, Heat, PassEvent, CrashEvent, Incident } from '../types/data';

interface Filters {
  category: Category | 'all';
  gender: Gender | 'all';
  distance: number | 'all';
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>({
    category: 'senior',
    gender: 'all',
    distance: 'all',
  });

  const setCategory = useCallback((c: Category | 'all') => {
    setFilters(f => ({ ...f, category: c }));
  }, []);

  const setGender = useCallback((g: Gender | 'all') => {
    setFilters(f => ({ ...f, gender: g }));
  }, []);

  const setDistance = useCallback((d: number | 'all') => {
    setFilters(f => ({ ...f, distance: d }));
  }, []);

  return { filters, setCategory, setGender, setDistance };
}

export function filterSkaters(skaters: Skater[], filters: { category: Category | 'all'; gender: Gender | 'all' }): Skater[] {
  return skaters.filter(s => {
    if (filters.category !== 'all' && s.category !== filters.category) return false;
    if (filters.gender !== 'all' && s.gender !== filters.gender) return false;
    return true;
  });
}

export function filterHeats(heats: Heat[], filters: { category: Category | 'all'; gender: Gender | 'all'; distance: number | 'all' }): Heat[] {
  return heats.filter(h => {
    if (filters.category !== 'all' && h.category !== filters.category) return false;
    if (filters.gender !== 'all' && h.gender !== filters.gender) return false;
    if (filters.distance !== 'all' && h.distance !== filters.distance) return false;
    return true;
  });
}

export function filterPasses(passes: PassEvent[], filters: { category: Category | 'all'; gender: Gender | 'all'; distance: number | 'all' }): PassEvent[] {
  return passes.filter(p => {
    if (filters.category !== 'all' && p.category !== filters.category) return false;
    if (filters.gender !== 'all' && p.gender !== filters.gender) return false;
    if (filters.distance !== 'all' && p.distance !== filters.distance) return false;
    return true;
  });
}

export function filterCrashes(crashes: CrashEvent[], filters: { category: Category | 'all'; gender: Gender | 'all'; distance: number | 'all' }): CrashEvent[] {
  return crashes.filter(c => {
    if (filters.category !== 'all' && c.category !== filters.category) return false;
    if (filters.gender !== 'all' && c.gender !== filters.gender) return false;
    if (filters.distance !== 'all' && c.distance !== filters.distance) return false;
    return true;
  });
}

export function filterIncidents(incidents: Incident[], filters: { category: Category | 'all'; gender: Gender | 'all'; distance: number | 'all' }): Incident[] {
  return incidents.filter(i => {
    if (filters.category !== 'all' && i.category !== filters.category) return false;
    if (filters.gender !== 'all' && i.gender !== filters.gender) return false;
    if (filters.distance !== 'all' && i.distance !== filters.distance) return false;
    return true;
  });
}
