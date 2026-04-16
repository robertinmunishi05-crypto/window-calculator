import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Trash2, ClipboardList, User, Building2 } from "lucide-react";
import { ConfigItem, ClientData, describeNode, calculateLinearMeters, COLOR_LABELS, ProfileSystem } from "@/types/configurator";
import { generateClientPDF, generateCompanyPDF } from "@/lib/pdfGenerator";

interface OrderSummaryProps {
  items: ConfigItem[];
  clientData: ClientData;
  profileSystem: ProfileSystem;
  onRemoveItem: (id: string) => void;
}

const OrderSummary = ({ items, clientData, profileSystem, onRemoveItem }: OrderSummaryProps) => {
  const totalLinearMeters = items.reduce((sum, item) => {
    return sum + calculateLinearMeters(item).total * item.quantity;
  }, 0);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Përmbledhja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) => {
          const lm = calculateLinearMeters(item);
          return (
            <div key={item.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {idx + 1}. {describeNode(item.rootNode)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(item.width / 10).toFixed(1)}×{(item.height / 10).toFixed(1)} cm · {COLOR_LABELS[item.color]} · x{item.quantity}
                </p>
                <p className="text-xs font-medium text-primary">
                  L={lm.outerFrame.toFixed(2)}m  Z={lm.openingFrames.toFixed(2)}m
                </p>
              </div>
              <button onClick={() => onRemoveItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-3 border-t">
          <span className="font-semibold">Totali Profil</span>
          <span className="text-2xl font-bold">{totalLinearMeters.toFixed(2)} m</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            onClick={() => generateClientPDF(clientData, items)}
            variant="outline"
            className="flex-1 text-xs h-10"
          >
            <User className="h-4 w-4 mr-1" /> PDF Klient
          </Button>
          <Button
            onClick={() => generateCompanyPDF(clientData, items, profileSystem)}
            className="flex-1 text-xs h-10"
          >
            <Building2 className="h-4 w-4 mr-1" /> PDF Kompani
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
