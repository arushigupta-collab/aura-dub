 import { cn } from "@/lib/utils";
 import { ReactNode } from "react";
 
 interface GlassCardProps {
   children: ReactNode;
   className?: string;
   glow?: boolean;
 }
 
 export const GlassCard = ({ children, className, glow = false }: GlassCardProps) => {
   return (
     <div
       className={cn(
         "relative backdrop-blur-xl bg-glass border border-glass-border rounded-2xl p-6 transition-all duration-300",
         glow && "shadow-glow hover:shadow-glow-lg",
         className
       )}
     >
       {children}
     </div>
   );
 };