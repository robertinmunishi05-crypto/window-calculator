import { useState, useCallback } from "react";
import ClientForm from "@/components/ClientForm";
import ConfigPanel from "@/components/ConfigPanel";
import OrderSummary from "@/components/OrderSummary";
import { ClientData, ConfigItem, createDefaultItem } from "@/types/configurator";

const Index = () => {
  const [clientData, setClientData] = useState<ClientData>({ name: '', phone: '', address: '' });
  const [currentItem, setCurrentItem] = useState<ConfigItem | null>(createDefaultItem());
  const [items, setItems] = useState<ConfigItem[]>([]);

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
    setCurrentItem(createDefaultItem());
  }, [currentItem]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleAddNew = useCallback(() => {
    setCurrentItem(createDefaultItem());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-3">
            {/* Logo placeholder */}
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <line x1="12" y1="3" x2="12" y2="21" />
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Window</h1>
              <p className="text-xs text-muted-foreground">Konfigurator Profesional</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ClientForm data={clientData} onChange={setClientData} />
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
