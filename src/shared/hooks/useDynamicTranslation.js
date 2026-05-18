import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return Math.abs(hash);
}

export default function useDynamicTranslation(ns) {
  const { t, i18n, ready } = useTranslation(ns);
  const [baseSeed] = useState(() => Math.floor(Math.random() * 1000000));

  // Time of day logic based on browser local time
  const [timeInfo] = useState(() => {
    const hour = new Date().getHours();
    let period = 'morning';
    let emoji = '🌅';
    
    if (hour >= 12 && hour < 17) { period = 'afternoon'; emoji = '☀️'; }
    else if (hour >= 17 && hour < 21) { period = 'evening'; emoji = '🌆'; }
    else if (hour >= 21 || hour < 5) { period = 'night'; emoji = '🌙'; }
    
    return { period, emoji };
  });

  const dt = useCallback((key, options = {}) => {
    // 1. Attempt to find period-specific translations (e.g., "key.morning")
    const periodKey = `${key}.${timeInfo.period}`;
    const periodValue = t(periodKey, { returnObjects: true, ...options });
    
    // Verify if it found a valid specific translation
    const hasPeriodSpecific = periodValue !== periodKey && periodValue !== undefined;
    
    // 2. Select the target (specific period or base key)
    const result = hasPeriodSpecific 
      ? periodValue 
      : t(key, { returnObjects: true, ...options });
    
    if (Array.isArray(result) && result.length > 0) {
      // 3. Calculate seed with stability options
      // 'context' allows pinning the same random choice to a specific ID (like userId)
      const contextSeed = options.context ? hashString(String(options.context)) : 0;
      
      const seed = baseSeed + hashString(key) + contextSeed;
      let selected = result[seed % result.length];
      if (typeof selected === 'string') {
        Object.entries(options).forEach(([k, v]) => {
          selected = selected.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        });
      }
      return selected;
    }
    
    // Fallback to standard t behavior if not an array
    return (typeof result === 'string' || typeof result === 'number') 
      ? result 
      : (hasPeriodSpecific ? periodValue : t(key, options));
  }, [t, baseSeed, timeInfo.period]);

  return { dt, t, i18n, ready, timeInfo };
}
