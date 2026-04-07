import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X } from 'lucide-react';
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

  const currentCall = activeCallingSesssions[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-[100]"
      >
        <div className="relative group">
          {/* Pulsing Background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          
          <div className="relative flex items-center gap-4 bg-white/90 backdrop-blur-md border border-brand-100 p-4 rounded-2xl shadow-xl shadow-brand-500/10 min-w-[320px]">
            {/* Call Icon / Animation */}
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30">
                <motion.div
                  animate={{ 
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 0.5, 
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                >
                  <Phone size={22} fill="currentColor" />
                </motion.div>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-brand-400 -z-10"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <span className={`flex h-2 w-2 rounded-full animate-pulse ${
                  currentCall.state === 'ringing' || currentCall.state === 'dialing' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                  currentCall.state === 'ringing' || currentCall.state === 'dialing' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {currentCall.state === 'ringing' ? 'Ringing...' : 
                   currentCall.state === 'dialing' ? 'Dialing...' : 
                   currentCall.state === 'connecting' ? 'Connecting...' : 'Live Call'}
                </p>
              </div>
              <h4 className="text-sm font-black text-ink-950 truncate">
                {currentCall.patientName || currentCall.callerNumber || 'Unknown Caller'}
              </h4>
              <p className="text-[10px] font-medium text-slate-500 truncate">
                {currentCall.source.replace(/_/g, ' ')} • Telnyx Call
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
              <button 
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
