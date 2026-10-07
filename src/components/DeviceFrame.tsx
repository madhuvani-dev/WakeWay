import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<Props> = ({ children }) => {
  const [time, setTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-[400px] h-[780px] max-h-[92vh] bg-[#173F43] rounded-[44px] p-2.5 shadow-2xl shadow-[#173F43]/25 border-4 border-[#245257] flex flex-col relative transition-all">
      {/* Outer Phone Shell */}
      <div className="w-full h-full bg-[#F7F3EA] rounded-[34px] overflow-hidden flex flex-col relative border border-[#E4DCC8]">
        {/* Android Status Bar */}
        <div className="h-7 px-6 pt-1.5 flex items-center justify-between text-[11px] font-semibold text-[#173F43] bg-[#F7F3EA] select-none z-20 shrink-0">
          <span>{time}</span>

          {/* Camera Notch / Punch Hole */}
          <div className="w-3 h-3 rounded-full bg-[#173F43] mx-auto -mt-0.5"></div>

          <div className="flex items-center gap-1.5 text-[#173F43]">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <BatteryMedium className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Screen Dynamic Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-[#F7F3EA]">
          {children}
        </div>

        {/* Android Gesture Navigation Bar Indicator */}
        <div className="h-4 bg-[#F7F3EA] flex items-center justify-center shrink-0">
          <div className="w-28 h-1 rounded-full bg-[#D1C6AE]"></div>
        </div>
      </div>
    </div>
  );
};
