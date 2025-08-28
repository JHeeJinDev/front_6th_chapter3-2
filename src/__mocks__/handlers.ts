import { http, HttpResponse } from 'msw';

import { events } from '../__mocks__/response/events.json' assert { type: 'json' };
import { Event } from '../types';

export const handlers = [
  http.get('/api/events', () => {
    return HttpResponse.json({ events });
  }),

  http.post('/api/events', async ({ request }) => {
    const newEvent = (await request.json()) as Event;
    newEvent.id = String(events.length + 1);
    return HttpResponse.json(newEvent, { status: 201 });
  }),

  http.put('/api/events/:id', async ({ params, request }) => {
    const { id } = params;
    const updatedEvent = (await request.json()) as Event;
    const index = events.findIndex((event) => event.id === id);

    if (index !== -1) {
      return HttpResponse.json({ ...events[index], ...updatedEvent });
    }

    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('/api/events/:id', ({ params }) => {
    const { id } = params;
    const index = events.findIndex((event) => event.id === id);

    if (index !== -1) {
      return new HttpResponse(null, { status: 204 });
    }

    return new HttpResponse(null, { status: 404 });
  }),

  http.post('/api/events-list', async ({ request }) => {
    const { events: requestEvents } = (await request.json()) as { events: Event[] };
    const repeatId = String(events.length + 1);
    const newEvents = requestEvents.map((event, index) => {
      const isRepeatEvent = event.repeat.type !== 'none';
      return {
        ...event,
        id: String(events.length + index + 1),
        repeat: {
          ...event.repeat,
          id: isRepeatEvent ? repeatId : undefined,
        },
      };
    });

    events.push(...newEvents);

    return HttpResponse.json(newEvents, { status: 201 });
  }),

  http.put('/api/events-list', async ({ request }) => {
    const { events: requestEvents } = (await request.json()) as { events: Event[] };
    let isUpdated = false;

    const newEvents = [...events];
    requestEvents.forEach((event) => {
      const index = events.findIndex((target) => target.id === event.id);
      if (index !== -1) {
        isUpdated = true;
        newEvents[index] = { ...events[index], ...event };
      }
    });

    if (isUpdated) {
      events.splice(0, events.length, ...newEvents);
      return HttpResponse.json(newEvents, { status: 200 });
    }

    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('/api/events-list', async ({ request }) => {
    const { eventIds } = (await request.json()) as { eventIds: string[] };
    const remainingEvents = events.filter((event) => !eventIds.includes(event.id));

    events.splice(0, events.length, ...remainingEvents);

    return new HttpResponse(null, { status: 204 });
  }),
];
