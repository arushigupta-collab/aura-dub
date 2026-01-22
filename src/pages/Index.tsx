 import { SpeechToText } from "@/components/SpeechToText";
 import { VideoDubbing } from "@/components/VideoDubbing";
 import heroWave from "@/assets/hero-wave.jpg";
 import { motion } from "framer-motion";
 
 const Index = () => {
   return (
     <div className="min-h-screen bg-background relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-30" />
       
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 opacity-40">
         <img src={heroWave} alt="" className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
       </div>
 
       <div className="relative z-10">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12"
         >
           <div className="text-center space-y-4 mb-16">
             <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.1 }}
               className="text-5xl md:text-7xl font-bold tracking-tight"
             >
               AI Audio & Video
               <span className="block text-primary mt-2">Intelligence</span>
             </motion.h1>
             <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="text-xl text-muted-foreground max-w-2xl mx-auto"
             >
               Transform speech to text with MARS6-turbo and dub videos into multiple languages with cutting-edge AI technology
             </motion.p>
           </div>
 
           <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
             <motion.div
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6, delay: 0.3 }}
             >
               <SpeechToText />
             </motion.div>
 
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6, delay: 0.4 }}
             >
               <VideoDubbing />
             </motion.div>
           </div>
 
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.6, delay: 0.6 }}
             className="mt-16 text-center text-sm text-muted-foreground"
           >
             <p>Powered by CAMB.AI • MARS6-turbo & MARS</p>
           </motion.div>
         </motion.div>
       </div>
     </div>
   );
 };
 
 export default Index;
