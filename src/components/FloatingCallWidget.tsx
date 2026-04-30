import { motion, AnimatePresence } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useCall } from '../contexts/CallContext';

export default function FloatingCallWidget() {
  const { activeCalls } = useCall();
  
  // Find calls that are in any active state
  const activeCallingSesssions = activeCalls.filter(call => 
    ['dialing', 'ringing', 'connecting', 'greeting', 'connected'].includes(call.state) || 
    call.state.includes('_verification') || 
    call.state.includes('_retry')
  );

  if (activeCallingSesssions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-8 right-8 z-[100]"
      >
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-2 bg-brand-500/20 rounded-full blur-md animate-pulse"></div>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/40 border-2 border-white/20">
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatDelay: 3
              }}
            >
              <Phone size={24} fill="currentColor" />
            </motion.div>
            
            {/* Status indicator */}
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-black border-2 border-white shadow-sm">
              {activeCallingSesssions.length}
            </div>
          </div>
          
          {/* Label on hover */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-ink-950 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
            {activeCallingSesssions.length} Active Call{activeCallingSesssions.length > 1 ? 's' : ''}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
