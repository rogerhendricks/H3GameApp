import React from 'react';
import { View } from 'react-native';
import { Svg, Rect, Line, Circle } from 'react-native-svg';

const FieldBackground = () => {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 680 1040">
        <Rect width="680" height="1040" fill="#4CAF50" />
        <Rect x="40" y="40" width="600" height="960" stroke="white" strokeWidth="4" fill="none" />
        {/* Center line */}
        <Line x1="40" y1="520" x2="640" y2="520" stroke="white" strokeWidth="4" />
        {/* Center circle */}
        <Circle cx="340" cy="520" r="91.5" stroke="white" strokeWidth="4" fill="none" />
        <Circle cx="340" cy="520" r="4" fill="white" />
        {/* Goal areas */}
        <Rect x="180" y="40" width="320" height="132" stroke="white" strokeWidth="4" fill="none" />
        <Rect x="240" y="40" width="200" height="55" stroke="white" strokeWidth="4" fill="none" />
        <Rect x="180" y="868" width="320" height="132" stroke="white" strokeWidth="4" fill="none" />
        <Rect x="240" y="945" width="200" height="55" stroke="white" strokeWidth="4" fill="none" />
        {/* Penalty arcs */}
        <Circle cx="340" cy="165" r="91.5" stroke="white" strokeWidth="4" fill="none" />
        <Circle cx="340" cy="875" r="91.5" stroke="white" strokeWidth="4" fill="none" />
      </Svg>
    </View>
  );
};

export default FieldBackground;
