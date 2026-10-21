import { Catalogue } from '@/components/Catalogue';
import { Compare } from '@/components/Compare';
import { ComparisonProvider } from '@/components/ComparisonContext';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { Sourcing } from '@/components/Sourcing';
import { products } from '@/data/products';
import { brand, site } from '@/data/site';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: brand.name, url: brand.url, description: site.description },
    {
      '@type': 'ItemList',
      name: `${brand.name} catalogue`,
      itemListElement: products.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: { '@type': 'Product', name: `${p.brand} ${p.name}`, brand: { '@type': 'Brand', name: p.brand }, description: p.summary },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <Hero />
      <Sourcing />
      <ComparisonProvider>
        <Compare />
        <Catalogue />
      </ComparisonProvider>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
