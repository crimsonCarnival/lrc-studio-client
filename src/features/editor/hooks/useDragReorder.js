import { useState } from 'react';

export function useDragReorder({ setLines, activeLineIndex, setActiveLineIndex }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
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
    if (activeLineIndex === dragIndex) {
      setActiveLineIndex(dropIndex);
    } else if (dragIndex < activeLineIndex && dropIndex >= activeLineIndex) {
      setActiveLineIndex(activeLineIndex - 1);
    } else if (dragIndex > activeLineIndex && dropIndex <= activeLineIndex) {
      setActiveLineIndex(activeLineIndex + 1);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return { dragIndex, dragOverIndex, handleDragStart, handleDragOver, handleDragEnd, handleDrop };
}
