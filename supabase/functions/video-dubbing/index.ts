 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const formData = await req.formData();
     const videoFile = formData.get('video');
     const targetLanguage = formData.get('language');
     
     if (!videoFile || !(videoFile instanceof File)) {
       return new Response(
         JSON.stringify({ success: false, error: 'Video file is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (!targetLanguage || typeof targetLanguage !== 'string') {
       return new Response(
         JSON.stringify({ success: false, error: 'Target language is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const apiKey = Deno.env.get('CAMB_API_KEY');
     if (!apiKey) {
       console.error('CAMB_API_KEY not configured');
       return new Response(
         JSON.stringify({ success: false, error: 'API key not configured' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`Processing video dubbing to ${targetLanguage} with MARS`);
 
     const cambFormData = new FormData();
     cambFormData.append('video_file', videoFile);
     cambFormData.append('target_language', targetLanguage);
     cambFormData.append('model', 'mars');
 
      // Camb.ai docs: https://client.camb.ai/apis/dub
       const response = await fetch('https://client.camb.ai/apis/dub', {
       method: 'POST',
       headers: {
          // Camb.ai expects the key as an API-key header (not Bearer auth)
          'x-api-key': apiKey,
       },
       body: cambFormData,
     });
 
     const data = await response.json();
 
     if (!response.ok) {
       console.error('CAMB AI API error:', data);
       return new Response(
         JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
         { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }

      const taskId = data?.task_id ?? data?.id;
      if (!taskId || typeof taskId !== 'string') {
        console.error('Unexpected response from Camb.ai dub API:', data);
        return new Response(
          JSON.stringify({ success: false, error: 'Unexpected response from dubbing provider' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Poll status endpoint until complete (simple server-side convenience)
      const startedAt = Date.now();
      const timeoutMs = 90_000;
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
          return new Response(
            JSON.stringify({
              success: false,
              error: statusJson?.error || `Status request failed with status ${statusRes.status}`,
            }),
            { status: statusRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const status = statusJson?.status ?? statusJson?.data?.status;
        const dubbedVideoUrl =
          statusJson?.dubbed_video_url ??
          statusJson?.data?.dubbed_video_url ??
          statusJson?.result?.dubbed_video_url ??
          statusJson?.data?.result?.dubbed_video_url;

        if (dubbedVideoUrl && typeof dubbedVideoUrl === 'string') {
          console.log('Video dubbing successful');
          return new Response(
            JSON.stringify({ success: true, data: { ...statusJson, dubbed_video_url: dubbedVideoUrl } }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (typeof status === 'string' && ['failed', 'error', 'canceled', 'cancelled'].includes(status.toLowerCase())) {
          console.error('Camb.ai dubbing failed:', statusJson);
          return new Response(
            JSON.stringify({ success: false, error: statusJson?.error || 'Dubbing failed' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await new Promise((r) => setTimeout(r, pollEveryMs));
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Dubbing is taking longer than expected. Please try again in a moment.',
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
   } catch (error) {
     console.error('Error dubbing video:', error);
     const errorMessage = error instanceof Error ? error.message : 'Failed to dub video';
     return new Response(
       JSON.stringify({ success: false, error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });