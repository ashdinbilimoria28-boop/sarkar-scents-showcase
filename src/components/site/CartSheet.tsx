import { useEffect, useRef, useState } from "react";
import { ShoppingBag, Minus, Plus, Trash2, X } from "lucide-react";
import { useCart, formatINR } from "@/lib/cart";

export function CartSheet() {
  const { items, count, total, setQty, removeItem, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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

      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-title"
        >
          <button
            type="button"
            aria-label="Close cart"
            className="absolute inset-0 size-full bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 id="cart-title" className="font-display text-2xl tracking-widest">
                  Your Bag
                </h2>
                <p className="text-sm text-muted-foreground">
                  {count === 0
                    ? "Your bag is empty."
                    : `${count} item${count > 1 ? "s" : ""} ready.`}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="flex size-9 items-center justify-center rounded-sm border border-border text-foreground hover:border-primary hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {message && (
                <p
                  className="rounded-sm border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
                  role="status"
                >
                  {message}
                </p>
              )}
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
                    <span className="text-sm font-semibold">
                      {formatINR(item.price * item.qty)}
                    </span>
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
                  clear();
                  setMessage("Demo order placed — no payment was taken.");
                }}
                className="w-full rounded-sm bg-primary py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-opacity disabled:opacity-40"
              >
                Checkout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
