import AdminLayout from "@/components/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CreditCard, Edit, Package, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  delivered: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const PAYMENT_METHOD_OPTIONS = ["cash", "card", "wallet", "transfer"] as const;
type PaymentMethod = typeof PAYMENT_METHOD_OPTIONS[number];

type ProductFormState = {
  name: string;
  categoryId: string;
  price: string;
  discountPrice: string;
  stock: string;
  brand: string;
  imageUrl: string;
  description: string;
  isFeatured: "yes" | "no";
  isActive: "yes" | "no";
};

const emptyProductForm: ProductFormState = {
  name: "",
  categoryId: "none",
  price: "",
  discountPrice: "",
  stock: "0",
  brand: "",
  imageUrl: "",
  description: "",
  isFeatured: "no",
  isActive: "yes",
};

type PaymentFormState = {
  paymentMethod: PaymentMethod;
  paymentDate: string;
  receiptNumber: string;
  notes: string;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyPaymentForm: PaymentFormState = {
  paymentMethod: "cash",
  paymentDate: todayISO(),
  receiptNumber: "",
  notes: "",
};

export default function AdminSupplements() {
  const { t, language } = useLanguage();
  const ui = language === "ar"
    ? {
        products: "المنتجات",
        categories: "الفئات",
        orders: "الطلبات",
        addCategory: "إضافة فئة",
        addProduct: "إضافة منتج",
        editProduct: "تعديل المنتج",
        allCategories: "كل الفئات",
        allOrders: "كل الطلبات",
        noCategories: "لا توجد فئات بعد",
        noOrders: "لا توجد طلبات بعد",
        noProducts: "لا توجد منتجات بعد",
        inStock: "في المخزون",
        lowStock: "مخزون منخفض",
        orderItems: "عناصر الطلب",
        markConfirmed: "تأكيد",
        markDelivered: "تم التسليم",
        markCancelled: "إلغاء",
        markPaid: "تسجيل دفع",
        paid: "مدفوع",
        unpaid: "غير مدفوع",
        payOrder: "دفع الطلب",
        paymentMethod: "طريقة الدفع",
        paymentDate: "تاريخ الدفع",
        receiptNumber: "رقم الإيصال",
        editCategory: "تعديل الفئة",
        categoryName: "اسم الفئة",
        description: "الوصف",
      }
    : {
        products: "Products",
        categories: "Categories",
        orders: "Orders",
        addCategory: "Add Category",
        addProduct: "Add Product",
        editProduct: "Edit Product",
        allCategories: "All Categories",
        allOrders: "All Orders",
        noCategories: "No categories yet",
        noOrders: "No orders yet",
        noProducts: "No products yet",
        inStock: "in stock",
        lowStock: "Low stock",
        orderItems: "Order Items",
        markConfirmed: "Confirm",
        markDelivered: "Delivered",
        markCancelled: "Cancel",
        markPaid: "Mark Paid",
        paid: "Paid",
        unpaid: "Unpaid",
        payOrder: "Order Payment",
        paymentMethod: "Payment Method",
        paymentDate: "Payment Date",
        receiptNumber: "Receipt Number",
        editCategory: "Edit Category",
        categoryName: "Category Name",
        description: "Description",
      };

  const [filterCategory, setFilterCategory] = useState("all");
  const [orderStatus, setOrderStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyPaymentForm);

  const categoriesQuery = trpc.supplements.categories.useQuery();
  const supplementsQuery = trpc.supplements.list.useQuery({
    categoryId: filterCategory !== "all" ? Number(filterCategory) : undefined,
    search: search.trim() || undefined,
    limit: 120,
  });
  const ordersQuery = trpc.supplements.orders.useQuery({
    status: orderStatus !== "all" ? orderStatus : undefined,
    limit: 40,
  });
  const utils = trpc.useUtils();

  const createCategoryMutation = trpc.supplements.createCategory.useMutation({
    onSuccess: async () => {
      await utils.supplements.categories.invalidate();
      setShowCategoryDialog(false);
      setCategoryName("");
      setCategoryDescription("");
      setEditCategory(null);
      toast.success(ui.addCategory);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCategoryMutation = trpc.supplements.updateCategory.useMutation({
    onSuccess: async () => {
      await utils.supplements.categories.invalidate();
      setShowCategoryDialog(false);
      setCategoryName("");
      setCategoryDescription("");
      setEditCategory(null);
      toast.success(t.common.save);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteCategoryMutation = trpc.supplements.deleteCategory.useMutation({
    onSuccess: async () => {
      await utils.supplements.categories.invalidate();
      toast.success(t.common.delete);
    },
    onError: (error) => toast.error(error.message),
  });

  const createProductMutation = trpc.supplements.create.useMutation({
    onSuccess: async () => {
      await utils.supplements.list.invalidate();
      setShowProductDialog(false);
      setEditProduct(null);
      setProductForm(emptyProductForm);
      toast.success(ui.addProduct);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateProductMutation = trpc.supplements.update.useMutation({
    onSuccess: async () => {
      await utils.supplements.list.invalidate();
      setShowProductDialog(false);
      setEditProduct(null);
      setProductForm(emptyProductForm);
      toast.success(t.common.save);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteProductMutation = trpc.supplements.delete.useMutation({
    onSuccess: async () => {
      await utils.supplements.list.invalidate();
      toast.success(t.common.delete);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateOrderMutation = trpc.supplements.updateOrderStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.supplements.orders.invalidate(), utils.supplements.list.invalidate()]);
      toast.success(t.common.save);
    },
    onError: (error) => toast.error(error.message),
  });

  const recordOrderPaymentMutation = trpc.supplements.recordOrderPayment.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.supplements.orders.invalidate(),
        utils.payments.list.invalidate(),
        utils.payments.revenueStats.invalidate(),
      ]);
      setShowPaymentDialog(false);
      setPaymentOrder(null);
      setPaymentForm(emptyPaymentForm);
      toast.success(ui.markPaid);
    },
    onError: (error) => toast.error(error.message),
  });

  const categories = categoriesQuery.data ?? [];
  const supplements = supplementsQuery.data?.data ?? [];
  const orders = ordersQuery.data?.data ?? [];

  const openCreateProductDialog = () => {
    setEditProduct(null);
    setProductForm(emptyProductForm);
    setShowProductDialog(true);
  };

  const openEditProductDialog = (product: any) => {
    setEditProduct(product);
    setProductForm({
      name: product.name ?? "",
      categoryId: product.categoryId ? String(product.categoryId) : "none",
      price: product.price ?? "",
      discountPrice: product.discountPrice ?? "",
      stock: String(product.stock ?? 0),
      brand: product.brand ?? "",
      imageUrl: product.imageUrl ?? "",
      description: product.description ?? "",
      isFeatured: product.isFeatured ? "yes" : "no",
      isActive: product.isActive ? "yes" : "no",
    });
    setShowProductDialog(true);
  };

  const openCreateCategoryDialog = () => {
    setEditCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setShowCategoryDialog(true);
  };

  const openEditCategoryDialog = (category: any) => {
    setEditCategory(category);
    setCategoryName(category.name ?? "");
    setCategoryDescription(category.description ?? "");
    setShowCategoryDialog(true);
  };

  const openOrderPaymentDialog = (order: any) => {
    setPaymentOrder(order);
    setPaymentForm({
      paymentMethod: "cash",
      paymentDate: todayISO(),
      receiptNumber: "",
      notes: order?.notes ?? "",
    });
    setShowPaymentDialog(true);
  };

  const submitProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const basePayload = {
      name: productForm.name.trim(),
      price: productForm.price,
      discountPrice: productForm.discountPrice || undefined,
      stock: Number(productForm.stock || "0"),
      brand: productForm.brand || undefined,
      imageUrl: productForm.imageUrl || undefined,
      description: productForm.description || undefined,
      isFeatured: productForm.isFeatured === "yes",
      isActive: productForm.isActive === "yes",
    };

    if (editProduct) {
      updateProductMutation.mutate({
        id: editProduct.id,
        ...basePayload,
        categoryId: productForm.categoryId === "none" ? null : Number(productForm.categoryId),
      });
      return;
    }
    createProductMutation.mutate({
      ...basePayload,
      categoryId: productForm.categoryId === "none" ? undefined : Number(productForm.categoryId),
    });
  };

  const submitCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    const payload = { name: categoryName.trim(), description: categoryDescription || undefined };
    if (editCategory) {
      updateCategoryMutation.mutate({ id: editCategory.id, ...payload });
      return;
    }
    createCategoryMutation.mutate(payload);
  };

  const submitOrderPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentOrder?.id) return;
    recordOrderPaymentMutation.mutate({
      orderId: paymentOrder.id,
      paymentMethod: paymentForm.paymentMethod,
      paymentDate: paymentForm.paymentDate,
      receiptNumber: paymentForm.receiptNumber || undefined,
      notes: paymentForm.notes || undefined,
    });
  };

  const paymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case "cash":
        return t.payments.cash;
      case "card":
        return t.payments.card;
      case "wallet":
        return language === "ar" ? "محفظة" : "Wallet";
      case "transfer":
        return language === "ar" ? "تحويل" : "Transfer";
      default:
        return method;
    }
  };

  return (
    <AdminLayout title={t.supplements.title}>
      <Tabs defaultValue="products">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="products">{ui.products}</TabsTrigger>
          <TabsTrigger value="categories">{ui.categories}</TabsTrigger>
          <TabsTrigger value="orders">{ui.orders}</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.common.search}
              className="w-56"
            />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-52"><SelectValue placeholder={ui.allCategories} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ui.allCategories}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreateProductDialog} className="gap-2 ms-auto">
              <Plus className="w-4 h-4" />
              {ui.addProduct}
            </Button>
          </div>

          {supplementsQuery.isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-72 bg-card border border-border rounded-xl animate-pulse" />)}
            </div>
          ) : supplements.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{ui.noProducts}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {supplements.map((supplement) => (
                <Card key={supplement.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="w-full h-32 rounded-lg bg-secondary/40 mb-3 overflow-hidden flex items-center justify-center">
                      {supplement.imageUrl ? (
                        <img src={supplement.imageUrl} alt={supplement.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground text-sm truncate">{supplement.name}</h3>
                        {supplement.brand ? <p className="text-xs text-muted-foreground">{supplement.brand}</p> : null}
                      </div>
                      <Badge className={supplement.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {supplement.isActive ? t.common.active : t.common.inactive}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-lg font-bold text-primary">${supplement.discountPrice ?? supplement.price}</span>
                        {supplement.discountPrice ? (
                          <span className="text-xs text-muted-foreground line-through ms-1">${supplement.price}</span>
                        ) : null}
                      </div>
                      <div className="text-end">
                        <div className={`text-sm font-medium ${Number(supplement.stock) <= 5 ? "text-red-400" : "text-foreground"}`}>
                          {supplement.stock}
                        </div>
                        <div className="text-xs text-muted-foreground">{ui.inStock}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditProductDialog(supplement)}>
                        <Edit className="w-3 h-3" />
                        {t.common.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (!confirm(t.supplements.deleteConfirm)) return;
                          deleteProductMutation.mutate({ id: supplement.id });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateCategoryDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              {ui.addCategory}
            </Button>
          </div>
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">{ui.noCategories}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{category.name}</div>
                        {category.description ? <div className="text-xs text-muted-foreground mt-1">{category.description}</div> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditCategoryDialog(category)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (!confirm(t.common.confirm)) return;
                            deleteCategoryMutation.mutate({ id: category.id });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex gap-3">
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder={ui.allOrders} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ui.allOrders}</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="confirmed">confirmed</SelectItem>
                <SelectItem value="delivered">delivered</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {ordersQuery.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 bg-card border border-border rounded-lg animate-pulse" />)}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{ui.noOrders}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <AdminOrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrderId === order.id}
                  onToggle={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}
                  onUpdateStatus={(status) => updateOrderMutation.mutate({ id: order.id, status })}
                  onPay={() => openOrderPaymentDialog(order)}
                  statusLabelMap={ui}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader><DialogTitle>{editProduct ? ui.editProduct : ui.addProduct}</DialogTitle></DialogHeader>
          <form onSubmit={submitProduct} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.supplements.productName} *</Label>
              <Input value={productForm.name} onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.supplements.category}</Label>
                <Select value={productForm.categoryId} onValueChange={(value) => setProductForm((prev) => ({ ...prev, categoryId: value }))}>
                  <SelectTrigger><SelectValue placeholder={t.supplements.noCategory} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.supplements.noCategory}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.supplements.brand}</Label>
                <Input value={productForm.brand} onChange={(event) => setProductForm((prev) => ({ ...prev, brand: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.supplements.price} *</Label>
                <Input value={productForm.price} onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t.supplements.discountPrice}</Label>
                <Input value={productForm.discountPrice} onChange={(event) => setProductForm((prev) => ({ ...prev, discountPrice: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.supplements.stock}</Label>
                <Input type="number" value={productForm.stock} onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Image URL</Label>
                <Input value={productForm.imageUrl} onChange={(event) => setProductForm((prev) => ({ ...prev, imageUrl: event.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Featured</Label>
                <Select value={productForm.isFeatured} onValueChange={(value) => setProductForm((prev) => ({ ...prev, isFeatured: value as "yes" | "no" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={productForm.isActive} onValueChange={(value) => setProductForm((prev) => ({ ...prev, isActive: value as "yes" | "no" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t.common.active}</SelectItem>
                    <SelectItem value="no">{t.common.inactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{ui.description}</Label>
              <Input value={productForm.description} onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowProductDialog(false)}>{t.common.cancel}</Button>
              <Button type="submit" className="flex-1" disabled={createProductMutation.isPending || updateProductMutation.isPending}>{t.common.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{editCategory ? ui.editCategory : ui.addCategory}</DialogTitle></DialogHeader>
          <form onSubmit={submitCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{ui.categoryName} *</Label>
              <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{ui.description}</Label>
              <Input value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCategoryDialog(false)}>{t.common.cancel}</Button>
              <Button type="submit" className="flex-1" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>{t.common.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) {
            setPaymentOrder(null);
            setPaymentForm(emptyPaymentForm);
          }
        }}
      >
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>{ui.payOrder}{paymentOrder?.id ? ` #${paymentOrder.id}` : ""}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitOrderPayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{ui.paymentMethod} *</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, paymentMethod: value as PaymentMethod }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <SelectItem key={method} value={method}>{paymentMethodLabel(method)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{ui.paymentDate} *</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{ui.receiptNumber}</Label>
              <Input
                value={paymentForm.receiptNumber}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, receiptNumber: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{ui.description}</Label>
              <Input
                value={paymentForm.notes}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" className="flex-1" disabled={recordOrderPaymentMutation.isPending}>
                {recordOrderPaymentMutation.isPending ? t.common.loading : ui.markPaid}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function AdminOrderCard({
  order,
  expanded,
  onToggle,
  onUpdateStatus,
  onPay,
  statusLabelMap,
}: {
  order: any;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (status: "pending" | "confirmed" | "delivered" | "cancelled") => void;
  onPay: () => void;
  statusLabelMap: Record<string, string>;
}) {
  const itemsQuery = trpc.supplements.orderItems.useQuery({ orderId: order.id }, { enabled: expanded });
  const items = itemsQuery.data ?? [];
  const isPaid = Boolean(order.paymentId);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium text-foreground">{order.traineeName ?? `Order #${order.id}`}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(order.createdAt as any).toLocaleDateString()} · {order.itemCount ?? 0} item(s)
            </div>
            {isPaid && order.paidAt ? (
              <div className="text-xs text-emerald-400">
                {new Date(order.paidAt as any).toLocaleDateString()}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">${order.totalAmount}</span>
            <Badge className={ORDER_STATUS_COLORS[order.status] ?? "bg-gray-500/20 text-gray-400"}>{order.status}</Badge>
            <Badge className={isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}>
              {isPaid ? statusLabelMap.paid : statusLabelMap.unpaid}
            </Badge>
            {order.status === "pending" ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus("confirmed")}>{statusLabelMap.markConfirmed}</Button>
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus("cancelled")}>{statusLabelMap.markCancelled}</Button>
              </>
            ) : null}
            {order.status === "confirmed" ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus("delivered")}>{statusLabelMap.markDelivered}</Button>
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus("cancelled")}>{statusLabelMap.markCancelled}</Button>
              </>
            ) : null}
            {!isPaid && order.status !== "cancelled" ? (
              <Button size="sm" variant="outline" className="gap-1" onClick={onPay}>
                <CreditCard className="w-3 h-3" />
                {statusLabelMap.markPaid}
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onToggle}>{statusLabelMap.orderItems}</Button>
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
