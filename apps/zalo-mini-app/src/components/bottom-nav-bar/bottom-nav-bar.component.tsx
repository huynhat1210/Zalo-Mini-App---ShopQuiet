import { IBottomNavBarComponentProps } from './bottom-nav-bar.type';
import { useCart } from '../../App';
import { 
  HomeIcon as HomeOutline, 
  MagnifyingGlassIcon as SearchOutline, 
  ClipboardDocumentListIcon as ClipboardOutline, 
  BellIcon as BellOutline, 
  UserIcon as UserOutline 
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeSolid, 
  MagnifyingGlassIcon as SearchSolid, 
  ClipboardDocumentListIcon as ClipboardSolid, 
  BellIcon as BellSolid, 
  UserIcon as UserSolid 
} from '@heroicons/react/24/solid';

export const BottomNavBarComponent: React.FC<IBottomNavBarComponentProps> = (_props) => {
  const { activeTab, setActiveTab, setIsCartOpen, notifications } = useCart();
  const showNavbar = ['home', 'search', 'orders', 'notifications', 'profile'].includes(activeTab);

  if (!showNavbar) return null;

  const unreadCount = (notifications || []).filter(n => !n.read).length;


  return (
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-white/95 backdrop-blur-md border-t border-[#f0edeb] flex justify-around items-center px-4 z-50 shadow-lg">
      {/* Shop Tab (Home) */}
      <button
        onClick={() => { setActiveTab('home'); setIsCartOpen(false); }}
        className="flex flex-col items-center justify-center w-12 h-12 transition-all relative border-none bg-transparent cursor-pointer"
      >
        {activeTab === 'home' ? (
          <HomeSolid className="w-6 h-6 text-primary scale-105 transition-all duration-200" />
        ) : (
          <HomeOutline className="w-6 h-6 text-[#526069] opacity-70 transition-all duration-200" />
        )}
        {activeTab === 'home' && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 absolute bottom-0 animate-fade-in"></span>
        )}
      </button>

      {/* Search Tab */}
      <button
        onClick={() => { setActiveTab('search'); setIsCartOpen(false); }}
        className="flex flex-col items-center justify-center w-12 h-12 transition-all relative border-none bg-transparent cursor-pointer"
      >
        {activeTab === 'search' ? (
          <SearchSolid className="w-6 h-6 text-primary scale-105 transition-all duration-200" />
        ) : (
          <SearchOutline className="w-6 h-6 text-[#526069] opacity-70 transition-all duration-200" />
        )}
        {activeTab === 'search' && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 absolute bottom-0 animate-fade-in"></span>
        )}
      </button>

      {/* Orders Tab */}
      <button
        onClick={() => { setActiveTab('orders'); setIsCartOpen(false); }}
        className="flex flex-col items-center justify-center w-12 h-12 transition-all relative border-none bg-transparent cursor-pointer"
      >
        {activeTab === 'orders' ? (
          <ClipboardSolid className="w-6 h-6 text-primary scale-105 transition-all duration-200" />
        ) : (
          <ClipboardOutline className="w-6 h-6 text-[#526069] opacity-70 transition-all duration-200" />
        )}
        {activeTab === 'orders' && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 absolute bottom-0 animate-fade-in"></span>
        )}
      </button>

      {/* Notifications Tab */}
      <button
        onClick={() => { setActiveTab('notifications'); setIsCartOpen(false); }}
        className="flex flex-col items-center justify-center w-12 h-12 transition-all relative border-none bg-transparent cursor-pointer"
      >
        {activeTab === 'notifications' ? (
          <BellSolid className="w-6 h-6 text-primary scale-105 transition-all duration-200" />
        ) : (
          <BellOutline className="w-6 h-6 text-[#526069] opacity-70 transition-all duration-200" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white z-10">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {activeTab === 'notifications' && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 absolute bottom-0 animate-fade-in"></span>
        )}
      </button>

      {/* Profile Tab */}
      <button
        onClick={() => { setActiveTab('profile'); setIsCartOpen(false); }}
        className="flex flex-col items-center justify-center w-12 h-12 transition-all relative border-none bg-transparent cursor-pointer"
      >
        {activeTab === 'profile' ? (
          <UserSolid className="w-6 h-6 text-primary scale-105 transition-all duration-200" />
        ) : (
          <UserOutline className="w-6 h-6 text-[#526069] opacity-70 transition-all duration-200" />
        )}
        {activeTab === 'profile' && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 absolute bottom-0 animate-fade-in"></span>
        )}
      </button>
    </div>
  );
}
