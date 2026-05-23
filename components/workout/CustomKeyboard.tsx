import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutKeyboard } from '@/context/WorkoutKeyboardContext';

const ROW_H = 56;
const ROWS = 4;
export const KEYBOARD_CONTENT_HEIGHT = ROW_H * ROWS;

export function CustomKeyboard() {
  const {
    mode, isTimerInput, timerIsPaused,
    hide, numberHandlerRef, timerHandlerRef, setTimerPaused, activeNodeRef,
  } = useWorkoutKeyboard();
  const insets = useSafeAreaInsets();

  if (mode === 'hidden') return null;

  const keepFocus = () => activeNodeRef.current?.focus();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.separator} />
      {mode === 'number' ? (
        <NumberKeyboard
          isTimerInput={isTimerInput}
          onKey={(k) => { keepFocus(); numberHandlerRef.current.onKey(k); }}
          onBackspace={() => { keepFocus(); numberHandlerRef.current.onBackspace(); }}
          onIncrement={(d) => { keepFocus(); numberHandlerRef.current.onIncrement(d); }}
          onNext={() => numberHandlerRef.current.onNext()}
          onHide={hide}
        />
      ) : (
        <TimerKeyboard
          isPaused={timerIsPaused}
          onPause={() => {
            setTimerPaused(!timerIsPaused);
            timerHandlerRef.current.onPause();
          }}
          onAdjust={(d) => timerHandlerRef.current.onAdjust(d)}
          onReset={() => timerHandlerRef.current.onReset()}
          onSkip={() => timerHandlerRef.current.onSkip()}
          onHide={hide}
        />
      )}
    </View>
  );
}

// ─── Number keyboard ──────────────────────────────────────────────────────────

const NUM_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

interface NumberKeyboardProps {
  isTimerInput: boolean;
  onKey: (k: string) => void;
  onBackspace: () => void;
  onIncrement: (delta: number) => void;
  onNext: () => void;
  onHide: () => void;
}

function NumberKeyboard({ isTimerInput, onKey, onBackspace, onIncrement, onNext, onHide }: NumberKeyboardProps) {
  const renderKey = (k: string) => {
    const label = k === '.' && isTimerInput ? ':' : k;
    const action = () => {
      if (k === '⌫') { onBackspace(); return; }
      onKey(k === '.' && isTimerInput ? ':' : k);
    };
    return (
      <TouchableOpacity key={k} style={styles.numKey} onPressIn={action}>
        <Text style={styles.numKeyText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.keyboard}>
      <View style={styles.grid}>
        {NUM_ROWS.map((row, i) => (
          <View key={i} style={styles.gridRow}>
            {row.map(renderKey)}
          </View>
        ))}
      </View>
      <View style={styles.sideCol}>
        <TouchableOpacity style={styles.sideKey} onPress={onHide}>
          <Text style={styles.hideIcon}>⌨</Text>
          <Text style={styles.hideArrow}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sideKey} onPressIn={onBackspace}>
          <Text style={styles.numKeyText}>⌫</Text>
        </TouchableOpacity>
        <View style={[styles.sideKey, styles.incrCell]}>
          <TouchableOpacity style={styles.incrHalf} onPressIn={() => onIncrement(-1)}>
            <Text style={styles.numKeyText}>−</Text>
          </TouchableOpacity>
          <View style={styles.incrDivider} />
          <TouchableOpacity style={styles.incrHalf} onPressIn={() => onIncrement(1)}>
            <Text style={styles.numKeyText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.sideKey, styles.accentKey]} onPressIn={onNext}>
          <Text style={styles.accentText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Timer keyboard ───────────────────────────────────────────────────────────

interface TimerKeyboardProps {
  isPaused: boolean;
  onPause: () => void;
  onAdjust: (delta: number) => void;
  onReset: () => void;
  onSkip: () => void;
  onHide: () => void;
}

function TimerKeyboard({ isPaused, onPause, onAdjust, onReset, onSkip, onHide }: TimerKeyboardProps) {
  return (
    <View style={styles.keyboard}>
      <TouchableOpacity style={styles.pauseArea} onPress={onPause} activeOpacity={0.75}>
        <View style={styles.pauseCircle}>
          <Text style={styles.pauseText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.sideCol}>
        <TouchableOpacity style={styles.sideKey} onPress={onHide}>
          <Text style={styles.hideIcon}>⌨</Text>
          <Text style={styles.hideArrow}>↓</Text>
        </TouchableOpacity>
        <View style={[styles.sideKey, styles.incrCell]}>
          <TouchableOpacity style={styles.incrHalf} onPress={() => onAdjust(-10)}>
            <Text style={styles.numKeyText}>−</Text>
          </TouchableOpacity>
          <View style={styles.incrDivider} />
          <TouchableOpacity style={styles.incrHalf} onPress={() => onAdjust(10)}>
            <Text style={styles.numKeyText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.sideKey} onPress={onReset}>
          <Text style={styles.sideKeyLabel}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sideKey, styles.accentKey]} onPress={onSkip}>
          <Text style={styles.accentText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#48484A',
  },
  keyboard: {
    flexDirection: 'row',
    height: KEYBOARD_CONTENT_HEIGHT,
  },

  // Number grid
  grid: {
    flex: 3,
    flexDirection: 'column',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  numKey: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#48484A',
  },
  numKeyText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '400',
  },

  // Side column
  sideCol: {
    flex: 1,
    flexDirection: 'column',
  },
  sideKey: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3C',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#48484A',
  },
  sideKeyLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hideIcon: {
    fontSize: 17,
    color: '#FFFFFF',
  },
  hideArrow: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: -2,
  },

  // Increment cell
  incrCell: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  incrHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#48484A',
  },

  // Accent (Next / Skip) button
  accentKey: {
    backgroundColor: '#007AFF',
  },
  accentText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Pause button area
  pauseArea: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#48484A',
  },
  pauseCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
