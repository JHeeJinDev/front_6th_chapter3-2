import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { Event, EventForm } from '../types';
import { createRepeatingEvents } from '../utils/repeatUtils';

function isRepeatingEvent(evt: Event | EventForm): boolean {
  return evt.repeat?.type !== 'none';
}

export const useEventOperations = (editing: boolean, onSave?: () => void) => {
  const [events, setEvents] = useState<Event[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const { events } = await response.json();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      enqueueSnackbar('이벤트 로딩 실패', { variant: 'error' });
    }
  };

  const saveEvent = async (eventData: Event | EventForm) => {
    try {
      const formData = { ...eventData } as EventForm;

      if (editing) {
        // 수정 모드: 반복 일정을 수정하면 단일 일정으로 변경
        const existingEvent = eventData as Event;
        const response = await fetch(`/api/events/${existingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Failed to save event');
      } else {
        // 추가 모드
        if (isRepeatingEvent(formData)) {
          // 반복 일정인 경우
          const repeatEvents = createRepeatingEvents(formData);
          const response = await fetch('/api/events-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: repeatEvents }),
          });
          if (!response.ok) throw new Error('Failed to save repeating events');
        } else {
          // 단일 일정인 경우
          const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          if (!response.ok) throw new Error('Failed to save event');
        }
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(editing ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.', {
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving event:', error);
      enqueueSnackbar('일정 저장 실패', { variant: 'error' });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      await fetchEvents();
      enqueueSnackbar('일정이 삭제되었습니다.', { variant: 'info' });
    } catch (error) {
      console.error('Error deleting event:', error);
      enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
    }
  };

  async function init() {
    await fetchEvents();
    enqueueSnackbar('일정 로딩 완료!', { variant: 'info' });
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { events, fetchEvents, saveEvent, deleteEvent };
};
