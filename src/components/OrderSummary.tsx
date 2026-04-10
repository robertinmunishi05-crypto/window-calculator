import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Plus, Trash2, ClipboardList } from "lucide-react";
import { ConfigItem, PRODUCT_LABELS, COLOR_LABELS, ClientData } from "@/types/configurator";
import { generatePDF } from "@/lib/pdfGenerator";

interface OrderSummaryProps {
  items: ConfigItem[];
  clientData: ClientData;
  onRemoveItem: (id: string) => void;
  onAddNew: () => void;
}

const OrderSummary = ({ items, clientData, onRemoveItem, onAddNew }: OrderSummaryProps) => {
  const grandTotal = items.reduce((sum, item) => {
    const area = (item.width / 1000) * (item.height / 1000);
    return sum + area * item.pricePerSqm * item.quantity;
  }, 0);

  const handleDownloadPDF = () => {
    generatePDF(clientData, items);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Përmbledhja e Porosisë
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Shtoni produkte për të parë përmbledhjen
          </p>
        ) : (
          <>
            {items.map((item, idx) => {
              const area = (item.width / 1000) * (item.height / 1000);
              const price = area * item.pricePerSqm * item.quantity;
              return (
                <div key={item.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {idx + 1}. {PRODUCT_LABELS[item.productType]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.width}×{item.height}mm · {COLOR_LABELS[item.color]} · x{item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">€{price.toFixed(2)}</span>
                    <button onClick={() => onRemoveItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-semibold">Totali i Përgjithshëm</span>
              <span className="text-2xl font-bold">€{grandTotal.toFixed(2)}</span>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={onAddNew} variant="outline" className="flex-1">
            <Plus className="h-4 w-4 mr-1" /> Shto Produkt
          </Button>
          {items.length > 0 && (
            <Button onClick={handleDownloadPDF} className="flex-1">
              <FileDown className="h-4 w-4 mr-1" /> Shkarko PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
