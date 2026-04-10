import { useState, useCallback } from "react";
import ClientForm from "@/components/ClientForm";
import ProductSelector from "@/components/ProductSelector";
import ConfigPanel from "@/components/ConfigPanel";
import OrderSummary from "@/components/OrderSummary";
import { ClientData, ConfigItem, ProductType, DEFAULT_PRICES, createDefaultStructure } from "@/types/configurator";
import { DoorOpen } from "lucide-react";

const createItem = (productType: ProductType): ConfigItem => ({
  id: crypto.randomUUID(),
  productType,
  width: 1200,
  height: 1400,
  color: 'white',
  pricePerSqm: DEFAULT_PRICES.white,
  quantity: 1,
  structure: createDefaultStructure(),
});

const Index = () => {
  const [clientData, setClientData] = useState<ClientData>({ name: '', phone: '', address: '' });
  const [currentItem, setCurrentItem] = useState<ConfigItem | null>(null);
  const [items, setItems] = useState<ConfigItem[]>([]);

  const handleProductSelect = useCallback((type: ProductType) => {
    if (currentItem) {
      setCurrentItem({ ...currentItem, productType: type });
    } else {
      setCurrentItem(createItem(type));
    }
  }, [currentItem]);

  const handleAddToOrder = useCallback(() => {
    if (!currentItem) return;
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.id === currentItem.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = currentItem;
        return updated;
      }
      return [...prev, currentItem];
    });
    setCurrentItem(null);
  }, [currentItem]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleAddNew = useCallback(() => {
    setCurrentItem(null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Dyer & Dritare</h1>
              <p className="text-xs text-muted-foreground">Konfigurator Profesional</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ClientForm data={clientData} onChange={setClientData} />
            <ProductSelector selected={currentItem?.productType ?? null} onSelect={handleProductSelect} />
            {currentItem && (
              <div className="space-y-4">
                <ConfigPanel item={currentItem} onChange={setCurrentItem} />
                <button
                  onClick={handleAddToOrder}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                >
                  {items.find((i) => i.id === currentItem.id) ? 'Përditëso në Porosi' : 'Shto në Porosi'}
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <OrderSummary
                items={items}
                clientData={clientData}
                onRemoveItem={handleRemoveItem}
                onAddNew={handleAddNew}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
