 import { useState, useRef } from "react";
 import { Mic, Square, Upload } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { GlassCard } from "./GlassCard";
 import { useToast } from "@/hooks/use-toast";
 import { supabase } from "@/integrations/supabase/client";
 
 export const SpeechToText = () => {
   const [isRecording, setIsRecording] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [transcript, setTranscript] = useState<string>("");
   const [audioLevel, setAudioLevel] = useState(0);
   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
   const chunksRef = useRef<Blob[]>([]);
   const animationRef = useRef<number>();
   const { toast } = useToast();
 
   const startRecording = async () => {
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       const mediaRecorder = new MediaRecorder(stream);
       mediaRecorderRef.current = mediaRecorder;
       chunksRef.current = [];
 
       const audioContext = new AudioContext();
       const analyser = audioContext.createAnalyser();
       const microphone = audioContext.createMediaStreamSource(stream);
       microphone.connect(analyser);
       analyser.fftSize = 256;
       const bufferLength = analyser.frequencyBinCount;
       const dataArray = new Uint8Array(bufferLength);
 
       const updateLevel = () => {
         analyser.getByteFrequencyData(dataArray);
         const average = dataArray.reduce((a, b) => a + b) / bufferLength;
         setAudioLevel(average / 255);
         animationRef.current = requestAnimationFrame(updateLevel);
       };
       updateLevel();
 
       mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
       mediaRecorder.onstop = () => processAudio();
 
       mediaRecorder.start();
       setIsRecording(true);
       toast({ title: "Recording started", description: "Speak into your microphone" });
     } catch (error) {
       toast({
         title: "Microphone access denied",
         description: "Please allow microphone access to record audio",
         variant: "destructive",
       });
     }
   };
 
   const stopRecording = () => {
     if (mediaRecorderRef.current && isRecording) {
       mediaRecorderRef.current.stop();
       mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
       setIsRecording(false);
       setAudioLevel(0);
       if (animationRef.current) cancelAnimationFrame(animationRef.current);
     }
   };
 
   const processAudio = async () => {
     setIsProcessing(true);
     try {
       const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
       const formData = new FormData();
       formData.append("audio", audioBlob, "recording.webm");
 
       const { data, error } = await supabase.functions.invoke("speech-to-text", {
         body: formData,
       });
 
       if (error) throw error;
       
       if (data?.success && data?.data?.text) {
         setTranscript(data.data.text);
         toast({ title: "Transcription complete!", description: "Your audio has been converted to text" });
       } else {
         throw new Error("No transcript returned");
       }
     } catch (error) {
       console.error("Transcription error:", error);
       toast({
         title: "Transcription failed",
         description: error instanceof Error ? error.message : "Please try again",
         variant: "destructive",
       });
     } finally {
       setIsProcessing(false);
     }
   };
 
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     setIsProcessing(true);
     try {
       const formData = new FormData();
       formData.append("audio", file);
 
       const { data, error } = await supabase.functions.invoke("speech-to-text", {
         body: formData,
       });
 
       if (error) throw error;
       
       if (data?.success && data?.data?.text) {
         setTranscript(data.data.text);
         toast({ title: "Transcription complete!", description: "Your audio has been converted to text" });
       } else {
         throw new Error("No transcript returned");
       }
     } catch (error) {
       console.error("Transcription error:", error);
       toast({
         title: "Transcription failed",
         description: error instanceof Error ? error.message : "Please try again",
         variant: "destructive",
       });
     } finally {
       setIsProcessing(false);
     }
   };
 
   return (
     <GlassCard className="space-y-6" glow>
       <div className="flex items-center gap-3">
         <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
           <Mic className="w-6 h-6 text-primary" />
         </div>
         <div>
           <h3 className="text-xl font-semibold">Speech to Text</h3>
           <p className="text-sm text-muted-foreground">Powered by MARS6-turbo</p>
         </div>
       </div>
 
       <div className="flex gap-4">
         <Button
           onClick={isRecording ? stopRecording : startRecording}
           disabled={isProcessing}
           className="flex-1"
           size="lg"
         >
           {isRecording ? (
             <>
               <Square className="mr-2 h-4 w-4" />
               Stop Recording
             </>
           ) : (
             <>
               <Mic className="mr-2 h-4 w-4" />
               Start Recording
             </>
           )}
         </Button>
 
         <label htmlFor="audio-upload">
           <input
             type="file"
             id="audio-upload"
             accept="audio/*"
             className="hidden"
             onChange={handleFileUpload}
             disabled={isProcessing}
           />
           <Button asChild variant="secondary" size="lg" disabled={isProcessing}>
             <span className="cursor-pointer">
               <Upload className="mr-2 h-4 w-4" />
               Upload Audio
             </span>
           </Button>
         </label>
       </div>
 
       {isRecording && (
         <div className="space-y-2">
           <div className="h-2 bg-secondary rounded-full overflow-hidden">
             <div
               className="h-full bg-primary transition-all duration-100"
               style={{ width: `${audioLevel * 100}%` }}
             />
           </div>
           <p className="text-xs text-center text-muted-foreground animate-pulse">Recording...</p>
         </div>
       )}
 
       {isProcessing && (
         <div className="text-center">
           <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
           <p className="mt-2 text-sm text-muted-foreground">Processing your audio...</p>
         </div>
       )}
 
       {transcript && (
         <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h4 className="text-sm font-medium text-primary">Transcript:</h4>
           <div className="p-4 bg-secondary rounded-lg">
             <p className="text-sm leading-relaxed">{transcript}</p>
           </div>
         </div>
       )}
     </GlassCard>
   );
 };