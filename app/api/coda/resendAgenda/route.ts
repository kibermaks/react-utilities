'use server';
import { validateCodaAccess } from '@/app/lib/coda';
import { NextResponse } from 'next/server';

const CODA_API_TOKEN = process.env.CODA_API_TOKEN;
const CODA_DOC_ID = process.env.CODA_DOC_ID;
const CODA_RULE_ID_AGENDA = process.env.CODA_RULE_ID_AGENDA;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessSecret = searchParams.get('s');

    // Validate access secret
    const accessValidation = await validateCodaAccess(accessSecret);
    if (accessValidation) {
      return accessValidation;
    }

    // Check for required environment variables
    if (!CODA_API_TOKEN || !CODA_DOC_ID || !CODA_RULE_ID_AGENDA) {
      return NextResponse.json(
        { error: 'Missing Coda configuration' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Execute the Coda automation rule
    const response = await fetch(
      `https://coda.io/apis/v1/docs/${CODA_DOC_ID}/hooks/automation/${CODA_RULE_ID_AGENDA}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CODA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute Coda automation rule');
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error executing Coda automation rule:', error);
    return NextResponse.json(
      { error: 'Failed to execute Coda automation rule' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
