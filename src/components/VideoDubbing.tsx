import { useMemo, useState } from "react";
 import { Video, Upload, Globe } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
 import { GlassCard } from "./GlassCard";
 import { useToast } from "@/hooks/use-toast";
 import { supabase } from "@/integrations/supabase/client";
 
 const LANGUAGES = [
   { code: "es", name: "Spanish" },
   { code: "fr", name: "French" },
   { code: "de", name: "German" },
   { code: "it", name: "Italian" },
   { code: "pt", name: "Portuguese" },
   { code: "ru", name: "Russian" },
   { code: "ja", name: "Japanese" },
   { code: "ko", name: "Korean" },
   { code: "zh", name: "Chinese" },
   { code: "ar", name: "Arabic" },
   { code: "hi", name: "Hindi" },
 ];
 
 export const VideoDubbing = () => {
   const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [useCustomLanguage, setUseCustomLanguage] = useState(false);
  const [customLanguage, setCustomLanguage] = useState<string>("");
   const [isProcessing, setIsProcessing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
   const [dubbedUrl, setDubbedUrl] = useState<string>("");
   const [progress, setProgress] = useState(0);
  const [videoInputUrl, setVideoInputUrl] = useState<string>("");
   const { toast } = useToast();

  const effectiveLanguage = useMemo(() => {
    if (useCustomLanguage) return customLanguage.trim();
    return selectedLanguage;
  }, [customLanguage, selectedLanguage, useCustomLanguage]);
 
   const handleDub = async () => {
    if (!effectiveLanguage || !videoInputUrl.trim()) {
       toast({
         title: "Missing information",
        description: "Please paste a video URL and select a target language",
         variant: "destructive",
       });
       return;
     }
 
     setIsProcessing(true);
     setProgress(0);
 
     const progressInterval = setInterval(() => {
       setProgress((prev) => Math.min(prev + 10, 90));
     }, 500);
 
     try {
      const { data, error } = await supabase.functions.invoke("video-dubbing", {
        body: {
          video_url: videoInputUrl.trim(),
          target_language: effectiveLanguage,
        },
      });
 
       clearInterval(progressInterval);
       setProgress(100);
 
       if (error) throw error;
 
      if (data?.success && data?.data?.dubbed_video_url) {
         setDubbedUrl(data.data.dubbed_video_url);
         toast({
           title: "Dubbing complete!",
          description: useCustomLanguage
            ? `Your video has been dubbed to ${effectiveLanguage}`
            : `Your video has been dubbed to ${LANGUAGES.find((l) => l.code === selectedLanguage)?.name}`,
         });
       } else {
         throw new Error("No dubbed video returned");
       }
     } catch (error) {
       clearInterval(progressInterval);
       console.error("Dubbing error:", error);
       toast({
         title: "Dubbing failed",
         description: error instanceof Error ? error.message : "Please try again",
         variant: "destructive",
       });
     } finally {
       setIsProcessing(false);
       setTimeout(() => setProgress(0), 1000);
     }
   };
 
   return (
     <GlassCard className="space-y-6" glow>
       <div className="flex items-center gap-3">
         <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
           <Globe className="w-6 h-6 text-primary" />
         </div>
         <div>
           <h3 className="text-xl font-semibold">Video Dubbing</h3>
           <p className="text-sm text-muted-foreground">Powered by MARS (15 sec limit)</p>
         </div>
       </div>
 
       <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="video-url">
            Video URL
          </label>
          <div className="flex gap-2">
            <Input
              id="video-url"
              value={videoInputUrl}
              onChange={(e) => {
                setVideoInputUrl(e.target.value);
                setDubbedUrl("");
              }}
              placeholder="https://... (must be publicly accessible)"
              disabled={isProcessing}
              inputMode="url"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isProcessing || !videoInputUrl.trim()}
              onClick={() => setVideoUrl(videoInputUrl.trim())}
              title="Preview"
            >
              <Upload className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Camb.ai requires a URL it can fetch. If the link needs login, it won’t work.
          </p>
        </div>

        {videoUrl && (
           <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
               <video src={videoUrl} controls className="w-full h-full object-contain" />
             </div>
 
              <div className="grid gap-3">
                <Select
                  value={useCustomLanguage ? "__custom__" : selectedLanguage}
                  onValueChange={(v) => {
                    if (v === "__custom__") {
                      setUseCustomLanguage(true);
                      return;
                    }
                    setUseCustomLanguage(false);
                    setSelectedLanguage(v);
                  }}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom language code…</SelectItem>
                  </SelectContent>
                </Select>

                {useCustomLanguage && (
                  <Input
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    placeholder="e.g. en, nl, tr"
                    disabled={isProcessing}
                    aria-label="Custom language code"
                  />
                )}
              </div>
 
              <Button onClick={handleDub} disabled={!effectiveLanguage || isProcessing} className="w-full" size="lg">
               <Video className="mr-2 h-4 w-4" />
               {isProcessing ? "Dubbing..." : "Dub Video"}
             </Button>
           </div>
         )}
 
         {isProcessing && (
           <div className="space-y-2">
             <div className="h-2 bg-secondary rounded-full overflow-hidden">
               <div
                 className="h-full bg-primary transition-all duration-300"
                 style={{ width: `${progress}%` }}
               />
             </div>
             <p className="text-xs text-center text-muted-foreground">Processing your video...</p>
           </div>
         )}
 
         {dubbedUrl && (
           <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <h4 className="text-sm font-medium text-primary">Dubbed Video:</h4>
             <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden shadow-glow">
               <video src={dubbedUrl} controls className="w-full h-full object-contain" />
             </div>
             <Button asChild variant="outline" className="w-full">
               <a href={dubbedUrl} download="dubbed-video.mp4">
                 Download Dubbed Video
               </a>
             </Button>
           </div>
         )}
       </div>
     </GlassCard>
   );
 };