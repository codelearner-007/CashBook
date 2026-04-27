import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Font } from '../../constants/fonts';

const WEEK_SHORT  = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEK_LONG   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function DatePickerModal({ visible, date, onConfirm, onCancel }) {
  const { C, isDark } = useTheme();

  const [vy,  setVy]  = useState(date.getFullYear());
  const [vm,  setVm]  = useState(date.getMonth());
  const [sel, setSel] = useState(new Date(date));

  useEffect(() => {
    if (visible) {
      setVy(date.getFullYear());
      setVm(date.getMonth());
      setSel(new Date(date));
    }
  }, [visible]);

  const prevMonth = () => vm === 0  ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1);
  const nextMonth = () => vm === 11 ? (setVm(0),  setVy(y => y + 1)) : setVm(m => m + 1);

  const firstDay    = new Date(vy, vm, 1).getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const cells       = Array.from({ length: 42 }, (_, i) => {
    const d = i - firstDay + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  const isToday    = (d) => { const t = new Date(); return d === t.getDate() && vm === t.getMonth() && vy === t.getFullYear(); };
  const isSelected = (d) => d === sel.getDate() && vm === sel.getMonth() && vy === sel.getFullYear();

  const selDay   = WEEK_LONG[sel.getDay()];
  const selLabel = `${MONTH_LONG[sel.getMonth()]} ${sel.getDate()}, ${sel.getFullYear()}`;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={[s.card, { backgroundColor: C.card }]} activeOpacity={1} onPress={() => {}}>

          {/* ── Selected date header ── */}
          <View style={[s.header, { backgroundColor: C.primary }]}>
            <Text style={s.headerDay}>{selDay}</Text>
            <Text style={s.headerDate}>{selLabel}</Text>
          </View>

          {/* ── Month navigation ── */}
          <View style={s.nav}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[s.navArrow, { color: C.text }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.navLabel, { color: C.text, fontFamily: Font.bold }]}>
              {MONTH_LONG[vm]} {vy}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[s.navArrow, { color: C.text }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Weekday row ── */}
          <View style={s.weekRow}>
            {WEEK_SHORT.map((w, i) => (
              <Text key={i} style={[s.weekDay, { color: C.textMuted, fontFamily: Font.semiBold }]}>{w}</Text>
            ))}
          </View>

          {/* ── Day grid ── */}
          <View style={s.grid}>
            {cells.map((d, i) => {
              const selected = isSelected(d);
              const today    = !selected && isToday(d);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.cell,
                    selected && { backgroundColor: C.primary, borderRadius: 20 },
                    today    && { borderWidth: 1.5, borderColor: C.primary, borderRadius: 20 },
                  ]}
                  onPress={() => d && setSel(new Date(vy, vm, d))}
                  disabled={!d}
                  activeOpacity={0.7}
                >
                  {d ? (
                    <Text style={[
                      s.dayText,
                      { color: C.text, fontFamily: Font.regular },
                      selected && { color: '#fff', fontFamily: Font.bold },
                      today    && { color: C.primary, fontFamily: Font.semiBold },
                    ]}>
                      {d}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Actions ── */}
          <View style={[s.actions, { borderTopColor: C.border }]}>
            <TouchableOpacity onPress={onCancel} style={s.cancelBtn}>
              <Text style={[s.cancelText, { color: C.textMuted, fontFamily: Font.medium }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(sel)} style={[s.doneBtn, { backgroundColor: C.primary }]}>
              <Text style={[s.doneText, { fontFamily: Font.bold }]}>Done</Text>
            </TouchableOpacity>
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const CELL = 40;

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card:    { borderRadius: 20, width: 320, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16 },

  header:     { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerDay:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, marginBottom: 4 },
  headerDate: { fontSize: 22, color: '#fff', fontWeight: '700', letterSpacing: 0.2 },

  nav:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  navBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 28, lineHeight: 34 },
  navLabel: { fontSize: 15 },

  weekRow:  { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 4 },
  weekDay:  { width: CELL, textAlign: 'center', fontSize: 11, lineHeight: 18 },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingBottom: 8 },
  cell:     { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
  dayText:  { fontSize: 14 },

  actions:    { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  cancelBtn:  { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText: { fontSize: 14 },
  doneBtn:    { borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 },
  doneText:   { fontSize: 14, color: '#fff' },
});
