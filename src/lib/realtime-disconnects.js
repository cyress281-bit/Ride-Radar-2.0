const EXPECTED_REALTIME_ERROR_CODES = new Set([1006]);

const EXPECTED_REALTIME_MESSAGES = [
  'socket closed',
  'websocket closed',
  'connection closed',
  'connection lost',
  'transport closed',
  'transport close',
  'abnormal closure',
  'closed unexpectedly',
  'close code 1006',
  'code 1006',
];

export function isExpectedRealtimeDisconnect(error, status) {
  const code = Number(error?.code ?? error?.statusCode ?? error?.eventCode);
  if (EXPECTED_REALTIME_ERROR_CODES.has(code)) return true;

  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();

  if (name.includes('socket') && name.includes('close')) return true;
  if (EXPECTED_REALTIME_MESSAGES.some((needle) => message.includes(needle))) return true;

  if (status === 'TIMED_OUT' || status === 'CLOSED') {
    return !error || EXPECTED_REALTIME_MESSAGES.some((needle) => message.includes(needle));
  }

  return false;
}
