
import { LineItem } from '../types';

export const useEditTracking = () => {
  const trackEdit = (original: LineItem, edited: LineItem, roomName: string) => {
    // Only track if something actually changed
    const hasChanges = 
      original.category !== edited.category ||
      original.selector !== edited.selector ||
      original.quantity !== edited.quantity ||
      original.activity !== edited.activity ||
      original.unit !== edited.unit;

    if (!hasChanges) return;

    const event = {
      timestamp: new Date().toISOString(),
      itemId: original.id,
      roomName: roomName,
      changes: {
        category: { from: original.category, to: edited.category },
        selector: { from: original.selector, to: edited.selector },
        quantity: { from: original.quantity, to: edited.quantity },
        activity: { from: original.activity, to: edited.activity },
        unit: { from: original.unit, to: edited.unit }
      }
    };
    
    try {
      // Store locally for now (Mock analytics)
      const existing = JSON.parse(localStorage.getItem('edit_events') || '[]');
      existing.push(event);
      localStorage.setItem('edit_events', JSON.stringify(existing));
      console.log('Edit tracked:', event);
    } catch (e) {
      console.warn('Failed to track edit', e);
    }
  };
  
  return { trackEdit };
};
