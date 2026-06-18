const API_KEY = process.env.KIT_API_KEY;
const TAG_ID  = '20464410'; // assessment tag

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, style } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!API_KEY) return res.status(500).json({ error: 'Kit not configured' });

  // Create/update subscriber with custom field
  const subRes = await fetch('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: {
      'X-Kit-Api-Key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      email_address: email,
      first_name: firstName || '',
      fields: { working_style: style || '' },
    }),
  });

  if (!subRes.ok) {
    const body = await subRes.text();
    console.error('Kit subscriber error:', body);
    return res.status(502).json({ error: 'Kit subscriber creation failed' });
  }

  const { subscriber } = await subRes.json();

  // Tag with "assessment"
  const tagRes = await fetch(`https://api.kit.com/v4/tags/${TAG_ID}/subscribers`, {
    method: 'POST',
    headers: {
      'X-Kit-Api-Key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ email_address: email }),
  });

  if (!tagRes.ok) {
    const body = await tagRes.text();
    console.error('Kit tag error:', body);
    // Non-fatal — subscriber was created, just not tagged
  }

  return res.status(200).json({ ok: true, subscriberId: subscriber?.id });
}
