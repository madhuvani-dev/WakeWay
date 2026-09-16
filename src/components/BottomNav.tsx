import React from 'react';
import { Compass, Heart, Clock, Settings } from 'lucide-react';

export type NavView = 'home' | 'favourites' | 'history' | 'settings' | 'place-details';

interface Props {
  activeView: NavView;
  favouritesCount: number;
  onNavigate: (view: 'home' | 'favourites' | 'history' | 'settings') => void;
}

export const BottomNav: React.FC<Props> = ({
  activeView,
  favouritesCount,
  onNavigate
}) => {
  const navItems = [
    {
      id: 'nav-tab-explore',
      view: 'home' as const,
      label: 'Explore',
      icon: Compass
    },
    {
      id: 'nav-tab-favourites',
      view: 'favourites' as const,
      label: 'Favourites',
      icon: Heart,
      badge: favouritesCount > 0 ? favouritesCount : undefined
    },
    {
      id: 'nav-tab-history',
      view: 'history' as const,
      label: 'History',
      icon: Clock
    },
    {
      id: 'nav-tab-settings',
      view: 'settings' as const,
      label: 'Settings',
      icon: Settings
    }
  ];

  return (
    <nav className="h-[54px] border-t border-[#E4DCC8] bg-[#F7F3EA] flex items-center justify-around px-2 shrink-0 z-20 select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.view || (item.view === 'home' && activeView === 'place-details');

        return (
          <button
            key={item.id}
            id={item.id}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all relative ${
              isActive
                ? 'text-[#D96C45]'
                : 'text-[#667477] hover:text-[#173F43]'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'stroke-[2.2] scale-105' : 'stroke-[1.75]'
                } ${item.view === 'favourites' && isActive ? 'fill-current' : ''}`}
              />
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 bg-[#D96C45] text-white text-[9px] font-bold px-1 min-w-[14px] h-3.5 rounded-full flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-0.5 tracking-tight ${
                isActive ? 'font-bold text-[#D96C45]' : 'font-medium'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
