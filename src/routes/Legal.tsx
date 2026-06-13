import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { PublicNav } from '@/components/layout/PublicNav';

type Section = { heading: string; body: string[] };

function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: Section[] }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <PublicNav />
      <main className="mx-auto mt-[67px] max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-black tracking-tighter md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm font-semibold text-stone-400">{updated}</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-xl font-black tracking-tight">{section.heading}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="mb-3 text-[15px] leading-7 text-stone-600">{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        <div className="mt-14 border-t border-stone-200 pt-6 text-sm font-semibold text-stone-500">
          <Link to="/" className="text-teal-800 hover:underline">← Matjari</Link>
        </div>
      </main>
    </div>
  );
}

export function Privacy() {
  const { lang } = useI18n();
  const en: Section[] = [
    {
      heading: '1. Who we are',
      body: [
        'Matjari is a multi-store e-commerce platform that lets local businesses in Jordan open online storefronts. This policy explains what personal data we collect, why, and the rights you have under the Jordanian Personal Data Protection Law (PDPL, Law No. 24 of 2023).',
      ],
    },
    {
      heading: '2. Data we collect',
      body: [
        'Shoppers: when you place a Cash on Delivery order we collect your name, phone number, delivery address, and optionally your email — solely so the store can fulfil and deliver your order and issue an order confirmation.',
        'Store owners: when you request a store we collect your name, email, chosen username, and a securely hashed password. We also keep operational records (orders, products, audit logs) needed to run your store.',
        'We do not collect card details — payment is cash on delivery. We do not sell personal data to anyone.',
      ],
    },
    {
      heading: '3. How we use it',
      body: [
        'Order data is used to process, deliver, and account for purchases. Store owner data is used to operate the platform, bill subscriptions (paid by CliQ or bank transfer), and provide support.',
      ],
    },
    {
      heading: '4. Retention & security',
      body: [
        'Order records are retained for bookkeeping; analytics events are pruned automatically. Passwords are stored hashed (bcrypt). Access is role-restricted and security-relevant actions are kept in an append-only audit log.',
      ],
    },
    {
      heading: '5. Your rights (PDPL)',
      body: [
        'You may request a copy of the personal data we hold about you, ask for corrections, or request erasure. Store owners can export their full store data from Settings → Your data. Customer data can be anonymized on request while preserving financial records as required for accounting.',
        'To exercise any right, contact the platform support email shown on the store you bought from, or the platform operator.',
      ],
    },
    {
      heading: '6. Changes',
      body: ['We will update this page when our practices change. Material changes are announced on the platform.'],
    },
  ];
  const ar: Section[] = [
    {
      heading: '1. من نحن',
      body: [
        'متجري الأردن منصة تجارة إلكترونية متعددة المتاجر تتيح للأعمال المحلية في الأردن فتح متاجر إلكترونية. توضح هذه السياسة البيانات الشخصية التي نجمعها وسببها وحقوقك بموجب قانون حماية البيانات الشخصية الأردني (رقم 24 لسنة 2023).',
      ],
    },
    {
      heading: '2. البيانات التي نجمعها',
      body: [
        'المتسوقون: عند تقديم طلب بالدفع عند الاستلام نجمع اسمك ورقم هاتفك وعنوان التوصيل وبريدك الإلكتروني اختيارياً — فقط ليتمكن المتجر من تجهيز طلبك وتوصيله وإصدار تأكيد الطلب.',
        'أصحاب المتاجر: عند طلب متجر نجمع الاسم والبريد الإلكتروني واسم المستخدم وكلمة مرور مشفرة. كما نحتفظ بالسجلات التشغيلية (الطلبات والمنتجات وسجلات التدقيق) اللازمة لتشغيل متجرك.',
        'لا نجمع بيانات البطاقات — الدفع عند الاستلام. ولا نبيع البيانات الشخصية لأي جهة.',
      ],
    },
    {
      heading: '3. كيف نستخدمها',
      body: [
        'تُستخدم بيانات الطلبات لمعالجة المشتريات وتوصيلها وتسجيلها. وتُستخدم بيانات أصحاب المتاجر لتشغيل المنصة وفوترة الاشتراكات (عبر كليك أو حوالة بنكية) وتقديم الدعم.',
      ],
    },
    {
      heading: '4. الاحتفاظ والأمان',
      body: [
        'يُحتفظ بسجلات الطلبات للمحاسبة؛ وتُحذف أحداث التحليلات تلقائياً. كلمات المرور مخزنة مشفرة (bcrypt). الوصول مقيد حسب الدور وتُسجل الإجراءات الأمنية في سجل تدقيق غير قابل للتعديل.',
      ],
    },
    {
      heading: '5. حقوقك (قانون حماية البيانات)',
      body: [
        'يمكنك طلب نسخة من بياناتك الشخصية أو تصحيحها أو حذفها. يمكن لأصحاب المتاجر تصدير بيانات متجرهم كاملة من الإعدادات ← بياناتك. ويمكن إخفاء هوية بيانات العملاء عند الطلب مع الحفاظ على السجلات المالية المطلوبة محاسبياً.',
        'لممارسة أي حق، تواصل مع بريد الدعم الظاهر على المتجر الذي اشتريت منه أو مع مشغل المنصة.',
      ],
    },
    {
      heading: '6. التغييرات',
      body: ['سنحدّث هذه الصفحة عند تغيّر ممارساتنا، ويُعلن عن التغييرات الجوهرية على المنصة.'],
    },
  ];
  return (
    <LegalPage
      title={lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
      updated={lang === 'ar' ? 'آخر تحديث: حزيران 2026' : 'Last updated: June 2026'}
      sections={lang === 'ar' ? ar : en}
    />
  );
}

export function Terms() {
  const { lang } = useI18n();
  const en: Section[] = [
    {
      heading: '1. The service',
      body: [
        'Matjari provides hosted online storefronts for approved businesses. Stores are created after a request is reviewed and approved by the platform operator. Each store gets its own address and an admin dashboard for products, orders, discounts, and appearance.',
      ],
    },
    {
      heading: '2. Subscriptions & billing',
      body: [
        'Stores are billed monthly per the published pricing plans. Every new store starts with a free 14-day trial. Payments are made manually by CliQ or bank transfer and recorded by the platform operator; there is no automatic card charge.',
        'If a payment lapses, the store is marked past due. The storefront stays live during a reasonable grace period, after which the platform operator may suspend it until the balance is settled.',
      ],
    },
    {
      heading: '3. Store owner responsibilities',
      body: [
        'You are responsible for the accuracy and legality of what you sell, for fulfilling Cash on Delivery orders you approve, for honoring your published shipping and return policies, and for handling your customers’ data only for fulfilling their orders.',
        'Prohibited: illegal goods, counterfeit products, and misleading listings. The platform may unpublish products or suspend stores that violate these rules.',
      ],
    },
    {
      heading: '4. Orders & payments',
      body: [
        'Shopper payments are Cash on Delivery between the shopper and the store. Matjari computes order totals and generates order records, but is not a party to the sale and does not process card payments.',
      ],
    },
    {
      heading: '5. Termination',
      body: [
        'Store owners may stop using the service at any time and may export their data beforehand from Settings. The platform may suspend or remove stores for non-payment or policy violations, with data export honored on request.',
      ],
    },
    {
      heading: '6. Liability',
      body: [
        'The service is provided as-is. To the extent permitted by law, the platform operator is not liable for lost profits or indirect damages arising from use of the service.',
      ],
    },
  ];
  const ar: Section[] = [
    {
      heading: '1. الخدمة',
      body: [
        'توفر منصة متجري الأردن متاجر إلكترونية مستضافة للأعمال المعتمدة. تُنشأ المتاجر بعد مراجعة الطلب والموافقة عليه من مشغل المنصة. يحصل كل متجر على عنوانه الخاص ولوحة تحكم للمنتجات والطلبات والخصومات والمظهر.',
      ],
    },
    {
      heading: '2. الاشتراكات والفوترة',
      body: [
        'تُفوتر المتاجر شهرياً حسب خطط الأسعار المعلنة. يبدأ كل متجر جديد بتجربة مجانية لمدة 14 يوماً. تتم الدفعات يدوياً عبر كليك أو حوالة بنكية ويسجلها مشغل المنصة؛ لا يوجد خصم تلقائي من البطاقات.',
        'إذا تأخرت الدفعة يوضع المتجر في حالة متأخر. يبقى المتجر يعمل خلال فترة سماح معقولة، وبعدها يجوز لمشغل المنصة إيقافه حتى تسوية المستحقات.',
      ],
    },
    {
      heading: '3. مسؤوليات صاحب المتجر',
      body: [
        'أنت مسؤول عن دقة وقانونية ما تبيعه، وعن تنفيذ طلبات الدفع عند الاستلام التي توافق عليها، وعن الالتزام بسياسات الشحن والإرجاع المعلنة، وعن استخدام بيانات عملائك فقط لتنفيذ طلباتهم.',
        'يُحظر: السلع غير القانونية والمنتجات المقلدة والإعلانات المضللة. ويجوز للمنصة إخفاء منتجات أو إيقاف متاجر تخالف هذه القواعد.',
      ],
    },
    {
      heading: '4. الطلبات والدفع',
      body: [
        'مدفوعات المتسوقين تتم نقداً عند الاستلام بين المتسوق والمتجر. تحتسب متجري الإجماليات وضريبة المبيعات والفواتير الداخلية لكنها ليست طرفاً في البيع ولا تعالج مدفوعات البطاقات.',
      ],
    },
    {
      heading: '5. الإنهاء',
      body: [
        'يمكن لأصحاب المتاجر التوقف عن استخدام الخدمة في أي وقت وتصدير بياناتهم مسبقاً من الإعدادات. ويجوز للمنصة إيقاف أو إزالة المتاجر لعدم الدفع أو مخالفة السياسات، مع الالتزام بتصدير البيانات عند الطلب.',
      ],
    },
    {
      heading: '6. المسؤولية',
      body: [
        'تُقدم الخدمة كما هي. وفي الحدود التي يسمح بها القانون، لا يتحمل مشغل المنصة مسؤولية الأرباح الفائتة أو الأضرار غير المباشرة الناشئة عن استخدام الخدمة.',
      ],
    },
  ];
  return (
    <LegalPage
      title={lang === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
      updated={lang === 'ar' ? 'آخر تحديث: حزيران 2026' : 'Last updated: June 2026'}
      sections={lang === 'ar' ? ar : en}
    />
  );
}
