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
 
     const response = await fetch('https://api.camb.ai/v1/dub', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${apiKey}`,
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
 
     console.log('Video dubbing successful');
     return new Response(
       JSON.stringify({ success: true, data }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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