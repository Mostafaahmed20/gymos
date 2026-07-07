import UserLayout from "@/components/UserLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Minus, Package, Plus, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CartItem = { supplementId: number; name: string; price: number; quantity: number };

export default function UserStore() {
  const { t, language } = useLanguage();
  const ui = language === "ar"
    ? {
        searchProducts: "ابحث عن منتج",
        qty: "الكمية",
        maxStock: "الحد الأقصى حسب المخزون",
        orderItems: "عناصر الطلب",
        paid: "مدفوع",
        unpaid: "غير مدفوع",
      }
    : {
        searchProducts: "Search products",
        qty: "Qty",
        maxStock: "Maximum based on stock",
        orderItems: "Order Items",
        paid: "Paid",
        unpaid: "Unpaid",
      };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const categoriesQuery = trpc.userPortal.supplementCategories.useQuery();
  const supplementsQuery = trpc.userPortal.supplements.useQuery({
    categoryId: filterCategory !== "all" ? Number(filterCategory) : undefined,
    search: search.trim() || undefined,
    limit: 100,
  });
  const ordersQuery = trpc.userPortal.myOrders.useQuery();
  const utils = trpc.useUtils();

  const placeOrderMutation = trpc.userPortal.placeOrder.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.userPortal.myOrders.invalidate(), utils.userPortal.supplements.invalidate()]);
      setCart([]);
      toast.success(t.userStore.orderPlaced);
    },
    onError: (error) => toast.error(error.message),
  });

  const supplements = supplementsQuery.data?.data ?? [];
  const orders = ordersQuery.data?.data ?? [];
  const supplementById = useMemo(() => new Map(supplements.map((supplement) => [supplement.id, supplement])), [supplements]);

  const addToCart = (supplement: any) => {
    if (Number(supplement.stock) <= 0) return;
    let added = false;
    setCart((prev) => {
      const existing = prev.find((item) => item.supplementId === supplement.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, Number(supplement.stock));
        if (nextQty === existing.quantity) {
          toast.error(ui.maxStock);
          return prev;
        }
        added = true;
        return prev.map((item) => item.supplementId === supplement.id ? { ...item, quantity: nextQty } : item);
      }
      added = true;
      return [...prev, {
        supplementId: supplement.id,
        name: supplement.name,
        price: Number(supplement.discountPrice ?? supplement.price),
        quantity: 1,
      }];
    });
    if (added) {
      toast.success(`${supplement.name} ${t.common.add}`);
    }
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.supplementId !== id) return item;
      const maxStock = Number(supplementById.get(id)?.stock ?? item.quantity);
      const nextQty = Math.max(1, Math.min(item.quantity + delta, maxStock));
      return { ...item, quantity: nextQty };
    }));
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((item) => item.supplementId !== id));
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <UserLayout title={t.userStore.title}>
      <Tabs defaultValue="shop">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="shop">{t.userStore.title}</TabsTrigger>
          <TabsTrigger value="cart" className="gap-1">
            {t.userStore.cart} {cart.length > 0 ? <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">{cart.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="orders">{t.userStore.myOrders}</TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={ui.searchProducts}
              className="w-56"
            />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44"><SelectValue placeholder={t.common.all} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                {(categoriesQuery.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {supplementsQuery.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-56 bg-card border border-border rounded-xl animate-pulse" />)}
            </div>
          ) : supplements.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t.userStore.noProducts}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {supplements.map((supplement) => (
                <Card key={supplement.id} className="bg-card border-border hover:border-primary/40 transition-all group">
                  <CardContent className="p-4">
                    <div className="w-full h-24 bg-secondary/50 rounded-lg flex items-center justify-center mb-3 overflow-hidden group-hover:bg-primary/10 transition-colors">
                      {supplement.imageUrl ? (
                        <img src={supplement.imageUrl} alt={supplement.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <h3 className="font-medium text-foreground text-sm mb-1 line-clamp-2">{supplement.name}</h3>
                    {supplement.brand ? <p className="text-xs text-muted-foreground mb-2">{supplement.brand}</p> : null}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-primary">${supplement.discountPrice ?? supplement.price}</span>
                        {supplement.discountPrice ? <span className="text-xs text-muted-foreground line-through ms-1">${supplement.price}</span> : null}
                      </div>
                      <span className={`text-xs ${Number(supplement.stock) <= 5 ? "text-red-400" : "text-muted-foreground"}`}>
                        {Number(supplement.stock) === 0 ? t.userStore.outOfStock : `${supplement.stock} ${t.userStore.items}`}
                      </span>
                    </div>
                    <Button size="sm" className="w-full gap-1" disabled={Number(supplement.stock) === 0} onClick={() => addToCart(supplement)}>
                      <ShoppingCart className="w-3 h-3" />
                      {t.userStore.addToCart}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cart">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t.userStore.emptyCart}</p>
            </div>
          ) : (
            <div className="max-w-lg space-y-4">
              {cart.map((item) => (
                <Card key={item.supplementId} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">{item.name}</div>
                      <div className="text-primary font-bold">${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateQty(item.supplementId, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateQty(item.supplementId, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.supplementId)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="bg-card border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-foreground">{t.userStore.total}</span>
                    <span className="text-2xl font-black text-primary">${cartTotal.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => placeOrderMutation.mutate({ items: cart.map((item) => ({ supplementId: item.supplementId, quantity: item.quantity })) })}
                    disabled={placeOrderMutation.isPending}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {placeOrderMutation.isPending ? t.common.loading : t.userStore.placeOrder}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {ordersQuery.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 bg-card border border-border rounded-lg animate-pulse" />)}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t.userStore.noOrders}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <UserOrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrderId === order.id}
                  onToggle={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}
                  orderItemsLabel={ui.orderItems}
                  statusLabels={t.userStore}
                  paidLabel={ui.paid}
                  unpaidLabel={ui.unpaid}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </UserLayout>
  );
}

function UserOrderCard({
  order,
  expanded,
  onToggle,
  orderItemsLabel,
  statusLabels,
  paidLabel,
  unpaidLabel,
}: {
  order: any;
  expanded: boolean;
  onToggle: () => void;
  orderItemsLabel: string;
  statusLabels: any;
  paidLabel: string;
  unpaidLabel: string;
}) {
  const itemsQuery = trpc.userPortal.myOrderItems.useQuery({ orderId: order.id }, { enabled: expanded });
  const items = itemsQuery.data ?? [];
  const isPaid = Boolean(order.paymentId);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-foreground">#{order.id}</div>
            <div className="text-sm text-muted-foreground">{new Date(order.createdAt as any).toLocaleDateString()}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary">${order.totalAmount}</span>
            <Badge className={
              order.status === "delivered" ? "bg-green-500/20 text-green-400" :
              order.status === "confirmed" ? "bg-blue-500/20 text-blue-400" :
              order.status === "cancelled" ? "bg-red-500/20 text-red-400" :
              "bg-yellow-500/20 text-yellow-400"
            }>
              {order.status === "delivered" ? statusLabels.delivered : order.status === "confirmed" ? statusLabels.confirmed : order.status === "cancelled" ? statusLabels.cancelled : statusLabels.pending}
            </Badge>
            <Badge className={isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}>
              {isPaid ? paidLabel : unpaidLabel}
            </Badge>
            <Button size="sm" variant="ghost" onClick={onToggle}>{orderItemsLabel}</Button>
          </div>
        </div>
        {expanded ? (
          <div className="mt-3 border-t border-border pt-3">
            {itemsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items</div>
            ) : (
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded border border-border p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded bg-secondary/50 overflow-hidden flex items-center justify-center">
                        {item.supplementImageUrl ? (
                          <img src={item.supplementImageUrl} alt={item.supplementName ?? String(item.supplementId)} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">{item.supplementName ?? `#${item.supplementId}`}</div>
                        <div className="text-xs text-muted-foreground">qty: {item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-primary">${item.totalPrice}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
