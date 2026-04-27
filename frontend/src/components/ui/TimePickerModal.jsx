import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, PanResponder } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Font } from '../../constants/fonts';

// ── Clock geometry ────────────────────────────────────────────────────────────
const SIZE  = 264;
const CX    = SIZE / 2;
const CY    = SIZE / 2;
const FACE_R = CX - 10;   // outer clock circle
const NUM_R  = CX - 36;   // where numbers sit

function angleOf(val, total) {
  // angle in radians, 0 = 12-o'clock, clockwise
  return (val / total) * 2 * Math.PI - Math.PI / 2;
}

function touchToValue(x, y, mode) {
  const dx = x - CX;
  const dy = y - CY;
  if (Math.sqrt(dx * dx + dy * dy) < 16) return null; // too near centre
  let a = Math.atan2(dy, dx) + Math.PI / 2;
  if (a < 0) a += 2 * Math.PI;
  if (mode === 'hour') {
    return Math.round((a / (2 * Math.PI)) * 12) % 12 || 12;
  }
  return Math.round((a / (2 * Math.PI)) * 60) % 60;
}

// ── Clock face ────────────────────────────────────────────────────────────────
function ClockFace({ mode, hour, minute, accentColor, faceColor, textColor, panHandlers }) {
  const hourAngle   = angleOf(hour === 12 ? 0 : hour, 12);
  const minuteAngle = angleOf(minute, 60);
  const angle       = mode === 'hour' ? hourAngle : minuteAngle;
  const handX       = CX + NUM_R * Math.cos(angle);
  const handY       = CY + NUM_R * Math.sin(angle);

  const hourItems   = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteItems = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <View {...panHandlers} style={s.clockWrap}>
      <Svg width={SIZE} height={SIZE}>
        {/* Face */}
        <Circle cx={CX} cy={CY} r={FACE_R} fill={faceColor} />

        {/* Hand */}
        <Line x1={CX} y1={CY} x2={handX} y2={handY}
              stroke={accentColor} strokeWidth={2} strokeLinecap="round" />

        {/* End cap */}
        <Circle cx={handX} cy={handY} r={20} fill={accentColor} />

        {/* Centre dot */}
        <Circle cx={CX} cy={CY} r={5} fill={accentColor} />

        {/* Hour numbers */}
        {mode === 'hour' && hourItems.map(h => {
          const a  = angleOf(h === 12 ? 0 : h, 12);
          const nx = CX + NUM_R * Math.cos(a);
          const ny = CY + NUM_R * Math.sin(a);
          const sel = h === hour;
          return (
            <SvgText key={h}
              x={nx} y={ny + 5.5}
              textAnchor="middle"
              fill={sel ? '#fff' : textColor}
              fontSize={15}
              fontWeight={sel ? 'bold' : 'normal'}
            >
              {h}
            </SvgText>
          );
        })}

        {/* Minute marks */}
        {mode === 'minute' && minuteItems.map(m => {
          const a  = angleOf(m, 60);
          const nx = CX + NUM_R * Math.cos(a);
          const ny = CY + NUM_R * Math.sin(a);
          const sel = m === Math.round(minute / 5) * 5 % 60;
          return (
            <SvgText key={m}
              x={nx} y={ny + 5.5}
              textAnchor="middle"
              fill={sel ? '#fff' : textColor}
              fontSize={13}
              fontWeight={sel ? 'bold' : 'normal'}
            >
              {String(m).padStart(2, '0')}
            </SvgText>
          );
        })}

        {/* For non-5-minute values show a small white dot on the hand tip */}
        {mode === 'minute' && minute % 5 !== 0 && (
          <Circle cx={handX} cy={handY} r={4} fill="#fff" />
        )}
      </Svg>
    </View>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function TimePickerModal({ visible, date, onConfirm, onCancel }) {
  const { C } = useTheme();

  const [mode,   setMode]   = useState('hour');
  const [hour,   setHour]   = useState(12);
  const [minute, setMinute] = useState(0);
  const [isPm,   setIsPm]   = useState(false);

  // Refs so panResponder (memoised with []) always reads current values
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    if (!visible) return;
    const h = date.getHours();
    setHour(h % 12 === 0 ? 12 : h % 12);
    setMinute(date.getMinutes());
    setIsPm(h >= 12);
    setMode('hour');
  }, [visible]);

  // PanResponder created once — reads mode through ref to avoid stale closures
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => {
      const val = touchToValue(e.nativeEvent.locationX, e.nativeEvent.locationY, modeRef.current);
      if (val === null) return;
      if (modeRef.current === 'hour') setHour(val);
      else setMinute(val);
    },
    onPanResponderMove: (e) => {
      const val = touchToValue(e.nativeEvent.locationX, e.nativeEvent.locationY, modeRef.current);
      if (val === null) return;
      if (modeRef.current === 'hour') setHour(val);
      else setMinute(val);
    },
    // Lift finger → advance hour → minute (Android alarm behaviour)
    onPanResponderRelease: () => {
      if (modeRef.current === 'hour') setMode('minute');
    },
  }), []);

  const confirm = () => {
    const h24 = isPm ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const d   = new Date(date);
    d.setHours(h24, minute, 0, 0);
    onConfirm(d);
  };

  const pad = n => String(n).padStart(2, '0');

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={[s.card, { backgroundColor: C.card }]} activeOpacity={1} onPress={() => {}}>

          {/* ── Header ── */}
          <View style={[s.header, { backgroundColor: C.primary }]}>
            <Text style={s.headerLabel}>
              {mode === 'hour' ? 'Select Hour' : 'Select Minute'}
            </Text>
            <View style={s.timeRow}>
              {/* Hour segment — tap to go back to hour mode */}
              <TouchableOpacity onPress={() => setMode('hour')}>
                <Text style={[s.seg, { color: mode === 'hour' ? '#fff' : 'rgba(255,255,255,0.55)' }]}>
                  {pad(hour)}
                </Text>
              </TouchableOpacity>
              <Text style={s.colon}>:</Text>
              {/* Minute segment */}
              <TouchableOpacity onPress={() => setMode('minute')}>
                <Text style={[s.seg, { color: mode === 'minute' ? '#fff' : 'rgba(255,255,255,0.55)' }]}>
                  {pad(minute)}
                </Text>
              </TouchableOpacity>

              {/* AM / PM */}
              <View style={s.ampmGroup}>
                <TouchableOpacity
                  style={[s.ampmBtn, { borderColor: 'rgba(255,255,255,0.5)' }, !isPm && { backgroundColor: 'rgba(255,255,255,0.25)' }]}
                  onPress={() => setIsPm(false)}
                >
                  <Text style={[s.ampmText, { color: !isPm ? '#fff' : 'rgba(255,255,255,0.6)' }]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.ampmBtn, { borderColor: 'rgba(255,255,255,0.5)' }, isPm && { backgroundColor: 'rgba(255,255,255,0.25)' }]}
                  onPress={() => setIsPm(true)}
                >
                  <Text style={[s.ampmText, { color: isPm ? '#fff' : 'rgba(255,255,255,0.6)' }]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Clock face ── */}
          <ClockFace
            mode={mode}
            hour={hour}
            minute={minute}
            accentColor={C.primary}
            faceColor={C.background}
            textColor={C.text}
            panHandlers={panResponder.panHandlers}
          />

          {/* ── Actions ── */}
          <View style={[s.actions, { borderTopColor: C.border }]}>
            <TouchableOpacity onPress={onCancel} style={s.cancelBtn}>
              <Text style={[s.cancelText, { color: C.textMuted, fontFamily: Font.medium }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirm} style={[s.doneBtn, { backgroundColor: C.primary }]}>
              <Text style={[s.doneText, { fontFamily: Font.bold }]}>Done</Text>
            </TouchableOpacity>
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card:    { borderRadius: 20, width: 300, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16 },

  header:      { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },

  timeRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seg:      { fontSize: 48, fontWeight: '700', letterSpacing: -1, lineHeight: 54 },
  colon:    { fontSize: 40, color: '#fff', fontWeight: '700', lineHeight: 54, marginHorizontal: 2 },

  ampmGroup: { marginLeft: 10, gap: 4 },
  ampmBtn:   { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  ampmText:  { fontSize: 13, fontWeight: '600' },

  clockWrap: { alignItems: 'center', paddingVertical: 12 },

  actions:    { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  cancelBtn:  { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText: { fontSize: 14 },
  doneBtn:    { borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 },
  doneText:   { fontSize: 14, color: '#fff' },
});
