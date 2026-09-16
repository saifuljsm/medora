import { ProductImportClient } from "@/components/admin/product-import-client";

export default function ProductImportPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 text-xl font-bold text-foreground">Bulk product import</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Upload a CSV or Excel file to create or update products. Rows are matched to existing
        products by barcode when present; rows without a barcode always create a new product.
      </p>
      <ProductImportClient />
    </div>
  );
}
