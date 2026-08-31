import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart, formatINR } from "@/lib/cart";

export function CartSheet() {
  const { items, count, total, setQty, removeItem, clear } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Open cart"
          className="relative flex size-10 items-center justify-center rounded-sm border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ShoppingBag className="size-4" />
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col bg-background sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl tracking-widest">Your Bag</SheetTitle>
          <SheetDescription>
            {count === 0 ? "Your bag is empty." : `${count} item${count > 1 ? "s" : ""} ready.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {items.map((item) => (
            <div key={item.id} className="surface-card rounded-md p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.size} · {item.edition}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty(item.id, item.qty - 1)}
                    aria-label="Decrease quantity"
                    className="flex size-7 items-center justify-center rounded-sm border border-border hover:border-primary"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-6 text-center text-sm">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(item.id, item.qty + 1)}
                    aria-label="Increase quantity"
                    className="flex size-7 items-center justify-center rounded-sm border border-border hover:border-primary"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <span className="text-sm font-semibold">{formatINR(item.price * item.qty)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-display text-2xl">{formatINR(total)}</span>
          </div>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => {
              toast.success("Order placed", {
                description: "This is a demo checkout — no payment was taken.",
              });
              clear();
            }}
            className="w-full rounded-sm bg-primary py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-opacity disabled:opacity-40"
          >
            Checkout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
