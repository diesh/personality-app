const CRAWLER_AGENTS = [
  'linkedinbot',
  'twitterbot',
  'facebookexternalhit',
  'slackbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'googlebot',
];

const FIREBASE_PROJECT_ID = 'personality-assessment-f58e4';
const OG_IMAGE_BASE = 'https://share-images-six.vercel.app/api/og';

function isCrawler(userAgent = '') {
  const ua = userAgent.toLowerCase();
  return CRAWLER_AGENTS.some((bot) => ua.includes(bot));
}

async function fetchReportData(docId) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/results/${docId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const fields = json.fields || {};
  return {
    firstName: fields.firstName?.stringValue || 'User',
    style: fields.style?.stringValue || 'Expert',
    clientName: fields.clientName?.stringValue || '',
    jobTitle: fields.jobTitle?.stringValue || '',
  };
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  const reportMatch = pathname.match(/^\/report\/([^/]+)$/);
  if (!reportMatch || !isCrawler(userAgent)) {
    return;
  }

  const docId = reportMatch[1];
  const data = await fetchReportData(docId);

  if (!data) return;

  const pageUrl = request.url.split('?')[0];
  const ogImageUrl = `${OG_IMAGE_BASE}?name=${encodeURIComponent(data.firstName)}&style=${encodeURIComponent(data.style)}`;
  const ogTitle = data.clientName
    ? `${data.clientName} — Personality Report`
    : `${data.firstName}'s Personality Report`;
	// Use the data you just confirmed exists in Firestore

	const name = data.firstName || "Leader";
	const title = data.jobTitle || "Professional";
	const style = data.style || "Expert";

	const ogDescription = `Discover ${name}’s workplace strengths. Explore their "${style}" style to unlock better communication and teamwork. View the report and get your own free assessment here!`;
  
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDescription}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="627" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDescription}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    <meta http-equiv="refresh" content="0; url=${pageUrl}" />
  </head>
  <body>
    <p>Redirecting...</p>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

export const config = {
  matcher: ['/report/:path*'],
};