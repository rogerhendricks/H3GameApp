import React from 'react';
import { View } from 'react-native';
import { Svg, Rect, Line, Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

/**
 * Renders one half of a football pitch (defending end at bottom, halfway
 * line at top).  The viewBox is cropped to the bottom half of the full-field
 * coordinate space (y: 520 → 1040) and stretched with preserveAspectRatio="none"
 * so it always fills its container regardless of screen dimensions.
 *
 * Coordinate reference (full-field space, 680 × 1040):
 *   y=520  – halfway line          (top of this view,  0 %)
 *   y=868  – penalty-box top edge  (~67 % from top)
 *   y=875  – penalty spot          (~68 % from top)
 *   y=945  – goal-box top edge     (~82 % from top)
 *   y=1000 – goal line             (~92 % from top)
 *   y=1040 – bottom border         (bottom of view, 100 %)
 */
const FieldBackground = () => {
  const { theme } = useTheme();
  const surface = theme.colors.fieldSurface;
  const lines = theme.colors.fieldLines;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* viewBox shows only the bottom half (y 520–1040).
          preserveAspectRatio="none" stretches it to fill the container so
          there are no letterbox gaps on any screen size. */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 520 680 520"
        preserveAspectRatio="none"
      >
        {/* Pitch background */}
        <Rect width="680" height="1040" fill={surface} />

        {/* Pitch border — only the bottom half (y 520→1040) is in view */}
        <Rect
          x="40" y="40" width="600" height="960"
          stroke={lines} strokeWidth="4" fill="none"
        />

        {/* Halfway line — rendered at the very top of this half-field */}
        <Line x1="40" y1="520" x2="640" y2="520" stroke={lines} strokeWidth="4" />

        {/* Center circle — only the bottom arc is visible in this half */}
        <Circle cx="340" cy="520" r="91.5" stroke={lines} strokeWidth="4" fill="none" />
        {/* Center spot */}
        <Circle cx="340" cy="520" r="5" fill={lines} />

        {/* Penalty box */}
        <Rect
          x="180" y="868" width="320" height="132"
          stroke={lines} strokeWidth="4" fill="none"
        />

        {/* Goal box */}
        <Rect
          x="240" y="945" width="200" height="55"
          stroke={lines} strokeWidth="4" fill="none"
        />

        {/* Penalty arc (the arc that bulges out above the penalty box) */}
        <Circle cx="340" cy="875" r="91.5" stroke={lines} strokeWidth="4" fill="none" />

        {/* Penalty spot */}
        <Circle cx="340" cy="875" r="5" fill={lines} />
      </Svg>
    </View>
  );
};

export default FieldBackground;

