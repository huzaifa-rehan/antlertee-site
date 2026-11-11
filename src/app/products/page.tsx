import { Rack } from "@/components/product/Rack";
import { QuoteCta } from "@/components/QuoteCta";
import { categories, products } from "@/content/products";
import { facts } from "@/content/site";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Products: private-label knitwear, fleece, outerwear and denim",
  description: `The full rack: heavyweight tees, hoodies, sweatshirts, reflective and heat-reactive outerwear, custom denim, jerseys, embroidery and print. Every base built to your spec, MOQ ${facts.moqLong}.`,
  path: "/products/",
});

export default function ProductsPage() {
  return (
    <>
      <div style={{ paddingTop: 70 }}>
        <Rack
          products={products}
          basePath="/products/"
          showFilters
          titleAs="h1"
          title="The rack"
          intro={`${products.length} bases across ${categories.length} categories. Pick one, open it for fabric, weight and finishes, then send us your spec.`}
        />
      </div>
      <QuoteCta title={"Don't see it?\nWe'll build it"} />
    </>
  );
}
