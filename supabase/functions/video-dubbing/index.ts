 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };

type CambLanguage = {
  id: number;
  language?: string;
  short_name?: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const normalizeLang = (value: string) => value.trim().toLowerCase().replace(/_/g, '-');

const findBestLanguageMatch = (langs: CambLanguage[], requested: string): CambLanguage | null => {
  const r = normalizeLang(requested);
  // Exact match
  const exact = langs.find((l) => typeof l.short_name === 'string' && normalizeLang(l.short_name) === r);
  if (exact) return exact;

  // Prefix match (e.g. "hi" matches "hi-in", "en" matches "en-us")
  const prefix = langs.find((l) => typeof l.short_name === 'string' && normalizeLang(l.short_name).startsWith(`${r}-`));
  if (prefix) return prefix;

  // Name match
  const name = langs.find((l) => typeof l.language === 'string' && l.language.toLowerCase().includes(r));
  if (name) return name;

  return null;
};

const isProbablyHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
    const body = await req.json().catch(() => null);
    const videoUrl = body?.video_url;
    const targetLanguageCode = body?.target_language;

    if (!videoUrl || typeof videoUrl !== 'string' || !isProbablyHttpUrl(videoUrl)) {
      return json(400, { success: false, error: 'A valid video_url (http/https) is required' });
    }

    if (!targetLanguageCode || typeof targetLanguageCode !== 'string') {
      return json(400, { success: false, error: 'target_language is required (e.g. hi, en-us)' });
    }
 
     const apiKey = Deno.env.get('CAMB_API_KEY');
     if (!apiKey) {
       console.error('CAMB_API_KEY not configured');
      return json(500, { success: false, error: 'API key not configured' });
     }
 
    console.log(`Resolving language IDs for target=${targetLanguageCode}`);

    const [targetLangRes, sourceLangRes] = await Promise.all([
      fetch('https://client.camb.ai/apis/target-languages', {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
      }),
      fetch('https://client.camb.ai/apis/source-languages', {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
      }),
    ]);

    if (!targetLangRes.ok) {
      const t = await targetLangRes.text().catch(() => '');
      console.error('Camb.ai target-languages error:', t);
      return json(502, { success: false, error: 'Failed to fetch target languages' });
    }
    if (!sourceLangRes.ok) {
      const t = await sourceLangRes.text().catch(() => '');
      console.error('Camb.ai source-languages error:', t);
      return json(502, { success: false, error: 'Failed to fetch source languages' });
    }

    const targetLangs: CambLanguage[] = await targetLangRes.json().catch(() => []);
    const sourceLangs: CambLanguage[] = await sourceLangRes.json().catch(() => []);

    const targetMatch = findBestLanguageMatch(targetLangs, targetLanguageCode);
    if (!targetMatch?.id) {
      return json(400, {
        success: false,
        error: `Unsupported target language: ${targetLanguageCode}. Try a locale like "hi-in" or "en-us".`,
      });
    }

    // Camb.ai dubbing requires a source_language ID. Try best-effort autodetect or fallback.
    const sourceAuto =
      sourceLangs.find((l) => typeof l.short_name === 'string' && normalizeLang(l.short_name) === 'auto') ??
      sourceLangs.find((l) => typeof l.language === 'string' && l.language.toLowerCase().includes('auto')) ??
      sourceLangs.find((l) => typeof l.short_name === 'string' && normalizeLang(l.short_name).startsWith('en')) ??
      sourceLangs[0];

    if (!sourceAuto?.id) {
      return json(502, { success: false, error: 'Could not resolve a source language ID' });
    }

    console.log(`Starting dub job for video_url=${videoUrl} target_id=${targetMatch.id}`);
 
    // Camb.ai docs: https://docs.camb.ai/api-reference/endpoint/end-to-end-dubbing
    const response = await fetch('https://client.camb.ai/apis/dub', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        source_language: sourceAuto.id,
        target_languages: [targetMatch.id],
      }),
    });
 
    const data = await response.json().catch(() => ({}));
 
     if (!response.ok) {
       console.error('CAMB AI API error:', data);
      return json(response.status, {
        success: false,
        error: data?.message || data?.error || `Request failed with status ${response.status}`,
      });
     }

    const taskId = data?.task_id ?? data?.id;
    if (!taskId || typeof taskId !== 'string') {
      console.error('Unexpected response from Camb.ai dub API:', data);
      return json(502, { success: false, error: 'Unexpected response from dubbing provider' });
    }

    // Poll status endpoint until complete (server-side convenience)
    const startedAt = Date.now();
    const timeoutMs = 120_000;
    const pollEveryMs = 2_000;

    while (Date.now() - startedAt < timeoutMs) {
      const statusRes = await fetch(`https://client.camb.ai/apis/dub/${taskId}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
        },
      });

      const statusJson = await statusRes.json().catch(() => ({}));
      if (!statusRes.ok) {
        console.error('Camb.ai status API error:', statusJson);
        return json(statusRes.status, {
          success: false,
          error: statusJson?.message || statusJson?.error || `Status request failed with status ${statusRes.status}`,
        });
      }

      const status = statusJson?.status ?? statusJson?.data?.status;
      const runId = statusJson?.run_id ?? statusJson?.data?.run_id ?? statusJson?.result?.run_id;
      const dubbedVideoUrl =
        statusJson?.dubbed_video_url ??
        statusJson?.data?.dubbed_video_url ??
        statusJson?.result?.dubbed_video_url ??
        statusJson?.data?.result?.dubbed_video_url;

      if (dubbedVideoUrl && typeof dubbedVideoUrl === 'string') {
        console.log('Video dubbing successful (direct url)');
        return json(200, { success: true, data: { ...statusJson, dubbed_video_url: dubbedVideoUrl } });
      }

      // Some flows return a run_id when finished; fetch the result payload.
      const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
      const isSuccess = ['success', 'completed', 'complete', 'done', 'finished'].includes(normalizedStatus);
      if (isSuccess && runId) {
        const resultRes = await fetch(`https://client.camb.ai/apis/dub-result/${runId}`, {
          method: 'GET',
          headers: { 'x-api-key': apiKey },
        });

        const resultJson = await resultRes.json().catch(() => ({}));
        if (!resultRes.ok) {
          console.error('Camb.ai dub-result error:', resultJson);
          return json(resultRes.status, {
            success: false,
            error: resultJson?.message || resultJson?.error || `Result request failed with status ${resultRes.status}`,
          });
        }

        const resultUrl =
          resultJson?.dubbed_video_url ??
          resultJson?.data?.dubbed_video_url ??
          resultJson?.result?.dubbed_video_url ??
          resultJson?.data?.result?.dubbed_video_url;

        if (resultUrl && typeof resultUrl === 'string') {
          console.log('Video dubbing successful (dub-result url)');
          return json(200, { success: true, data: { ...resultJson, dubbed_video_url: resultUrl } });
        }
      }

      if (typeof status === 'string' && ['failed', 'error', 'canceled', 'cancelled'].includes(status.toLowerCase())) {
        console.error('Camb.ai dubbing failed:', statusJson);
        return json(502, { success: false, error: statusJson?.message || statusJson?.error || 'Dubbing failed' });
      }

      await new Promise((r) => setTimeout(r, pollEveryMs));
    }

    return json(504, {
      success: false,
      error: 'Dubbing is taking longer than expected. Please try again in a moment.',
    });
   } catch (error) {
     console.error('Error dubbing video:', error);
     const errorMessage = error instanceof Error ? error.message : 'Failed to dub video';
    return json(500, { success: false, error: errorMessage });
   }
 });