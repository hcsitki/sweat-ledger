import { createContext, useContext, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { TextInput } from 'react-native';

export interface NumberHandler {
  onKey: (key: string) => void;
  onBackspace: () => void;
  onIncrement: (delta: number) => void;
  onNext: () => void;
}

export interface TimerHandler {
  onPause: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  onReset: () => void;
}

export type KeyboardMode = 'hidden' | 'number' | 'timer';

interface CtxValue {
  mode: KeyboardMode;
  isTimerInput: boolean;
  timerIsPaused: boolean;
  showNumber: (h: NumberHandler, opts?: { isTimerInput?: boolean }) => void;
  showTimer: (h: TimerHandler, paused?: boolean) => void;
  setTimerPaused: (v: boolean) => void;
  hide: () => void;
  numberHandlerRef: MutableRefObject<NumberHandler>;
  timerHandlerRef: MutableRefObject<TimerHandler>;
  activeNodeRef: MutableRefObject<TextInput | null>;
}

const noop = () => {};
const defaultNumber: NumberHandler = { onKey: noop, onBackspace: noop, onIncrement: noop, onNext: noop };
const defaultTimer: TimerHandler = { onPause: noop, onSkip: noop, onAdjust: noop, onReset: noop };

const Ctx = createContext<CtxValue | null>(null);

export function WorkoutKeyboardProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<KeyboardMode>('hidden');
  const [isTimerInput, setIsTimerInput] = useState(false);
  const [timerIsPaused, setTimerIsPaused] = useState(false);
  const numberHandlerRef = useRef<NumberHandler>(defaultNumber);
  const timerHandlerRef = useRef<TimerHandler>(defaultTimer);
  const activeNodeRef = useRef<TextInput | null>(null);

  return (
    <Ctx.Provider
      value={{
        mode,
        isTimerInput,
        timerIsPaused,
        showNumber: (h, opts) => {
          numberHandlerRef.current = h;
          setIsTimerInput(opts?.isTimerInput ?? false);
          setMode('number');
        },
        showTimer: (h, paused = false) => {
          timerHandlerRef.current = h;
          setTimerIsPaused(paused);
          setIsTimerInput(false);
          setMode('timer');
        },
        setTimerPaused: setTimerIsPaused,
        hide: () => {
          activeNodeRef.current?.blur();
          activeNodeRef.current = null;
          setMode('hidden');
        },
        numberHandlerRef,
        timerHandlerRef,
        activeNodeRef,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWorkoutKeyboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkoutKeyboard requires WorkoutKeyboardProvider');
  return ctx;
}
