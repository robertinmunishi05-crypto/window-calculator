import { useState, useCallback } from "react";
import ClientForm from "@/components/ClientForm";
import ConfigPanel from "@/components/ConfigPanel";
import OrderSummary from "@/components/OrderSummary";
import ThemeToggle from "@/components/ThemeToggle";
import { ClientData, ConfigItem, ProductType, ProfileSystem, createDefaultItem } from "@/types/configurator";
import { DoorOpen, LayoutGrid, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Index = () => {
  const [clientData, setClientData] = useState<ClientData>({ name: '', phone: '', address: '' });
  const [currentItem, setCurrentItem] = useState<ConfigItem | null>(null);
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [profileSystem, setProfileSystem] = useState<ProfileSystem>({ type: 'veka' });

  const handleSelectProductType = (type: ProductType) => {
    setCurrentItem(createDefaultItem(type));
  };

  const handleResetItem = () => {
    setCurrentItem(null);
  };

  const handleAddToOrder = useCallback(() => {
    if (!currentItem) return;
    if (currentItem.width <= 0 || currentItem.height <= 0) {
      alert('Gjerësia dhe lartësia duhet të jenë më të mëdha se 0 cm.');
      return;
    }
    if (currentItem.quantity <= 0) {
      alert('Sasia duhet të jetë të paktën 1.');
      return;
    }
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

  const handleEditItem = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setCurrentItem({ ...item });
  }, [items]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <line x1="12" y1="3" x2="12" y2="21" />
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">Window</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Konfigurator Profesional</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <ClientForm data={clientData} onChange={setClientData} />

            {/* Step 1: Product Type Selection */}
            {!currentItem && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Hapi 1 — Zgjidh llojin</h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={() => handleSelectProductType('window')}
                    className={cn(
                      "flex flex-col items-center gap-2 sm:gap-3 p-5 sm:p-8 rounded-xl border-2 transition-all hover:border-primary hover:shadow-md",
                      "border-border bg-card"
                    )}
                  >
                    <LayoutGrid className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                    <span className="text-base sm:text-lg font-semibold">Dritare</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground text-center">Konfigurim i plotë i dritares</span>
                  </button>
                  <button
                    onClick={() => handleSelectProductType('door')}
                    className={cn(
                      "flex flex-col items-center gap-2 sm:gap-3 p-5 sm:p-8 rounded-xl border-2 transition-all hover:border-primary hover:shadow-md",
                      "border-border bg-card"
                    )}
                  >
                    <DoorOpen className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                    <span className="text-base sm:text-lg font-semibold">Derë</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground text-center">Konfigurim i plotë i derës</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {currentItem && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Hapi 2 — Konfiguro {currentItem.productType === 'door' ? 'Derën' : 'Dritaren'}
                  </h2>
                  <Button variant="outline" size="sm" onClick={handleResetItem} className="text-xs gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Fillo nga e Para</span>
                    <span className="sm:hidden">Reset</span>
                  </Button>
                </div>
                <ConfigPanel
                  item={currentItem}
                  onChange={setCurrentItem}
                  profileSystem={profileSystem}
                  onProfileChange={setProfileSystem}
                />
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
                profileSystem={profileSystem}
                onRemoveItem={handleRemoveItem}
                onEditItem={handleEditItem}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
