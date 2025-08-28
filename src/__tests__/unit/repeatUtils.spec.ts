import { EventForm } from '../../types';
import {
  createRepeatingEvents,
  isLeapYear,
  getLastDayOfMonth,
  shouldCreateEventForDate,
} from '../../utils/repeatUtils';

const createTestEvent = (overrides: Partial<EventForm> = {}): EventForm => ({
  title: '테스트 이벤트',
  date: '2025-08-01',
  startTime: '10:00',
  endTime: '11:00',
  description: '테스트 설명',
  location: '테스트 장소',
  category: '업무',
  repeat: {
    type: 'none',
    interval: 1,
    endDate: '2025-10-30',
  },
  notificationTime: 10,
  ...overrides,
});

describe('반복 일정 유틸리티', () => {
  describe('isLeapYear', () => {
    it('4로 나누어 떨어지고 100으로 나누어 떨어지지 않는 해는 윤년이다', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
    });

    it('100으로 나누어 떨어지지만 400으로 나누어 떨어지지 않는 해는 윤년이 아니다', () => {
      expect(isLeapYear(1900)).toBe(false);
      expect(isLeapYear(2100)).toBe(false);
    });

    it('400으로 나누어 떨어지는 해는 윤년이다', () => {
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2400)).toBe(true);
    });

    it('그 외의 해는 윤년이 아니다', () => {
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
    });
  });

  describe('getLastDayOfMonth', () => {
    it('월별 마지막 날짜를 반환한다', () => {
      expect(getLastDayOfMonth(2023, 1)).toBe(31);
      expect(getLastDayOfMonth(2023, 2)).toBe(28);
      expect(getLastDayOfMonth(2024, 2)).toBe(29);
      expect(getLastDayOfMonth(2023, 4)).toBe(30);
    });
  });

  describe('shouldCreateEventForDate', () => {
    const baseEvent = createTestEvent({
      date: '2025-08-15',
      repeat: {
        type: 'monthly',
        interval: 1,
        endDate: '2025-10-30',
      },
    });

    it('매일 반복: 간격에 따라 날짜 확인', () => {
      const dailyEvent: EventForm = {
        ...baseEvent,
        repeat: { type: 'daily', interval: 2, endDate: '2025-10-30' },
      };

      expect(shouldCreateEventForDate(dailyEvent, new Date('2025-08-15'))).toBe(true);
      expect(shouldCreateEventForDate(dailyEvent, new Date('2025-08-17'))).toBe(true);
      expect(shouldCreateEventForDate(dailyEvent, new Date('2025-08-19'))).toBe(true);
      expect(shouldCreateEventForDate(dailyEvent, new Date('2025-08-16'))).toBe(false);
      expect(shouldCreateEventForDate(dailyEvent, new Date('2025-08-18'))).toBe(false);
    });

    it('매주 반복: 간격과 요일 확인', () => {
      const weeklyEvent: EventForm = {
        ...baseEvent,
        repeat: { type: 'weekly', interval: 2, endDate: '2025-10-30' },
      };

      expect(shouldCreateEventForDate(weeklyEvent, new Date('2025-08-15'))).toBe(true);
      expect(shouldCreateEventForDate(weeklyEvent, new Date('2025-08-29'))).toBe(true);
      expect(shouldCreateEventForDate(weeklyEvent, new Date('2025-09-12'))).toBe(true);
      expect(shouldCreateEventForDate(weeklyEvent, new Date('2025-08-22'))).toBe(false);
      expect(shouldCreateEventForDate(weeklyEvent, new Date('2025-08-16'))).toBe(false);
    });

    it('매월 반복: 같은 날짜에 반복', () => {
      const monthlyEvent: EventForm = {
        ...baseEvent,
        repeat: { type: 'monthly', interval: 1, endDate: '2025-10-30' },
      };

      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-08-15'))).toBe(true);
      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-09-15'))).toBe(true);
      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-10-15'))).toBe(true);
      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-09-14'))).toBe(false);
      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-09-16'))).toBe(false);
    });

    it('매월 반복: 매월 31일에 설정했을 때 해당 월에 31일이 없는 경우', () => {
      const monthlyEvent: EventForm = {
        ...baseEvent,
        date: '2025-08-31',
        repeat: { type: 'monthly', interval: 1, endDate: '2025-10-31' },
      };

      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-08-31'))).toBe(true);
      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-09-30'))).toBe(false);
      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-09-29'))).toBe(false);
      expect(shouldCreateEventForDate(monthlyEvent, new Date('2025-10-31'))).toBe(true);
    });

    it('매년 반복: 같은 월/일에 반복', () => {
      const yearlyEvent: EventForm = {
        ...baseEvent,
        date: '2025-08-15',
        repeat: { type: 'yearly', interval: 1, endDate: '2025-10-30' },
      };

      expect(shouldCreateEventForDate(yearlyEvent, new Date('2025-08-15'))).toBe(true);
      expect(shouldCreateEventForDate(yearlyEvent, new Date('2026-08-15'))).toBe(false);
    });

    it('매년 반복: 2월 29일(윤년)에 설정했을 때', () => {
      const yearlyEvent: EventForm = {
        ...baseEvent,
        date: '2024-02-29',
        repeat: { type: 'yearly', interval: 1, endDate: '2025-10-30' },
      };

      expect(shouldCreateEventForDate(yearlyEvent, new Date('2024-02-29'))).toBe(true);
      expect(shouldCreateEventForDate(yearlyEvent, new Date('2025-02-28'))).toBe(false);
      expect(shouldCreateEventForDate(yearlyEvent, new Date('2025-03-01'))).toBe(false);
    });

    it('종료일 있는 경우: 종료일 이후에는 반복하지 않음', () => {
      const eventWithEndDate: EventForm = {
        ...baseEvent,
        repeat: {
          type: 'daily',
          interval: 1,
          endDate: '2025-10-30',
        },
      };

      expect(shouldCreateEventForDate(eventWithEndDate, new Date('2025-08-15'))).toBe(true);
      expect(shouldCreateEventForDate(eventWithEndDate, new Date('2025-10-29'))).toBe(true);
      expect(shouldCreateEventForDate(eventWithEndDate, new Date('2025-10-30'))).toBe(true);
      expect(shouldCreateEventForDate(eventWithEndDate, new Date('2025-10-31'))).toBe(false);
    });
  });

  describe('createRepeatingEvents', () => {
    it('반복 일정을 생성하여 모든 날짜에 이벤트를 생성한다', () => {
      const baseEvent = createTestEvent({
        date: '2025-08-15',
        repeat: {
          type: 'daily',
          interval: 2,
          endDate: '2025-08-21',
        },
      });

      const repeatingEvents = createRepeatingEvents(baseEvent);

      expect(repeatingEvents.length).toBe(4);

      expect(repeatingEvents[0].date).toBe('2025-08-15');
      expect(repeatingEvents[1].date).toBe('2025-08-17');
      expect(repeatingEvents[2].date).toBe('2025-08-19');
      expect(repeatingEvents[3].date).toBe('2025-08-21');

      repeatingEvents.forEach((event) => {
        expect(event.title).toBe(baseEvent.title);
        expect(event.startTime).toBe(baseEvent.startTime);
        expect(event.endTime).toBe(baseEvent.endTime);
        expect(event.repeat.type).toBe(baseEvent.repeat.type);
        expect(event.repeat.interval).toBe(baseEvent.repeat.interval);
      });
    });

    it('반복 일정이 아닌 경우 빈 배열을 반환한다', () => {
      const nonRepeatingEvent = createTestEvent({
        repeat: { type: 'none', interval: 1, endDate: '2025-10-30' },
      });

      const events = createRepeatingEvents(nonRepeatingEvent);
      expect(events.length).toBe(0);
    });

    it('월간 반복: 31일 설정시 해당 월의 마지막 날에 생성', () => {
      const monthlyEvent = createTestEvent({
        date: '2025-08-31',
        repeat: {
          type: 'monthly',
          interval: 1,
          endDate: '2025-09-30',
        },
      });

      const repeatingEvents = createRepeatingEvents(monthlyEvent);

      expect(repeatingEvents.length).toBe(1);

      expect(repeatingEvents[0].date).toBe('2025-08-31');
    });

    it('연간 반복: 윤년 2월 29일 설정시 윤년에만 생성', () => {
      const yearlyEvent = createTestEvent({
        date: '2024-02-29',
        repeat: {
          type: 'yearly',
          interval: 1,
          endDate: '2025-02-29',
        },
      });

      const repeatingEvents = createRepeatingEvents(yearlyEvent);

      expect(repeatingEvents.length).toBe(1);

      expect(repeatingEvents[0].date).toBe('2024-02-29');
    });
  });
});
