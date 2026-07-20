import { IProductComparisonProps } from './product-comparison.type';
import { LazyImageComponent } from '../lazy-image';

export const ProductComparison: React.FC<IProductComparisonProps> = ({ products, onRemove, onClose }) => {
  if (products.length === 0) return null;

  const getUniqueColors = (product: any) => {
    if (!product.variants) return [];
    return Array.from(new Set(product.variants.map((v: any) => v.color).filter((c: string) => c && c !== 'DEFAULT')));
  };

  const getUniqueSizes = (product: any) => {
    if (!product.variants) return [];
    return Array.from(new Set(product.variants.map((v: any) => v.size).filter((s: string) => s && s !== 'DEFAULT')));
  };

  const getAverageRating = (product: any) => {
    if (!product.comments || product.comments.length === 0) return 0;
    const totalRating = product.comments.reduce((sum: number, c: any) => sum + (c.rating || 0), 0);
    return (totalRating / product.comments.length).toFixed(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f0edeb] flex items-center justify-between">
          <h3 className="text-lg font-bold text-textColor">So sánh sản phẩm ({products.length}/3)</h3>
          <button
            onClick={onClose}
            className="text-textColor-variant hover:text-textColor border-none bg-transparent cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-4">
            {/* Labels Column */}
            <div className="space-y-4">
              <div className="h-32" />
              <div className="text-sm font-semibold text-textColor-variant">Giá</div>
              <div className="text-sm font-semibold text-textColor-variant">Đánh giá</div>
              <div className="text-sm font-semibold text-textColor-variant">Đã bán</div>
              <div className="text-sm font-semibold text-textColor-variant">Màu sắc</div>
              <div className="text-sm font-semibold text-textColor-variant">Kích thước</div>
              <div className="text-sm font-semibold text-textColor-variant">Danh mục</div>
            </div>

            {/* Product Columns */}
            {products.map((product) => {
              let img = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';
              try {
                const parsed = JSON.parse(product.images);
                if (parsed && parsed.length > 0) img = parsed[0];
              } catch (e) {}

              return (
                <div key={product.id} className="space-y-4">
                  {/* Product Image & Remove Button */}
                  <div className="relative h-32 bg-neutral-50 rounded-lg overflow-hidden">
                    <LazyImageComponent src={img} alt={product.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => onRemove(product.id)}
                      className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#f0edeb] hover:bg-red-50 hover:border-red-200 transition-colors"
                    >
                      <svg className="w-4 h-4 text-textColor-variant" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-sm font-bold text-textColor">
                    {product.price.toLocaleString('vi-VN')} đ
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500 text-sm">★</span>
                    <span className="text-sm text-textColor">{getAverageRating(product)}</span>
                  </div>

                  {/* Sold Count */}
                  <div className="text-sm text-textColor-variant">
                    {product.soldCount || 0} đã bán
                  </div>

                  {/* Colors */}
                  <div className="flex gap-1 flex-wrap">
                    {getUniqueColors(product).map((color) => (
                      <div
                        key={color as string}
                        className="w-5 h-5 rounded-full border border-[#f0edeb]"
                        style={{ backgroundColor: color as string }}
                        title={color as string}
                      />
                    ))}
                    {getUniqueColors(product).length === 0 && (
                      <span className="text-xs text-textColor-variant">-</span>
                    )}
                  </div>

                  {/* Sizes */}
                  <div className="flex gap-1 flex-wrap">
                    {getUniqueSizes(product).map((size) => (
                      <span
                        key={size as string}
                        className="text-xs px-2 py-0.5 bg-neutral-100 rounded text-textColor-variant"
                      >
                        {size as string}
                      </span>
                    ))}
                    {getUniqueSizes(product).length === 0 && (
                      <span className="text-xs text-textColor-variant">-</span>
                    )}
                  </div>

                  {/* Category */}
                  <div className="text-sm text-textColor-variant">
                    {product.category?.name || '-'}
                  </div>
                </div>
              );
            })}

            {/* Empty slot */}
            {products.length < 3 && (
              <div className="space-y-4">
                <div className="h-32 border-2 border-dashed border-[#f0edeb] rounded-lg flex items-center justify-center">
                  <span className="text-xs text-textColor-variant">Thêm sản phẩm</span>
                </div>
                <div className="h-6" />
                <div className="h-6" />
                <div className="h-6" />
                <div className="h-6" />
                <div className="h-6" />
                <div className="h-6" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0edeb] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-[#eae8e6] text-sm font-semibold text-textColor-variant hover:bg-neutral-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
