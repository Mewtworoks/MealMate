// Serverless proxy for Groq's chat completions API. Runs entirely on
// Netlify's servers, so GROQ_API_KEY is read from process.env at request
// time and never has to be baked into the static site bundle — which is
// what kept tripping Netlify's build-time secrets scanner.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GROQ_API_KEY is not configured on the server.' }) };
  }

  try {
    const { model, messages, max_tokens } = JSON.parse(event.body || '{}');

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, max_tokens })
    });

    const data = await groqRes.text();
    return {
      statusCode: groqRes.status,
      headers: { 'Content-Type': 'application/json' },
      body: data
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
