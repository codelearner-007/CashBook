import { useState, useRef, useCallback, Fragment, memo, useEffect } from 'react';
import {
  View, Text, ScrollView, Animated, StyleSheet, TouchableOpacity,
} from 'react-native';
import { CARD_ACCENTS } from '../../constants/colors';

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEM_H   = 82; // card minHeight 72 + marginBottom 10
const clamp    = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const fmt      = (n) => (n < 0 ? '-' : '+') + Math.abs(n).toLocaleString();
const initials = (s = '') => s.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const fmtLastEntry = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date}  ·  ${time}`;
};

// ── Drag handle icon (6-dot grip) ─────────────────────────────────────────────

export const DragHandleIcon = ({ color = '#94A3B8' }) => (
  <View style={{ width: 20, height: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
    {[0, 1].map(col => (
      <View key={col} style={{ gap: 4 }}>
        {[0, 1, 2].map(row => (
          <View key={row} style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
        ))}
      </View>
    ))}
  </View>
);

// ── Dots icon ─────────────────────────────────────────────────────────────────

const DotsIcon = ({ color }) => (
  <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
    {[0, 1, 2].map(i => (
      <View key={i} style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
    ))}
  </View>
);

// ── Drag book card (book row with integrated handle) ──────────────────────────

const DragBookCard = memo(({ item, index, isActive, handleProps, onPress, onMenu, C, Font }) => {
  const accent   = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const balance  = item.net_balance ?? 0;
  const s        = cardStyles(C, Font);
  const moreRef  = useRef(null);

  const handleMorePress = () => {
    moreRef.current?.measureInWindow((x, y, width, height) => {
      onMenu({ pageX: x, pageY: y, width, height });
    });
  };

  return (
    <View style={[s.card, isActive && s.cardActive]}>
      {/* Drag handle */}
      <View {...handleProps} style={s.handle}>
        <DragHandleIcon color={isActive ? C.primary : C.textSubtle} />
      </View>

      {/* Divider */}
      <View style={s.handleDivider} />

      {/* Book content (tappable to open) */}
      <TouchableOpacity style={s.body} onPress={onPress} activeOpacity={0.85}>
        <View style={[s.iconBox, { backgroundColor: accent + '18' }]}>
          <Text style={[s.iconText, { color: accent }]}>{initials(item.name)}</Text>
        </View>
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
          {fmtLastEntry(item.last_entry_at) != null && (
            <Text style={s.date} numberOfLines={1}>{fmtLastEntry(item.last_entry_at)}</Text>
          )}
        </View>
        <View style={s.right}>
          <View style={[s.pill, { backgroundColor: C.cardAlt }]}>
            <Text style={[s.pillText, { color: C.text }]}>{fmt(balance)}</Text>
          </View>
          <TouchableOpacity
            ref={moreRef}
            onPress={handleMorePress}
            style={s.moreBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <DotsIcon color={C.textSubtle} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ── Insert indicator line ─────────────────────────────────────────────────────

const InsertLine = ({ C }) => (
  <View style={{
    height: 3, borderRadius: 2,
    backgroundColor: C.primary,
    marginHorizontal: 16,
    marginVertical: 3,
  }} />
);

// ── Main draggable list ───────────────────────────────────────────────────────

export default function DraggableList({
  books,
  onReorder,
  onBookPress,
  onBookMenu,
  listPaddingBottom = 130,
  C,
  Font,
}) {
  const [items,    setItems]    = useState(() => [...books]);
  const [dragIdx,  setDragIdx]  = useState(-1);
  const [insertAt, setInsertAt] = useState(-1);

  // Sync internal list when the books prop changes (create/delete from parent)
  useEffect(() => {
    if (dragIdx < 0) {
      setItems([...books]);
    }
  }, [books, dragIdx]);

  // Refs for use inside Responder callbacks (avoids stale closure issues)
  const dragIdxRef    = useRef(-1);
  const insertAtRef   = useRef(-1);
  const dragStartYRef = useRef(0);
  const dragDy        = useRef(new Animated.Value(0)).current;

  // ── Drag lifecycle ──────────────────────────────────────────────────────────

  const startDrag = useCallback((idx, pageY) => {
    dragIdxRef.current  = idx;
    insertAtRef.current = idx;
    dragStartYRef.current = pageY;
    dragDy.setValue(0);
    setDragIdx(idx);
    setInsertAt(idx);
  }, [dragDy]);

  const moveDrag = useCallback((pageY) => {
    const dy = pageY - dragStartYRef.current;
    dragDy.setValue(dy);

    const newInsert = clamp(
      Math.round((dragIdxRef.current * ITEM_H + dy) / ITEM_H),
      0,
      items.length - 1,
    );
    if (newInsert !== insertAtRef.current) {
      insertAtRef.current = newInsert;
      setInsertAt(newInsert);
    }
  }, [dragDy, items.length]);

  const endDrag = useCallback(() => {
    const from = dragIdxRef.current;
    const to   = insertAtRef.current;

    if (from >= 0 && from !== to) {
      setItems(prev => {
        const next   = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
        return next;
      });
    }

    dragIdxRef.current  = -1;
    insertAtRef.current = -1;

    Animated.timing(dragDy, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setDragIdx(-1);
      setInsertAt(-1);
    });
  }, [dragDy, onReorder]);

  // ── Per-item Responder props ────────────────────────────────────────────────
  // NOTE: created inline per render — acceptable for small lists (≤30 books)

  const makeHandleProps = useCallback((idx) => ({
    onStartShouldSetResponder:         () => true,
    onMoveShouldSetResponder:          () => true,
    onStartShouldSetResponderCapture:  () => true,
    onMoveShouldSetResponderCapture:   () => true,
    onResponderGrant:     (e) => startDrag(idx, e.nativeEvent.pageY),
    onResponderMove:      (e) => moveDrag(e.nativeEvent.pageY),
    onResponderRelease:   endDrag,
    onResponderTerminate: endDrag,
  }), [startDrag, moveDrag, endDrag]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      scrollEnabled={dragIdx < 0}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: listPaddingBottom }}
    >
      {items.map((book, idx) => {
        const isActive = idx === dragIdx;

        // Show teal insert line ABOVE this item when it's the target (and not adjacent to the dragged item itself)
        const showLineBefore =
          dragIdx >= 0 &&
          insertAt === idx &&
          insertAt !== dragIdx &&
          !(dragIdx + 1 === insertAt); // avoid showing line right below the dragged slot

        // Show teal insert line AFTER the last item when dragIdx is not the last item
        const isLast          = idx === items.length - 1;
        const showLineAfter   =
          isLast &&
          dragIdx >= 0 &&
          insertAt === items.length - 1 &&
          dragIdx !== items.length - 1 &&
          dragIdx < insertAt;

        return (
          <Fragment key={book.id}>
            {showLineBefore && <InsertLine C={C} />}

            <Animated.View
              style={[
                { marginHorizontal: 16, marginBottom: 10 },
                isActive && {
                  transform:     [{ translateY: dragDy }],
                  zIndex:        100,
                  elevation:     10,
                  shadowColor:   C.primary,
                  shadowOffset:  { width: 0, height: 6 },
                  shadowOpacity: 0.22,
                  shadowRadius:  12,
                  opacity:       0.97,
                },
              ]}
            >
              <DragBookCard
                item={book}
                index={idx}
                isActive={isActive}
                handleProps={makeHandleProps(idx)}
                onPress={() => onBookPress(book)}
                onMenu={(anchor) => onBookMenu(book, anchor)}
                C={C}
                Font={Font}
              />
            </Animated.View>

            {showLineAfter && <InsertLine C={C} />}
          </Fragment>
        );
      })}
    </ScrollView>
  );
}

// ── Card styles (created per render via useMemo in parent, passed as C/Font) ──

const cardStyles = (C, Font) => StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 50, borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 6, paddingLeft: 6, paddingRight: 14,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: C.primary,
  },
  handle: {
    paddingHorizontal: 10, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  handleDivider: { width: 1, height: 28, backgroundColor: C.border, marginRight: 4 },
  body:   { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  iconBox:{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconText:{ fontSize: 15, fontFamily: Font.extraBold },
  info:   { flex: 1, marginRight: 8 },
  name:   { fontSize: 14, fontFamily: Font.semiBold, color: C.text,      lineHeight: 20 },
  date:   { fontSize: 12, fontFamily: Font.regular,  color: C.textMuted, lineHeight: 18, marginTop: 2 },
  right:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, minWidth: 56, alignItems: 'center' },
  pillText:{ fontSize: 13, fontFamily: Font.bold, lineHeight: 18 },
  moreBtn:{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
