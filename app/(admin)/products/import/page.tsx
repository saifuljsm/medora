import { ProductImportClient } from "@/components/admin/product-import-client";
import { PageHeader } from "@/components/admin/page-header";

export default function ProductImportPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Bulk product import"
        description="Upload a CSV or Excel file to create or update products. Rows are matched to existing products by barcode when present; rows without a barcode always create a new product."
      />
      <ProductImportClient />
    </div>
  );
}
