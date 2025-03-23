'use server';
import { validateCodaAccess } from '@/app/lib/coda';
import { NextResponse } from 'next/server';

const CODA_API_TOKEN = process.env.CODA_API_TOKEN;
const CODA_DOC_ID = process.env.CODA_DOC_ID;
const CODA_RULE_ID_AGENDA = process.env.CODA_RULE_ID_AGENDA;

// List of known bot/preview User-Agent patterns
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /preview/i,
  /slack/i,
  /telegram/i,
  /whatsapp/i,
  /facebook/i,
  /twitter/i,
  /discord/i,
  /viber/i,
  /line/i,
  /linkedIn/i,
  /skype/i,
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessSecret = searchParams.get('s');
    const isDebug = searchParams.get('debug') === 'true';

    // Check if request is from a bot/preview service
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = BOT_PATTERNS.some(pattern => pattern.test(userAgent));

    // Return early for bots with a minimal response
    if (isBot) {
      return new NextResponse('Link preview disabled', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
          'X-Frame-Options': 'DENY',
          'Link-Preview': 'none',
          'Slack-Unfurl-Links': 'false',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

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

    // Skip Coda API call if in debug mode
    if (!isDebug) {
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
    }

    // Return HTML that immediately closes the window
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.onload = () => {
              window.close();
              // Fallback for browsers that block window.close()
              if (!window.closed) {
                document.body.innerHTML = "Success! You can close this window.";
              }
            };
          </script>
          Success! Closing window...
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
          'X-Frame-Options': 'DENY',
          'Link-Preview': 'none',
          'Slack-Unfurl-Links': 'false',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
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
