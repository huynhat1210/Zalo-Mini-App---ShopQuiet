import { Page } from 'zmp-ui';
import { useCart } from '../../App';
import { EmptyState } from '../../components/empty-state/EmptyState';
import { ISavedItemsComponentProps } from './saved-items.type';

const PageCast = Page as any;

export const SavedItemsComponent: React.FC<ISavedItemsComponentProps> = (_props) => {
  const { savedItems, toggleSavedItem, addToCart, setSelectedProductDetail, setActiveTab } = useCart();

  return (
    <PageCast className="bg-surface relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button onClick={() => setActiveTab('profile')} className="p-1.5 hover:bg-[#f0edeb] rounded-full transition-colors active:scale-95">
          <svg className="w-5.5 h-5.5 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">Saved Items</span>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 px-6 py-5.5 space-y-4 pb-28">
        {savedItems.length === 0 ? (
          <EmptyState
            title="No saved items"
            description="Tap the heart icon on any product to save it here for later."
            actionText="Explore Products"
            onAction={() => setActiveTab('home')}
          />
        ) : (
          /* Saved items list */
          <div className="grid grid-cols-2 gap-x-5 gap-y-7">
            {savedItems.map((prod) => {
              let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
              try {
                const parsed = JSON.parse(prod.images);
                if (parsed && parsed.length > 0) img = parsed[0];
              } catch (e) {}

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductDetail(prod)}
                  className="bg-white rounded-2xl overflow-hidden flex flex-col relative border border-[#f0edeb] shadow-xs group hover:shadow-md cursor-pointer transition-all duration-300"
                >
                  {/* Remove Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSavedItem(prod); }}
                    className="absolute top-2.5 right-2.5 z-10 w-7.5 h-7.5 rounded-full bg-white/95 shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50 active:scale-90 transition-all"
                  >
                    <svg className="w-4 h-4 fill-red-500 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  {/* Image */}
                  <div className="h-[140px] w-full overflow-hidden bg-neutral-50 border-b border-[#f0edeb]">
                    <img src={img} alt={prod.name} className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-102" />
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-[#526069]/60 uppercase font-bold tracking-wider">{prod.category?.name}</span>
                      <h3 className="text-xs font-semibold text-textColor mt-0.5 line-clamp-1">{prod.name}</h3>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3.5">
                      <span className="text-xs font-bold text-textColor">${prod.price.toFixed(2)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(prod); }}
                        className="text-[9px] font-bold uppercase tracking-wider text-primary hover:text-primary-dark active:scale-95 transition-transform"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageCast>
  );
}
