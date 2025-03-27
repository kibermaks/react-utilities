'use server';
import { NextResponse } from 'next/server';

const CODA_API_TOKEN = process.env.CODA_API_TOKEN;
const CODA_DOC_ID = process.env.CODA_DOC_ID;
const CODA_TABLE_ID = process.env.CODA_TABLE_ID;
const ACCESS_SECRET = process.env.ACCESS_SECRET;

const CALL_TYPE_MAPPING: Record<string, string> = {
  'Regular': 'Regular Call',
  'Incoming': 'Incoming',
  'Incoming(Event)': 'Incoming (Event)',
  'Skip': 'Skip'
};

// Data interfaces
interface CodaViewRow {
  values: {
    'c-8ct0sIapdx': string;
    'c-ztqkPoyWJn': string;
    'c-birJu3yUIo': number;
  };
}

interface CodaViewResponse {
  items: CodaViewRow[];
}

interface CodaFriend {
  name: string;
  rowUid: string;
  callHistoryCount: number;
}

// Cache interface
interface CodaViewCache {
  data: CodaFriend[];
  timestamp: number;
}

const VIEW_CACHE: { [key: string]: CodaViewCache } = {};
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export async function validateCodaAccess(accessSecret: string | null) {
  if (!accessSecret || accessSecret !== ACCESS_SECRET) {
    return NextResponse.json(
      { error: 'Invalid access secret' },
      { status: 401 }
    );
  }
  return null;
}

export async function getCodaData(name: string | null, rowId: string | null) {
  if (!name || !rowId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function createCodaRow(data: {
  name: string;
  duration: number;
  rating: number;
  comments: string;
  dateTime: string;
  callType: string;
  rowId: string;
  eventId: string;
  way: string;
}, accessSecret: string | null) {
  try {
    console.log('Creating Coda row with data:', data, 'and access secret:', accessSecret);
    // Validate access secret first
    const accessValidation = await validateCodaAccess(accessSecret);
    if (accessValidation) {
      throw new Error('Invalid access secret');
    }

    if (!CODA_API_TOKEN || !CODA_DOC_ID || !CODA_TABLE_ID) {
      throw new Error('Missing Coda configuration');
    }

    if (data.callType !== 'Event' && data.eventId && data.eventId !== '') {
      data.eventId = '';
    }

    const requestBody = {
      rows: [
        {
          cells: [
            { column: 'c-YjeU8spajh', value: data.rowId }, //Friend Name - Linked Relation
            { column: 'c-Bn-uFR_-4A', value: data.duration }, //Duration Slider
            { column: 'c-R3AWPxLZOn', value: data.rating }, //⭐️ Quality of Call
            { column: 'c-9Acs_yErGs', value: data.comments }, //Notes
            { column: 'c-YDhAlgAVS4', value: data.dateTime }, //Report Date
            { column: 'c-4ji9x8bZNi', value: CALL_TYPE_MAPPING[data.callType] || data.callType }, //Call Type
            { column: 'c-6_YyLAPw9n', value: data.way }, //Way
            ...(data.eventId ? [{ column: 'c-bwZcHIUpy-', value: data.eventId }] : []), //Event ID
          ],
        },
      ],
    };

    console.log('Coda API Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      `https://coda.io/apis/v1/docs/${CODA_DOC_ID}/tables/${CODA_TABLE_ID}/rows`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CODA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create row in Coda');
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving to Coda:', error);
    throw error;
  }
}

export async function getCodaFriendsList(accessSecret: string | null): Promise<CodaFriend[]> {
  try {
    // Validate access secret first
    const accessValidation = await validateCodaAccess(accessSecret);
    if (accessValidation) {
      throw new Error('Invalid access secret');
    }

    if (!CODA_API_TOKEN || !CODA_DOC_ID) {
      throw new Error('Missing Coda configuration');
    }

    const viewId = 'table-HBylW1ZEig';
    
    // Check cache first
    const cache = VIEW_CACHE[viewId];
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      return cache.data;
    }

    // Fetch fresh data if cache is missing or expired
    const response = await fetch(
      `https://coda.io/apis/v1/docs/${CODA_DOC_ID}/tables/${viewId}/rows?valueFormat=simple`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CODA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch view data from Coda');
    }

    const rawData = await response.json() as CodaViewResponse;
    
    // Transform the data to get only the required columns
    const transformedData = rawData.items.map((item: CodaViewRow) => ({
      name: item.values['c-8ct0sIapdx'],
      rowUid: item.values['c-ztqkPoyWJn'],
      callHistoryCount: item.values['c-birJu3yUIo']
    }));

    // Update cache
    VIEW_CACHE[viewId] = {
      data: transformedData,
      timestamp: now
    };

    return transformedData;
  } catch (error) {
    console.error('Error fetching Coda view data:', error);
    throw error;
  }
} 