 import { useState, useRef } from "react";
 import { Video, Upload, Globe } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
   const [isProcessing, setIsProcessing] = useState(false);
   const [videoUrl, setVideoUrl] = useState<string>("");
   const [dubbedUrl, setDubbedUrl] = useState<string>("");
   const [progress, setProgress] = useState(0);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const { toast } = useToast();
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       const url = URL.createObjectURL(file);
       setVideoUrl(url);
       setDubbedUrl("");
     }
   };
 
   const handleDub = async () => {
     if (!selectedLanguage || !fileInputRef.current?.files?.[0]) {
       toast({
         title: "Missing information",
         description: "Please select a video and target language",
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
       const formData = new FormData();
       formData.append("video", fileInputRef.current.files[0]);
       formData.append("language", selectedLanguage);
 
       const { data, error } = await supabase.functions.invoke("video-dubbing", {
         body: formData,
       });
 
       clearInterval(progressInterval);
       setProgress(100);
 
       if (error) throw error;
 
       if (data?.success && data?.data?.dubbed_video_url) {
         setDubbedUrl(data.data.dubbed_video_url);
         toast({
           title: "Dubbing complete!",
           description: `Your video has been dubbed to ${LANGUAGES.find(l => l.code === selectedLanguage)?.name}`,
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
         <div>
           <label htmlFor="video-upload">
             <input
               ref={fileInputRef}
               type="file"
               id="video-upload"
               accept="video/*"
               className="hidden"
               onChange={handleFileSelect}
               disabled={isProcessing}
             />
             <Button asChild variant="secondary" size="lg" className="w-full" disabled={isProcessing}>
               <span className="cursor-pointer">
                 <Upload className="mr-2 h-4 w-4" />
                 {videoUrl ? "Change Video" : "Upload Video (Max 15 sec)"}
               </span>
             </Button>
           </label>
         </div>
 
         {videoUrl && (
           <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
               <video src={videoUrl} controls className="w-full h-full object-contain" />
             </div>
 
             <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isProcessing}>
               <SelectTrigger>
                 <SelectValue placeholder="Select target language" />
               </SelectTrigger>
               <SelectContent>
                 {LANGUAGES.map((lang) => (
                   <SelectItem key={lang.code} value={lang.code}>
                     {lang.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
 
             <Button onClick={handleDub} disabled={!selectedLanguage || isProcessing} className="w-full" size="lg">
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