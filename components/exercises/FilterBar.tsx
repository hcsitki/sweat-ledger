import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  label?: string;
}

export function FilterBar({ options, selected, onSelect, label }: Props) {
  const bar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.chip, selected === opt && styles.chipActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (label) {
    return (
      <View style={styles.labeled}>
        <Text style={styles.labelText}>{label}</Text>
        {bar}
      </View>
    );
  }

  return bar;
}

const styles = StyleSheet.create({
  labeled: { gap: 8 },
  labelText: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 },
  scroll: { flexGrow: 0, flexShrink: 0 },
  content: { paddingHorizontal: 12, gap: 8, paddingVertical: 4 },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#333', fontSize: 14 },
  chipTextActive: { color: '#fff', fontSize: 14 },
});
