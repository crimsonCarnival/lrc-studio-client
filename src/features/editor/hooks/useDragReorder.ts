import { useState } from 'react';
import type { DragEvent, Dispatch, SetStateAction } from 'react';
import type { EditorLine } from '@/features/editor/services/editor.service';

interface DragReorderOptions {
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  setActiveLineIndex: Dispatch<SetStateAction<number>>;
}

export function useDragReorder({ setLines, setActiveLineIndex }: DragReorderOptions) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex == null || dragIndex === dropIndex) return;
    setLines((prev) => {
      // Extract timestamps in their current order to preserve them at these indices
      const timestamps = prev.map(l => ({
        timestamp: l.timestamp,
        endTime: l.endTime,
      }));

      // Reorder the line objects themselves
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);

      // Re-apply the original timestamps to the new line order
      return updated.map((line, i) => ({
        ...line,
        timestamp: timestamps[i].timestamp,
        endTime: timestamps[i].endTime,
      }));
    });
    setActiveLineIndex((prevActiveLineIndex) => {
      if (prevActiveLineIndex === dragIndex) {
        return dropIndex;
      } else if (dragIndex < prevActiveLineIndex && dropIndex >= prevActiveLineIndex) {
        return prevActiveLineIndex - 1;
      } else if (dragIndex > prevActiveLineIndex && dropIndex <= prevActiveLineIndex) {
        return prevActiveLineIndex + 1;
      }
      return prevActiveLineIndex;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return { dragIndex, dragOverIndex, handleDragStart, handleDragOver, handleDragEnd, handleDrop };
}
