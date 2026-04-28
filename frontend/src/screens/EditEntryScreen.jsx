import React, { useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import SafeAreaView from '../components/ui/AppSafeAreaView';
import Toast from '../lib/toast';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';
import { apiGetEntries, apiUpdateEntry, apiDeleteEntry } from '../lib/api';
import EntryForm from '../components/entry/EntryForm';
import { ChevronLeftIcon, TrashIcon } from '../components/ui/Icons';

export default function EditEntryScreen() {
  const router = useRouter();
  const { id, eid } = useLocalSearchParams();
  const { C, Font, isDark } = useTheme();
  const s = useMemo(() => makeStyles(C, Font), [C, Font]);
  const qc = useQueryClient();
  const formRef = useRef();

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', id],
    queryFn: () => apiGetEntries(id),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  });

  const entry = entries.find(e => e.id === eid);

  const updateEntry = useMutation({
    mutationFn: (payload) => apiUpdateEntry(id, eid, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', id] });
      qc.invalidateQueries({ queryKey: ['summary', id] });
      qc.invalidateQueries({ queryKey: ['books'] });
      router.back();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to update entry', text2: 'Please try again.' }),
  });

  const deleteEntry = useMutation({
    mutationFn: () => apiDeleteEntry(id, eid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', id] });
      qc.invalidateQueries({ queryKey: ['summary', id] });
      qc.invalidateQueries({ queryKey: ['books'] });
      router.back();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to delete entry', text2: 'Please try again.' }),
  });

  const handleUpdate = () => {
    if (!formRef.current?.validate()) {
      Toast.show({ type: 'error', text1: 'Invalid amount', text2: 'Please enter a valid amount.' });
      return;
    }
    updateEntry.mutate(formRef.current.getValues());
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry.mutate() },
      ]
    );
  };

  if (!entry) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: Font.regular, color: C.textMuted, fontSize: 14 }}>
            Entry not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.card} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeftIcon color={C.text} size={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Entry</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={s.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          disabled={deleteEntry.isPending}
        >
          <TrashIcon color="#DC2626" size={20} />
        </TouchableOpacity>
      </View>

      <EntryForm ref={formRef} bookId={id} initialValues={entry} showTypeToggle />

      <View style={s.saveContainer}>
        <TouchableOpacity
          style={[s.saveBtn, (updateEntry.isPending || deleteEntry.isPending) && { opacity: 0.6 }]}
          onPress={handleUpdate}
          disabled={updateEntry.isPending || deleteEntry.isPending}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>{updateEntry.isPending ? 'SAVING…' : 'UPDATE'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (C, Font) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, minHeight: 56,
  },
  headerBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: Font.bold, color: C.text, lineHeight: 24, textAlign: 'center' },

  saveContainer: {
    padding: 16, borderTopWidth: 1,
    backgroundColor: C.card, borderTopColor: C.border,
  },
  saveBtn:     { borderRadius: 14, paddingVertical: 16, alignItems: 'center', minHeight: 52, backgroundColor: C.primary },
  saveBtnText: { color: '#fff', fontFamily: Font.extraBold, fontSize: 14, letterSpacing: 0.8, lineHeight: 20 },
});
