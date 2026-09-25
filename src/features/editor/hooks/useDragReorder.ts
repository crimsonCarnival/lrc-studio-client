import { useState } from 'react';
import type { DragEvent, Dispatch, SetStateAction } from 'react';
import type { EditorLine } from '@/features/editor/services/editor.service';
import { moveLineBlock } from '@/features/editor/utils/sections';

interface DragReorderOptions {
  lines: EditorLine[];
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  /** Hands the move's old→new index map to useEditor's index-state remapping. */
  recordIndexMap: (indexMap: number[]) => void;
  /** Exclusive end of the hidden block when `index` is a collapsed section header, else null. */
  getCollapsedBlockEnd: (index: number) => number | null;
}

export function useDragReorder({ lines, setLines, recordIndexMap, getCollapsedBlockEnd }: DragReorderOptions) {
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
    // A collapsed section moves as a unit (header + everything it hides); a dragged line
    // dropped on a collapsed header lands after that header's whole block.
    const end = getCollapsedBlockEnd(dragIndex) ?? dragIndex + 1;
    const dropEnd = getCollapsedBlockEnd(dropIndex) ?? dropIndex + 1;
    const { lines: next, indexMap } = moveLineBlock(lines, dragIndex, end, dropIndex, dropEnd);
    if (next !== lines) {
      // useEditor remaps selection / active line / other index state with this exact map.
      recordIndexMap(indexMap);
      setLines(next);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return { dragIndex, dragOverIndex, handleDragStart, handleDragOver, handleDragEnd, handleDrop };
}
