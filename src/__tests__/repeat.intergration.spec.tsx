import { act, renderHook } from '@testing-library/react';

import {
  setupMockHandlerRepeatCreation,
  setupMockHandlerRepeatDeletion,
  setupMockHandlerRepeatUpdating,
} from '../__mocks__/handlersUtils.ts';
import { useEventOperations } from '../hooks/useEventOperations.ts';
import { Event, EventForm } from '../types.ts';

describe('반복 일정 테스트', () => {
  const createEvent = (override: Partial<EventForm>): EventForm => ({
    title: '반복 일정 테스트',
    date: '2025-08-01',
    startTime: '10:00',
    endTime: '11:00',
    description: '',
    location: '',
    category: '',
    notificationTime: 0,
    repeat: { type: 'none', interval: 0, endDate: '2025-10-30' },
    ...override,
  });

  it('반복 유형 선택 시 매일 설정된 간격만큼 이벤트가 생성된다', async () => {
    setupMockHandlerRepeatCreation();
    const { result } = renderHook(() => useEventOperations(false));
    const event = createEvent({
      repeat: { type: 'daily', interval: 1, endDate: '2025-08-03' },
    });
    await act(async () => await result.current.saveEvent(event));

    // 디버깅을 위한 로그 추가
    console.log('Actual events:', JSON.stringify(result.current.events, null, 2), '테스트');

    expect(result.current.events).toEqual([
      { ...event, id: '1', date: '2025-08-01' },
      { ...event, id: '2', date: '2025-08-02' },
      { ...event, id: '3', date: '2025-08-03' },
    ]);
  });

  it('반복 간격 설정 시 간격이 적용되어 생성된다 (격일)', async () => {
    setupMockHandlerRepeatCreation();
    const { result } = renderHook(() => useEventOperations(false));
    const event = createEvent({
      repeat: { type: 'daily', interval: 2, endDate: '2025-08-05' },
    });
    await act(async () => await result.current.saveEvent(event));

    expect(result.current.events).toEqual([
      { ...event, id: '1', date: '2025-08-01' },
      { ...event, id: '2', date: '2025-08-03' },
      { ...event, id: '3', date: '2025-08-05' },
    ]);
  });

  it('종료일이 지정되지 않은 경우 시스템 종료일인 2025-10-30까지만 생성된다', async () => {
    setupMockHandlerRepeatCreation();
    const { result } = renderHook(() => useEventOperations(false));
    const event = createEvent({
      repeat: { type: 'monthly', interval: 1 },
    });
    await act(async () => await result.current.saveEvent(event));

    expect(result.current.events).toEqual([
      { ...event, id: '1', date: '2025-08-01' },
      { ...event, id: '2', date: '2025-09-01' },
      { ...event, id: '3', date: '2025-10-01' },
    ]);

    // 11월 이후의 날짜가 생성되지 않음을 검증
    const novemberEvent = result.current.events.find((event) => event.date === '2025-11-01');
    expect(novemberEvent).toBeUndefined();
  });

  it('반복 일정의 특정 인스턴스를 수정하면 단일 일정이 되며 repeat.type이 none으로 설정된다', async () => {
    const initialEvent: Event = {
      id: '1',
      title: '반복 일정',
      date: '2025-08-01',
      startTime: '09:00',
      endTime: '10:00',
      description: '',
      location: '',
      category: '',
      notificationTime: 0,
      repeat: { type: 'daily', interval: 1, endDate: '2025-08-30' },
    };

    setupMockHandlerRepeatUpdating([initialEvent]);
    const { result } = renderHook(() => useEventOperations(true));

    await act(
      async () => await result.current.saveEvent({ ...initialEvent, title: '수정된 일정' })
    );
    expect(result.current.events[0].repeat.type).toBe('none');
  });

  it('반복 일정의 특정 인스턴스를 삭제하면 해당 인스턴스만 삭제된다', async () => {
    setupMockHandlerRepeatCreation();
    // 반복 일정 생성
    const event = createEvent({
      repeat: { type: 'daily', interval: 1, endDate: '2025-08-03' },
    });
    const createdEvent = [
      { ...event, id: '1', date: '2025-08-01' },
      { ...event, id: '2', date: '2025-08-02' },
      { ...event, id: '3', date: '2025-08-03' },
    ];
    setupMockHandlerRepeatDeletion(createdEvent);

    const { result } = renderHook(() => useEventOperations(false));

    // 이벤트가 정상적으로 저장되었는지 확인
    await act(async () => await result.current.saveEvent(createdEvent[0]));
    await act(async () => await result.current.saveEvent(createdEvent[1]));
    await act(async () => await result.current.saveEvent(createdEvent[2]));
    expect(result.current.events).toEqual(createdEvent);

    // 삭제 호출 (id: '1' 삭제)
    await act(async () => await result.current.deleteEvent('1'));

    await act(() => Promise.resolve(null));
    // 삭제 후, id가 '1'인 이벤트가 배열에서 제거된 상태로 검증
    expect(result.current.events).toEqual([
      { ...event, id: '2', date: '2025-08-02' },
      { ...event, id: '3', date: '2025-08-03' },
    ]);
  });
  it('매년 반복 일정은 윤년 2월 29일일 경우 평년에는 건너뛴다', async () => {
    setupMockHandlerRepeatCreation();
    const { result } = renderHook(() => useEventOperations(false));
    const event = createEvent({
      date: '2020-02-29', // 2020년은 윤년
      repeat: { type: 'yearly', interval: 1, endDate: '2025-03-01' },
    });
    await act(async () => await result.current.saveEvent(event));

    expect(result.current.events).toEqual([
      { ...event, id: '1', date: '2020-02-29' },
      { ...event, id: '2', date: '2024-02-29' },
    ]);
  });

  it('반복 간격이 적용된 주간 반복에서 요일이 일치하는 날짜에만 생성된다', async () => {
    setupMockHandlerRepeatCreation();
    const { result } = renderHook(() => useEventOperations(false));
    const event = createEvent({
      date: '2025-08-07',
      repeat: { type: 'weekly', interval: 1, endDate: '2025-08-21' },
    });
    await act(async () => await result.current.saveEvent(event));

    expect(result.current.events).toEqual([
      { ...event, id: '1', date: '2025-08-07' },
      { ...event, id: '2', date: '2025-08-14' },
      { ...event, id: '3', date: '2025-08-21' },
    ]);
  });

  it('반복 없음 설정 시 단일 일정만 생성된다', async () => {
    setupMockHandlerRepeatCreation();
    const { result } = renderHook(() => useEventOperations(false));
    const event = createEvent({
      repeat: { type: 'none', interval: 0, endDate: undefined },
    });

    await act(async () => await result.current.saveEvent(event));
    expect(result.current.events).toEqual([{ ...event, id: '1' }]);
  });
});
