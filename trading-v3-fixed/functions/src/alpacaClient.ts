export const getBaseUrl = () => {
  let url = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
  if (url.endsWith('/v2')) url = url.slice(0, -3);
  if (url.endsWith('/')) url = url.slice(0, -1);
  return url;
};

export const getHeaders = () => {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!key || !secret) {
    throw new Error('Alpaca API credentials missing.');
  }
  return {
    'APCA-API-KEY-ID': key,
    'APCA-API-SECRET-KEY': secret,
  };
};

export async function getAlpacaAccount() {
  const response = await fetch(`${getBaseUrl()}/v2/account`, { headers: getHeaders() });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Alpaca /account error: ${errorText}`);
  }
  return response.json();
}

export async function getAlpacaPositions() {
  const response = await fetch(`${getBaseUrl()}/v2/positions`, { headers: getHeaders() });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Alpaca /positions error: ${errorText}`);
  }
  return response.json();
}

export async function placeAlpacaOrder(order: { symbol: string; qty: number; side: 'buy' | 'sell'; type: 'market'; time_in_force: 'day' }) {
  const response = await fetch(`${getBaseUrl()}/v2/orders`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(order)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Alpaca /orders error: ${errorText}`);
  }
  return response.json();
}
