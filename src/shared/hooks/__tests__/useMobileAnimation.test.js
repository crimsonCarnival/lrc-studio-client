import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useMobileAnimation from '../useMobileAnimation';
import {
  ANIMATION_TIMINGS,
  SPRING_CONFIG,
  getAnimationDuration,
} from '../../utils/animationConfig';

describe('useMobileAnimation', () => {
  describe('Hook exports', () => {
    it('should return getAnimationConfig function', () => {
      const { result } = renderHook(() => useMobileAnimation());

      expect(result.current).toHaveProperty('getAnimationConfig');
      expect(typeof result.current.getAnimationConfig).toBe('function');
    });

    it('should export SPRING_CONFIG', () => {
      const { result } = renderHook(() => useMobileAnimation());

      expect(result.current).toHaveProperty('SPRING_CONFIG');
      expect(result.current.SPRING_CONFIG).toEqual(SPRING_CONFIG);
    });

    it('should export ANIMATION_TIMINGS', () => {
      const { result } = renderHook(() => useMobileAnimation());

      expect(result.current).toHaveProperty('ANIMATION_TIMINGS');
      expect(result.current.ANIMATION_TIMINGS).toEqual(ANIMATION_TIMINGS);
    });
  });

  describe('getAnimationConfig', () => {
    it('should return spring config with duration', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 100,
          duration: 200,
          springType: 'SMOOTH',
        });
      });

      expect(config).toHaveProperty('type', 'spring');
      expect(config).toHaveProperty('stiffness');
      expect(config).toHaveProperty('damping');
      expect(config).toHaveProperty('mass');
      expect(config).toHaveProperty('duration');
    });

    it('should use gesture duration when gesture provided', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 150,
          duration: 300,
          springType: 'SMOOTH',
        });
      });

      expect(config.duration).toBe(300);
    });

    it('should return FAST timing when no gesture', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 0,
          duration: 0,
        });
      });

      expect(config.duration).toBe(ANIMATION_TIMINGS.FAST);
      expect(config.duration).toBe(150);
    });

    it('should handle empty gesture data object', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({});
      });

      expect(config.duration).toBe(ANIMATION_TIMINGS.FAST);
    });

    it('should use default SMOOTH spring when springType not specified', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 100,
          duration: 200,
        });
      });

      expect(config.stiffness).toBe(SPRING_CONFIG.SMOOTH.stiffness);
      expect(config.damping).toBe(SPRING_CONFIG.SMOOTH.damping);
    });

    it('should use BOUNCY spring when specified', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 100,
          duration: 200,
          springType: 'BOUNCY',
        });
      });

      expect(config.stiffness).toBe(SPRING_CONFIG.BOUNCY.stiffness);
      expect(config.damping).toBe(SPRING_CONFIG.BOUNCY.damping);
    });

    it('should use SNAPPY spring when specified', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 100,
          duration: 200,
          springType: 'SNAPPY',
        });
      });

      expect(config.stiffness).toBe(SPRING_CONFIG.SNAPPY.stiffness);
      expect(config.damping).toBe(SPRING_CONFIG.SNAPPY.damping);
    });

    it('should clamp duration to minimum 100ms', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 10,
          duration: 50, // Below minimum
        });
      });

      expect(config.duration).toBe(100);
    });

    it('should clamp duration to maximum 500ms', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 10,
          duration: 1000, // Above maximum
        });
      });

      expect(config.duration).toBe(500);
    });

    it('should allow durations within valid range', () => {
      const { result } = renderHook(() => useMobileAnimation());

      const testCases = [100, 200, 300, 400, 500];

      testCases.forEach((testDuration) => {
        let config;
        act(() => {
          config = result.current.getAnimationConfig({
            distance: 100,
            duration: testDuration,
          });
        });

        expect(config.duration).toBe(testDuration);
      });
    });

    it('should fallback to SMOOTH spring for unknown springType', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 100,
          duration: 200,
          springType: 'UNKNOWN',
        });
      });

      expect(config.stiffness).toBe(SPRING_CONFIG.SMOOTH.stiffness);
      expect(config.damping).toBe(SPRING_CONFIG.SMOOTH.damping);
    });

    it('should return consistent spring properties for same springType', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config1, config2;
      act(() => {
        config1 = result.current.getAnimationConfig({
          distance: 100,
          duration: 200,
          springType: 'SMOOTH',
        });
        config2 = result.current.getAnimationConfig({
          distance: 100,
          duration: 200,
          springType: 'SMOOTH',
        });
      });

      expect(config1.stiffness).toBe(config2.stiffness);
      expect(config1.damping).toBe(config2.damping);
      expect(config1.mass).toBe(config2.mass);
      expect(config1.type).toBe(config2.type);
    });
  });

  describe('Integration with animationConfig utilities', () => {
    it('should use getAnimationDuration utility correctly', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          distance: 150,
          duration: 350,
        });
      });

      const expectedDuration = getAnimationDuration(150, 350);
      expect(config.duration).toBe(expectedDuration);
    });

    it('should match SPRING_CONFIG exports', () => {
      const { result } = renderHook(() => useMobileAnimation());

      expect(result.current.SPRING_CONFIG).toEqual(SPRING_CONFIG);
      expect(result.current.SPRING_CONFIG.SMOOTH).toEqual(
        SPRING_CONFIG.SMOOTH
      );
      expect(result.current.SPRING_CONFIG.BOUNCY).toEqual(
        SPRING_CONFIG.BOUNCY
      );
      expect(result.current.SPRING_CONFIG.SNAPPY).toEqual(
        SPRING_CONFIG.SNAPPY
      );
    });

    it('should match ANIMATION_TIMINGS exports', () => {
      const { result } = renderHook(() => useMobileAnimation());

      expect(result.current.ANIMATION_TIMINGS).toEqual(ANIMATION_TIMINGS);
      expect(result.current.ANIMATION_TIMINGS.FAST).toBe(150);
      expect(result.current.ANIMATION_TIMINGS.NORMAL).toBe(200);
      expect(result.current.ANIMATION_TIMINGS.SLOW).toBe(300);
    });
  });

  describe('Real-world gesture scenarios', () => {
    it('should handle fast swipe (quick gesture)', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        // Fast swipe: 100px in 150ms
        config = result.current.getAnimationConfig({
          distance: 100,
          duration: 150,
          springType: 'SNAPPY',
        });
      });

      expect(config.duration).toBe(150);
      expect(config.stiffness).toBe(SPRING_CONFIG.SNAPPY.stiffness);
    });

    it('should handle slow swipe (deliberate gesture)', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        // Slow swipe: 150px in 600ms
        config = result.current.getAnimationConfig({
          distance: 150,
          duration: 600,
          springType: 'SMOOTH',
        });
      });

      // Should be clamped to 500ms
      expect(config.duration).toBe(500);
      expect(config.stiffness).toBe(SPRING_CONFIG.SMOOTH.stiffness);
    });

    it('should handle normal gesture without springType override', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        // Normal swipe: 120px in 250ms
        config = result.current.getAnimationConfig({
          distance: 120,
          duration: 250,
        });
      });

      expect(config.duration).toBe(250);
      // Should default to SMOOTH
      expect(config.stiffness).toBe(SPRING_CONFIG.SMOOTH.stiffness);
    });

    it('should handle no gesture (programmatic animation)', () => {
      const { result } = renderHook(() => useMobileAnimation());

      let config;
      act(() => {
        config = result.current.getAnimationConfig({
          springType: 'BOUNCY',
        });
      });

      expect(config.duration).toBe(ANIMATION_TIMINGS.FAST);
      expect(config.stiffness).toBe(SPRING_CONFIG.BOUNCY.stiffness);
    });
  });
});
