export interface WarpQuote {
  quote_id: string;
  total_amount: number;
  transit_days: number;
  carrier: string;
  service: string;
}

export interface WarpBookingResult {
  order_id: string;
  tracking_number: string;
  status: string;
}

export async function quoteWarp(
  warpApiKey: string,
  pickupDate: string,
  destinationZip: string,
  weightLbs: number
): Promise<WarpQuote | null> {
  try {
    const response = await fetch(
      'https://gw.wearewarp.com/api/v1/freights/quote',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: warpApiKey,
        },
        body: JSON.stringify({
          pickupDate,
          pickupInfo: { zipcode: '90021' },
          deliveryInfo: { zipcode: destinationZip },
          listItems: [
            {
              name: 'Shopify Order',
              quantity: 1,
              totalWeight: weightLbs,
              weightUnit: 'lbs',
              length: 48,
              width: 40,
              height: 48,
              sizeUnit: 'IN',
              stackable: false,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error('Warp quote failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    // Return first quote option
    const quotes = data.quotes ?? data.data ?? [data];
    if (!quotes || quotes.length === 0) return null;
    return quotes[0];
  } catch (err) {
    console.error('Warp quote error:', err);
    return null;
  }
}

export async function bookWarp(
  warpApiKey: string,
  quoteId: string
): Promise<WarpBookingResult | null> {
  try {
    const response = await fetch(
      'https://gw.wearewarp.com/api/v1/freights/booking',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: warpApiKey,
        },
        body: JSON.stringify({ quote_id: quoteId }),
      }
    );

    if (!response.ok) {
      console.error('Warp booking failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Warp booking error:', err);
    return null;
  }
}

export function getTomorrowDate(): string {
  const tomorrow = new Date(Date.now() + 86400000);
  return tomorrow.toISOString().split('T')[0];
}
