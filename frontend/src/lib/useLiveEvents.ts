'use client';

import { useEffect, useRef, useState } from 'react';
import { createEventSource, type LiveState, type StreamEventPayload } from './events';

const DEFAULT_EVENTS = [
  'alert_created',
  'alert_updated',
  'incident_created',
  'incident_updated',
  'activity_created',
  'agent_heartbeat',
  'syslog_ingested',
  'asset_polled',
  'radio_polled',
  'field_measurement_created',
];

export function useLiveEvents(onEvent?: (event: StreamEventPayload, eventName: string) => void, eventNames = DEFAULT_EVENTS) {
  const [state, setState] = useState<LiveState>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const reconnects = useRef(0);
  const eventKey = eventNames.join('|');

  useEffect(() => {
    const names = eventKey.split('|').filter(Boolean);
    const source = createEventSource();
    if (!source) {
      setState('offline');
      return;
    }

    const handleOpen = () => {
      reconnects.current = 0;
      setState('live');
    };
    const handleError = () => {
      reconnects.current += 1;
      setState(reconnects.current > 1 ? 'reconnecting' : 'offline');
    };
    const handleMessage = (name: string) => (message: MessageEvent) => {
      try {
        const payload = JSON.parse(message.data) as StreamEventPayload;
        setLastUpdated(new Date());
        onEvent?.(payload, name);
      } catch {
        setLastUpdated(new Date());
      }
    };

    source.addEventListener('open', handleOpen);
    source.addEventListener('error', handleError);
    source.addEventListener('connected', () => setState('live'));
    names.forEach(name => source.addEventListener(name, handleMessage(name)));

    return () => {
      source.close();
    };
  }, [eventKey, onEvent]);

  return { state, lastUpdated };
}
