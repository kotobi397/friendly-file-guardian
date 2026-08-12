// تعريف صفحات الهبوط المولّدة تلقائياً لكل كتاب (نوايا بحث شائعة في جوجل)
// يُستخدم في الواجهة (React) وفي دوال Cloudflare للسيتماب والـ prerender.

export const SITE_URL = 'https://kotobi.xyz';

export type LandingVariantKey = 'download' | 'read' | 'summary';

interface VariantConfig {
  path: string;
  label: string;
  cta: string;
  sectionTitle: string;
  titlePattern: string;
}

export const LANDING_VARIANTS: Record<LandingVariantKey, VariantConfig> = {
  download: {
    path: 'tahmil',
    label: 'تحميل PDF',
    cta: 'تحميل الكتاب مجاناً',
    sectionTitle: 'معلومات ملف الكتاب',
    titlePattern: 'تحميل كتاب {title} PDF',
  },
  read: {
    path: 'qiraa',
    label: 'قراءة أونلاين',
    cta: 'ابدأ القراءة أونلاين',
    sectionTitle: 'معلومات القراءة',
    titlePattern: 'قراءة كتاب {title} أونلاين',
  },
  summary: {
    path: 'molakhas',
    label: 'ملخص الكتاب',
    cta: 'اقرأ الكتاب كاملاً',
    sectionTitle: 'عن الكتاب',
    titlePattern: 'ملخص كتاب {title}',
  },
};

export interface LandingBook {
  title: string;
  author?: string;
  description?: string;
  category?: string;
  slug: string;
  pageCount?: number | null;
  language?: string | null;
  year?: number | null;
}

export const buildLandingMeta = (variant: LandingVariantKey, book: LandingBook) => {
  const config = LANDING_VARIANTS[variant];
  const title = book.title || 'الكتاب';
  const author = book.author || 'مؤلف غير معروف';
  const slug = encodeURIComponent(book.slug || '');
  const canonical = `${SITE_URL}/${config.path}/${slug}`;
  const bookUrl = `${SITE_URL}/book/${slug}`;
  const h1 = config.titlePattern.replace('{title}', title);

  const shortDesc = (book.description || '').replace(/\s+/g, ' ').trim().slice(0, 110);

  const byVariant: Record<LandingVariantKey, { description: string; intro: string; faq: { q: string; a: string }[] }> = {
    download: {
      description: `حمّل كتاب ${title} للمؤلف ${author} بصيغة PDF مجاناً وبجودة عالية من منصة كتبي، بدون تسجيل وبدون إعلانات مزعجة.`,
      intro: `يمكنك تحميل كتاب ${title} لـ${author} بصيغة PDF مجاناً من منصة كتبي. الملف متاح للتنزيل المباشر ويعمل على الجوال والحاسوب.${shortDesc ? ' ' + shortDesc + '…' : ''}`,
      faq: [
        { q: `هل تحميل كتاب ${title} مجاني؟`, a: 'نعم، التحميل مجاني بالكامل ولا يتطلب أي اشتراك مدفوع.' },
        { q: 'ما صيغة الملف؟', a: 'الملف متاح بصيغة PDF قابلة للقراءة على جميع الأجهزة.' },
        { q: 'هل أحتاج إلى إنشاء حساب؟', a: 'لا، يمكنك التحميل مباشرة من صفحة الكتاب.' },
      ],
    },
    read: {
      description: `اقرأ كتاب ${title} للمؤلف ${author} أونلاين مجاناً عبر قارئ منصة كتبي مباشرة من المتصفح دون تحميل.`,
      intro: `اقرأ كتاب ${title} لـ${author} أونلاين مباشرة من المتصفح عبر قارئ كتبي، مع حفظ تقدّم القراءة والوضع الليلي.${shortDesc ? ' ' + shortDesc + '…' : ''}`,
      faq: [
        { q: `هل يمكن قراءة ${title} بدون تحميل؟`, a: 'نعم، القارئ يعمل داخل المتصفح مباشرة على الجوال والحاسوب.' },
        { q: 'هل يتم حفظ موضع القراءة؟', a: 'نعم، يحفظ القارئ آخر صفحة وصلت إليها عند تسجيل الدخول.' },
        { q: 'هل القراءة مجانية؟', a: 'نعم، القراءة أونلاين مجانية تماماً على منصة كتبي.' },
      ],
    },
    summary: {
      description: `ملخص كتاب ${title} للمؤلف ${author}: نظرة سريعة على موضوع الكتاب ومحتواه وأهم أفكاره مع إمكانية القراءة والتحميل مجاناً.`,
      intro: `تعرّف على ملخص كتاب ${title} لـ${author} وأهم ما يتناوله${book.category ? ` ضمن تصنيف ${book.category}` : ''}.${shortDesc ? ' ' + shortDesc + '…' : ''}`,
      faq: [
        { q: `عمّا يتحدث كتاب ${title}؟`, a: (book.description || `كتاب ${title} من تأليف ${author}، متاح كاملاً للقراءة والتحميل على منصة كتبي.`).slice(0, 300) },
        { q: 'من هو مؤلف الكتاب؟', a: `مؤلف الكتاب هو ${author}.` },
        { q: 'أين أقرأ الكتاب كاملاً؟', a: 'يمكنك قراءته أونلاين أو تحميله بصيغة PDF مجاناً من صفحة الكتاب.' },
      ],
    },
  };

  const v = byVariant[variant];
  const seoTitle = `${h1} | كتبي`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Book',
        name: title,
        author: { '@type': 'Person', name: author },
        description: v.description,
        url: bookUrl,
        inLanguage: book.language || 'ar',
        ...(book.pageCount ? { numberOfPages: book.pageCount } : {}),
        ...(book.year ? { datePublished: String(book.year) } : {}),
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: v.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return {
    h1,
    title: seoTitle,
    description: v.description,
    intro: v.intro,
    faq: v.faq,
    canonical,
    bookUrl,
    keywords: `${h1}, ${title}, ${author}, تحميل كتب PDF مجانا, قراءة كتب اون لاين${book.category ? `, ${book.category}` : ''}`,
    structuredData,
    breadcrumbs: [
      { name: 'الرئيسية', url: SITE_URL },
      { name: title, url: bookUrl },
      { name: config.label, url: canonical },
    ],
  };
};
