import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBookDetails } from '@/hooks/useBookDetails';
import { LANDING_VARIANTS, type LandingVariantKey, buildLandingMeta } from '@/utils/landingPages';

interface Props {
  variant: LandingVariantKey;
}

const BookLanding = ({ variant }: Props) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { book, loading } = useBookDetails(id || '');
  const config = LANDING_VARIANTS[variant];

  const meta = useMemo(
    () =>
      buildLandingMeta(variant, {
        title: book?.title || (id ? decodeURIComponent(id).replace(/-/g, ' ') : ''),
        author: book?.author || '',
        description: book?.description || '',
        category: book?.category || '',
        slug: book?.slug || id || '',
        pageCount: book?.page_count,
        language: book?.language,
        year: book?.publication_year,
      }),
    [variant, book, id]
  );

  const bookPath = `/book/${encodeURIComponent(book?.slug || id || '')}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        canonical={meta.canonical}
        ogImage={book?.cover_image_url || '/kotobi-icon-2026.png'}
        ogType="book"
        author={book?.author}
        structuredData={meta.structuredData}
        breadcrumbs={meta.breadcrumbs}
      />
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <nav aria-label="مسار التصفح" className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
          <span className="mx-1">/</span>
          <Link to={bookPath} className="hover:text-primary">{book?.title || 'الكتاب'}</Link>
          <span className="mx-1">/</span>
          <span>{config.label}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 font-tajawal">
          {meta.h1}
        </h1>

        {book?.author && (
          <p className="text-primary font-tajawal mb-4">تأليف: {book.author}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {book?.cover_image_url && (
            <img
              src={book.cover_image_url}
              alt={`غلاف ${config.label} ${book?.title || ''}`}
              className="w-40 rounded-xl shadow-md object-cover self-start"
              loading="lazy"
            />
          )}
          <div className="flex-1 space-y-3">
            <p className="text-foreground/90 leading-relaxed font-tajawal">{meta.intro}</p>
            {book?.description && (
              <p className="text-muted-foreground leading-relaxed font-tajawal line-clamp-6">
                {book.description}
              </p>
            )}
            <Button className="rounded-2xl" onClick={() => navigate(bookPath)}>
              {config.cta}
            </Button>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold font-tajawal">{config.sectionTitle}</h2>
          <Card>
            <CardContent className="p-4 space-y-2 text-sm font-tajawal">
              {book?.category && <p><strong>التصنيف:</strong> {book.category}</p>}
              {book?.page_count ? <p><strong>عدد الصفحات:</strong> {book.page_count}</p> : null}
              {book?.language && <p><strong>اللغة:</strong> {book.language}</p>}
              {book?.publication_year ? <p><strong>سنة النشر:</strong> {book.publication_year}</p> : null}
              {book?.publisher && <p><strong>الناشر:</strong> {book.publisher}</p>}
              <p><strong>السعر:</strong> مجاناً بالكامل على منصة كتبي</p>
            </CardContent>
          </Card>

          <h2 className="text-xl font-bold font-tajawal">أسئلة شائعة</h2>
          <div className="space-y-3">
            {meta.faq.map((item) => (
              <Card key={item.q}>
                <CardContent className="p-4">
                  <h3 className="font-bold font-tajawal mb-1">{item.q}</h3>
                  <p className="text-sm text-muted-foreground font-tajawal">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <h2 className="text-xl font-bold font-tajawal">صفحات ذات صلة</h2>
          <ul className="list-disc pr-5 space-y-1 text-sm font-tajawal">
            <li><Link className="text-primary hover:underline" to={bookPath}>صفحة الكتاب الكاملة</Link></li>
            {(Object.keys(LANDING_VARIANTS) as LandingVariantKey[])
              .filter((key) => key !== variant)
              .map((key) => (
                <li key={key}>
                  <Link
                    className="text-primary hover:underline"
                    to={`/${LANDING_VARIANTS[key].path}/${encodeURIComponent(book?.slug || id || '')}`}
                  >
                    {LANDING_VARIANTS[key].titlePattern.replace('{title}', book?.title || 'الكتاب')}
                  </Link>
                </li>
              ))}
            {book?.category && (
              <li>
                <Link className="text-primary hover:underline" to={`/category/${encodeURIComponent(book.category)}`}>
                  المزيد من كتب {book.category}
                </Link>
              </li>
            )}
          </ul>
        </section>

        {loading && <p className="mt-6 text-muted-foreground font-tajawal">جارٍ تحميل بيانات الكتاب…</p>}
      </main>

      <Footer />
    </div>
  );
};

export default BookLanding;
