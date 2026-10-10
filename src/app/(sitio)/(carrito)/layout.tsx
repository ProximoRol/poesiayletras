import { CarritoProvider } from "@/components/Carrito";
import { perfil } from "@/server/datos";

export default async function LayoutCarrito({ children }: { children: React.ReactNode }) {
  const p = await perfil();
  return (
    <CarritoProvider whatsapp={p.whatsapp} autor={p.nombre.split(" ")[0]}>
      {children}
    </CarritoProvider>
  );
}
