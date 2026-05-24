import { type MutableRefObject, useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import type { WorkoutExerciseEntry } from '@/store/workout';
import { ExerciseCard } from './ExerciseCard';

// Height of one collapsed card (header 44px) + its marginBottom (12px)
const ITEM_HEIGHT = 56;

const SPRING = { damping: 20, stiffness: 250 };

interface Props {
  exercises: WorkoutExerciseEntry[];
  onReorder: (newOrder: WorkoutExerciseEntry[]) => void;
  onDeleteExercise: (workoutExerciseId: number) => void;
  exerciseFocusers: MutableRefObject<Map<number, () => void>>;
}

export function DraggableExerciseList({ exercises, onReorder, onDeleteExercise, exerciseFocusers }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const frozenOrder = useRef<WorkoutExerciseEntry[]>([]);

  const draggingIndexSV = useSharedValue(-1);
  const hoveredIndexSV = useSharedValue(-1);
  const floatY = useSharedValue(0);

  // While dragging, render frozenOrder so indices are stable throughout the gesture
  const renderOrder = isDragging ? frozenOrder.current : exercises;
  const n = renderOrder.length;

  const startDrag = useCallback(() => {
    frozenOrder.current = [...exercises];
    setIsDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [exercises]);

  const endDrag = useCallback(
    (fromIndex: number, toIndex: number) => {
      draggingIndexSV.value = -1;
      hoveredIndexSV.value = -1;
      floatY.value = 0;
      const newOrder = [...frozenOrder.current];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      setIsDragging(false);
      onReorder(newOrder);
    },
    [onReorder, draggingIndexSV, hoveredIndexSV, floatY]
  );

  // Stable refs so gesture worklets always call latest version
  const startDragRef = useRef(startDrag);
  startDragRef.current = startDrag;
  const endDragRef = useRef(endDrag);
  endDragRef.current = endDrag;

  const stableStartDrag = useCallback(() => startDragRef.current(), []);
  const stableEndDrag = useCallback((from: number, to: number) => endDragRef.current(from, to), []);

  return (
    <View>
      {renderOrder.map((exercise, idx) => (
        <DraggableCardWrapper
          key={exercise.workoutExerciseId}
          exercise={exercise}
          cardIndex={idx}
          totalCount={n}
          draggingIndexSV={draggingIndexSV}
          hoveredIndexSV={hoveredIndexSV}
          floatY={floatY}
          isDragging={isDragging}
          onDragStart={stableStartDrag}
          onDragEnd={stableEndDrag}
          onDeleteExercise={onDeleteExercise}
          nextExercise={renderOrder[idx + 1]}
          exerciseFocusers={exerciseFocusers}
        />
      ))}
    </View>
  );
}

interface CardWrapperProps {
  exercise: WorkoutExerciseEntry;
  cardIndex: number;
  totalCount: number;
  draggingIndexSV: SharedValue<number>;
  hoveredIndexSV: SharedValue<number>;
  floatY: SharedValue<number>;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: (from: number, to: number) => void;
  onDeleteExercise: (id: number) => void;
  nextExercise: WorkoutExerciseEntry | undefined;
  exerciseFocusers: MutableRefObject<Map<number, () => void>>;
}

function DraggableCardWrapper({
  exercise,
  cardIndex,
  totalCount,
  draggingIndexSV,
  hoveredIndexSV,
  floatY,
  isDragging,
  onDragStart,
  onDragEnd,
  onDeleteExercise,
  nextExercise,
  exerciseFocusers,
}: CardWrapperProps) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(400)
        .onStart(() => {
          'worklet';
          if (draggingIndexSV.value !== -1) return;
          draggingIndexSV.value = cardIndex;
          hoveredIndexSV.value = cardIndex;
          floatY.value = 0;
          runOnJS(onDragStart)();
        })
        .onUpdate((e) => {
          'worklet';
          if (draggingIndexSV.value !== cardIndex) return;
          floatY.value = e.translationY;
          const rawIdx = cardIndex + e.translationY / ITEM_HEIGHT;
          hoveredIndexSV.value = Math.max(0, Math.min(totalCount - 1, Math.round(rawIdx)));
        })
        .onEnd(() => {
          'worklet';
          if (draggingIndexSV.value !== cardIndex) return;
          const from = draggingIndexSV.value;
          const to = hoveredIndexSV.value;
          runOnJS(onDragEnd)(from, to);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardIndex, totalCount]
  );

  const animStyle = useAnimatedStyle(() => {
    const activeDragIdx = draggingIndexSV.value;

    if (activeDragIdx === -1) {
      return { transform: [{ translateY: withSpring(0, SPRING) }] };
    }

    if (activeDragIdx === cardIndex) {
      return {
        transform: [{ translateY: floatY.value }],
        zIndex: 1000,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        opacity: 0.93,
      };
    }

    const hovered = hoveredIndexSV.value;
    let shift = 0;
    if (cardIndex > activeDragIdx && cardIndex <= hovered) shift = -1;
    else if (cardIndex < activeDragIdx && cardIndex >= hovered) shift = 1;

    return {
      transform: [{ translateY: withSpring(shift * ITEM_HEIGHT, SPRING) }],
    };
  });

  return (
    <Animated.View style={animStyle}>
      <GestureDetector gesture={gesture}>
        <View>
          <ExerciseCard
            workoutExercise={exercise}
            collapsed={isDragging}
            onDeleteExercise={onDeleteExercise}
            onRegisterFocusFirst={(fn) => {
              if (fn) exerciseFocusers.current.set(exercise.workoutExerciseId, fn);
              else exerciseFocusers.current.delete(exercise.workoutExerciseId);
            }}
            onNextExercise={
              nextExercise
                ? () => exerciseFocusers.current.get(nextExercise.workoutExerciseId)?.()
                : undefined
            }
          />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
