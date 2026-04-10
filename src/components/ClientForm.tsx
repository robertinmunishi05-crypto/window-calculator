import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, MapPin } from "lucide-react";
import { ClientData } from "@/types/configurator";

interface ClientFormProps {
  data: ClientData;
  onChange: (data: ClientData) => void;
}

const ClientForm = ({ data, onChange }: ClientFormProps) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          Të Dhënat e Klientit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Emri i Klientit *</Label>
          <Input
            id="name"
            placeholder="Emri i plotë"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> Telefoni
            </Label>
            <Input
              id="phone"
              placeholder="+355..."
              value={data.phone}
              onChange={(e) => onChange({ ...data, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Adresa
            </Label>
            <Input
              id="address"
              placeholder="Adresa"
              value={data.address}
              onChange={(e) => onChange({ ...data, address: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientForm;
