/**
 * Product category taxonomy — the single source of truth for category-specific
 * product attributes, imported by BOTH the frontend (`@shared/productCategorySchemas`)
 * and the backend (`../shared/productCategorySchemas.js`).
 *
 * Each category "unlocks" its own relevant attributes (like Shopify category
 * metafields): the fields that help customers filter, compare, understand and buy.
 * The form renders these dynamically, the backend validates against them, and the
 * storefront renders the ones marked visible — all from this one definition, so the
 * two sides cannot drift.
 *
 * This module is intentionally framework-agnostic (no zod / no react) so it can be
 * imported anywhere. Validation here returns plain error objects; the backend turns
 * them into a 400 at the Zod boundary and the frontend shows them inline.
 *
 * Compatibility note: the category attributes live in `details.attributes` and the
 * chosen category in `details.categoryKey`. The existing options/variants/images
 * structures and the `SIMPLE`/`VARIABLE` selling type that the checkout depends on
 * are untouched — this is an additive layer.
 */

export type Bilingual = { en: string; ar: string };

/** Stored attribute value: scalar, list (multi-select), or null/absent. No floats-as-money here. */
export type ProductAttributeValue = string | number | boolean | string[] | null;

/** Richer selling type that drives the form. Persisted `details.sellingType` stays SIMPLE/VARIABLE. */
export type SellingType = 'simple' | 'variants' | 'made_to_order' | 'digital' | 'service';

export type ProductFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'color'
  | 'dimension'
  | 'weight'
  | 'date'
  | 'url';

export type ProductFieldOption = {
  value: string;
  label: Bilingual;
};

export type ProductDetailFieldSchema = {
  key: string;
  label: Bilingual;
  type: ProductFieldType;
  required?: boolean;
  /** Allowed values for select / multi_select / color. */
  options?: ProductFieldOption[];
  /** Display unit (e.g. "ml", "g", "mAh", "cm"). Stored value stays a plain number/string. */
  unit?: string;
  placeholder?: Bilingual;
  helpText?: Bilingual;
  /** Drives storefront listing filters. */
  filterable?: boolean;
  /** Eligible for the compare table. */
  comparable?: boolean;
  /** Show on the public product detail page. Defaults to true unless adminOnly. */
  visibleOnProductPage?: boolean;
  /** Show on storefront product cards. */
  visibleOnCard?: boolean;
  /** Never sent to the public storefront (margin / internal data). */
  adminOnly?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    maxLength?: number;
  };
};

export type ProductVariantOptionTemplate = {
  /** Stable key, e.g. "size" / "color". */
  key: string;
  label: Bilingual;
  /** Suggested values the owner can accept or edit. */
  suggestedValues?: string[];
};

export type ProductStorefrontSection = {
  key: string;
  label: Bilingual;
  /** Attribute keys grouped under this section on the product page. */
  fieldKeys: string[];
};

export type ProductCategorySchema = {
  key: string;
  label: Bilingual;
  description?: Bilingual;
  /** Industry group key — used to cluster the category picker. */
  group?: string;
  sellingTypes: SellingType[];
  fields: ProductDetailFieldSchema[];
  variantOptions?: ProductVariantOptionTemplate[];
  storefrontSections?: ProductStorefrontSection[];
};

// ---------------------------------------------------------------------------
// Industry groups — for clustering the category picker UI.
// ---------------------------------------------------------------------------

export const CATEGORY_GROUPS: { key: string; label: Bilingual }[] = [
  { key: 'fashion',       label: { en: 'Fashion & Apparel',       ar: 'الأزياء والملابس' } },
  { key: 'electronics',   label: { en: 'Electronics & Tech',       ar: 'الإلكترونيات والتقنية' } },
  { key: 'food',          label: { en: 'Food & Grocery',           ar: 'الطعام والبقالة' } },
  { key: 'health',        label: { en: 'Health & Beauty',          ar: 'الصحة والجمال' } },
  { key: 'home',          label: { en: 'Home & Living',            ar: 'المنزل والأثاث' } },
  { key: 'hobbies',       label: { en: 'Hobbies & Entertainment',  ar: 'الهوايات والترفيه' } },
  { key: 'automotive',    label: { en: 'Automotive',               ar: 'السيارات' } },
  { key: 'services',      label: { en: 'Services',                 ar: 'الخدمات' } },
  { key: 'digital',       label: { en: 'Digital Products',         ar: 'المنتجات الرقمية' } },
];

// ---------------------------------------------------------------------------
// Reusable option sets (kept here so categories that share them stay in sync).
// ---------------------------------------------------------------------------

const opt = (value: string, en: string, ar: string): ProductFieldOption => ({ value, label: { en, ar } });

const AUDIENCE_OPTIONS: ProductFieldOption[] = [
  opt('men',   'Men',   'رجال'),
  opt('women', 'Women', 'نساء'),
  opt('unisex','Unisex','للجنسين'),
  opt('kids',  'Kids',  'أطفال'),
  opt('baby',  'Baby',  'رضّع'),
];

const CONDITION_OPTIONS: ProductFieldOption[] = [
  opt('new',           'New',              'جديد'),
  opt('refurbished',   'Refurbished',      'مجدّد'),
  opt('used_like_new', 'Used — like new',  'مستعمل — كالجديد'),
  opt('used_good',     'Used — good',      'مستعمل — جيد'),
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const YES_NO: ProductFieldOption[] = [
  opt('yes', 'Yes', 'نعم'),
  opt('no',  'No',  'لا'),
];

// ---------------------------------------------------------------------------
// ── EXISTING CATEGORIES ────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

const clothing: ProductCategorySchema = {
  key: 'clothing',
  label: { en: 'Clothing & Fashion', ar: 'الملابس والأزياء' },
  description: { en: 'Apparel, garments and fashion accessories.', ar: 'الملابس والإكسسوارات.' },
  group: 'fashion',
  sellingTypes: ['simple', 'variants', 'made_to_order'],
  variantOptions: [
    { key: 'size',  label: { en: 'Size',  ar: 'المقاس' }, suggestedValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { key: 'color', label: { en: 'Color', ar: 'اللون' },  suggestedValues: ['Black', 'White', 'Red', 'Blue', 'Green'] },
  ],
  fields: [
    { key: 'gender',       label: { en: 'Gender / audience',   ar: 'الفئة' },            type: 'select',       options: AUDIENCE_OPTIONS, required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'sizeSystem',   label: { en: 'Size system',         ar: 'نظام المقاسات' },    type: 'select',       options: [opt('eu','EU','أوروبي'), opt('us','US','أمريكي'), opt('uk','UK','بريطاني'), opt('intl','International (S/M/L)','دولي (S/M/L)')], filterable: true },
    { key: 'availableSizes', label: { en: 'Available sizes',   ar: 'المقاسات المتوفرة' }, type: 'multi_select', options: ['XS','S','M','L','XL','XXL'].map((s) => opt(s, s, s)), filterable: true, helpText: { en: 'Used for filters; variants stay the source of truth for stock.', ar: 'تُستخدم للفلترة؛ تبقى المتغيّرات مرجع المخزون.' } },
    { key: 'color',        label: { en: 'Color',               ar: 'اللون' },             type: 'text',        filterable: true, comparable: true, visibleOnCard: true, placeholder: { en: 'Olive, Black, Cream…', ar: 'زيتي، أسود، كريمي…' } },
    { key: 'material',     label: { en: 'Material',            ar: 'الخامة' },            type: 'text',        filterable: true, comparable: true, placeholder: { en: '100% cotton', ar: 'قطن 100%' } },
    { key: 'fit',          label: { en: 'Fit',                 ar: 'القَصّة' },           type: 'select',      options: [opt('slim','Slim','ضيّق'), opt('regular','Regular','عادي'), opt('relaxed','Relaxed','مريح'), opt('oversized','Oversized','واسع')], filterable: true, comparable: true },
    { key: 'season',       label: { en: 'Season',              ar: 'الموسم' },            type: 'select',      options: [opt('all','All seasons','كل المواسم'), opt('summer','Summer','صيفي'), opt('winter','Winter','شتوي'), opt('spring','Spring','ربيعي'), opt('autumn','Autumn','خريفي')], filterable: true },
    { key: 'careInstructions', label: { en: 'Care instructions', ar: 'تعليمات العناية' }, type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'countryOfOrigin',  label: { en: 'Country of origin', ar: 'بلد المنشأ' },     type: 'text',        comparable: true },
  ],
  storefrontSections: [
    { key: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' }, fieldKeys: ['gender', 'material', 'fit', 'color', 'season'] },
    { key: 'care',     label: { en: 'Care',     ar: 'العناية' },   fieldKeys: ['careInstructions', 'countryOfOrigin'] },
  ],
};

const shoes: ProductCategorySchema = {
  key: 'shoes',
  label: { en: 'Shoes', ar: 'الأحذية' },
  description: { en: 'Footwear for all genders and occasions.', ar: 'الأحذية لجميع الفئات والمناسبات.' },
  group: 'fashion',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size',  label: { en: 'Size',  ar: 'المقاس' }, suggestedValues: ['38','39','40','41','42','43','44'] },
    { key: 'color', label: { en: 'Color', ar: 'اللون' },  suggestedValues: ['Black','White','Red','Blue','Green'] },
  ],
  fields: [
    { key: 'gender',          label: { en: 'Gender / audience',    ar: 'الفئة' },              type: 'select',       options: AUDIENCE_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'shoeSizeSystem',  label: { en: 'Shoe size system',     ar: 'نظام مقاس الحذاء' },  type: 'select',       options: [opt('eu','EU','أوروبي'), opt('us','US','أمريكي'), opt('uk','UK','بريطاني')], required: true, filterable: true },
    { key: 'availableSizes',  label: { en: 'Available sizes',      ar: 'المقاسات المتوفرة' },  type: 'multi_select', options: ['36','37','38','39','40','41','42','43','44','45'].map((s) => opt(s, s, s)), filterable: true },
    { key: 'color',           label: { en: 'Color',                ar: 'اللون' },              type: 'text',        filterable: true, visibleOnCard: true },
    { key: 'material',        label: { en: 'Material',             ar: 'الخامة' },             type: 'text',        filterable: true, comparable: true },
    { key: 'soleMaterial',    label: { en: 'Sole material',        ar: 'خامة النعل' },         type: 'text',        comparable: true },
    { key: 'closureType',     label: { en: 'Closure type',         ar: 'نوع الإغلاق' },        type: 'select',      options: [opt('laces','Laces','رباط'), opt('slip_on','Slip-on','بدون رباط'), opt('velcro','Velcro','لاصق'), opt('buckle','Buckle','إبزيم'), opt('zipper','Zipper','سحّاب')], filterable: true },
    { key: 'occasion',        label: { en: 'Occasion',             ar: 'المناسبة' },           type: 'select',      options: [opt('casual','Casual','كاجوال'), opt('formal','Formal','رسمي'), opt('sport','Sport','رياضي'), opt('outdoor','Outdoor','خارجي')], filterable: true },
  ],
};

const electronics: ProductCategorySchema = {
  key: 'electronics',
  label: { en: 'Electronics', ar: 'الإلكترونيات' },
  description: { en: 'General electronics, gadgets and accessories.', ar: 'الإلكترونيات والأجهزة والملحقات.' },
  group: 'electronics',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'storage', label: { en: 'Storage', ar: 'التخزين' }, suggestedValues: ['64GB','128GB','256GB','512GB','1TB'] },
    { key: 'color',   label: { en: 'Color',   ar: 'اللون' },   suggestedValues: ['Black','White','Red','Blue','Green'] },
    { key: 'ram',     label: { en: 'RAM',     ar: 'الذاكرة' }, suggestedValues: ['4GB','8GB','16GB','32GB'] },
  ],
  fields: [
    { key: 'brand',               label: { en: 'Brand',               ar: 'العلامة التجارية' }, type: 'text',        required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'model',               label: { en: 'Model',               ar: 'الموديل' },          type: 'text',        required: true, comparable: true },
    { key: 'condition',           label: { en: 'Condition',           ar: 'الحالة' },           type: 'select',      options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'warrantyPeriod',      label: { en: 'Warranty period',     ar: 'مدة الضمان' },       type: 'text',        comparable: true, placeholder: { en: '12 months', ar: '12 شهر' } },
    { key: 'powerSource',         label: { en: 'Power source',        ar: 'مصدر الطاقة' },      type: 'select',      options: [opt('battery','Battery','بطارية'), opt('plug','Mains / plug','كهرباء'), opt('usb','USB','يو إس بي'), opt('solar','Solar','طاقة شمسية')], filterable: true },
    { key: 'batteryCapacity',     label: { en: 'Battery capacity',    ar: 'سعة البطارية' },     type: 'number',      unit: 'mAh', comparable: true, validation: { min: 0, max: 1_000_000 } },
    { key: 'connectivity',        label: { en: 'Connectivity',        ar: 'الاتصال' },          type: 'multi_select', options: [opt('wifi','Wi-Fi','واي فاي'), opt('bluetooth','Bluetooth','بلوتوث'), opt('nfc','NFC','إن إف سي'), opt('usb_c','USB-C','يو إس بي سي'), opt('hdmi','HDMI','إتش دي إم آي'), opt('cellular','Cellular','خلوي')], filterable: true },
    { key: 'storage',             label: { en: 'Storage',             ar: 'سعة التخزين' },      type: 'text',        filterable: true, comparable: true },
    { key: 'ram',                 label: { en: 'RAM',                 ar: 'الذاكرة العشوائية' }, type: 'text',       filterable: true, comparable: true },
    { key: 'screenSize',          label: { en: 'Screen size',         ar: 'حجم الشاشة' },       type: 'number',      unit: 'in', comparable: true, validation: { min: 0, max: 200 } },
    { key: 'includedAccessories', label: { en: 'Included accessories', ar: 'الملحقات المرفقة' }, type: 'multi_select', options: [opt('charger','Charger','شاحن'), opt('cable','Cable','كابل'), opt('case','Case','حافظة'), opt('manual','Manual','دليل'), opt('earphones','Earphones','سماعات')] },
  ],
};

const mobilePhones: ProductCategorySchema = {
  key: 'mobile_phones',
  label: { en: 'Mobile Phones', ar: 'الهواتف المحمولة' },
  description: { en: 'Smartphones, feature phones, new and used.', ar: 'الهواتف الذكية والعادية، جديدة ومستعملة.' },
  group: 'electronics',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'storage', label: { en: 'Storage', ar: 'التخزين' }, suggestedValues: ['64GB','128GB','256GB','512GB','1TB'] },
    { key: 'color',   label: { en: 'Color',   ar: 'اللون' },   suggestedValues: ['Black','White','Red','Blue','Green'] },
    { key: 'ram',     label: { en: 'RAM',     ar: 'الذاكرة' }, suggestedValues: ['4GB','6GB','8GB','12GB','16GB'] },
  ],
  fields: [
    { key: 'brand',                label: { en: 'Brand',                ar: 'العلامة التجارية' }, type: 'text',    required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'model',                label: { en: 'Model',                ar: 'الموديل' },          type: 'text',    required: true, comparable: true },
    { key: 'storage',              label: { en: 'Storage',              ar: 'سعة التخزين' },      type: 'select',  options: ['64GB','128GB','256GB','512GB','1TB'].map((s) => opt(s, s, s)), required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'ram',                  label: { en: 'RAM',                  ar: 'الذاكرة العشوائية' }, type: 'select', options: ['4GB','6GB','8GB','12GB','16GB'].map((s) => opt(s, s, s)), filterable: true, comparable: true },
    { key: 'color',                label: { en: 'Color',                ar: 'اللون' },            type: 'text',    required: true, filterable: true, visibleOnCard: true },
    { key: 'batteryHealth',        label: { en: 'Battery health',       ar: 'صحة البطارية' },     type: 'number',  unit: '%', comparable: true, validation: { min: 0, max: 100 }, helpText: { en: 'Mostly for used phones.', ar: 'غالبًا للهواتف المستعملة.' } },
    { key: 'networkCompatibility', label: { en: 'Network compatibility', ar: 'توافق الشبكة' },   type: 'select',  options: [opt('5g','5G','5G'), opt('4g','4G / LTE','4G / LTE'), opt('3g','3G','3G')], filterable: true },
    { key: 'simType',              label: { en: 'SIM type',             ar: 'نوع الشريحة' },      type: 'select',  options: [opt('nano','Nano SIM','نانو'), opt('dual','Dual SIM','شريحتان'), opt('esim','eSIM','eSIM')], filterable: true },
    { key: 'condition',            label: { en: 'Condition',            ar: 'الحالة' },           type: 'select',  options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'warrantyPeriod',       label: { en: 'Warranty period',      ar: 'مدة الضمان' },       type: 'text',    comparable: true, placeholder: { en: '12 months', ar: '12 شهر' } },
  ],
};

const beauty: ProductCategorySchema = {
  key: 'beauty',
  label: { en: 'Beauty & Personal Care', ar: 'الجمال والعناية الشخصية' },
  description: { en: 'Skincare, haircare, makeup and personal-care products.', ar: 'العناية بالبشرة والشعر والمكياج.' },
  group: 'health',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size',  label: { en: 'Size',  ar: 'الحجم' },    suggestedValues: ['30ml','50ml','100ml','200ml'] },
    { key: 'scent', label: { en: 'Scent', ar: 'الرائحة' } },
  ],
  fields: [
    { key: 'skinType',          label: { en: 'Skin type',          ar: 'نوع البشرة' },          type: 'multi_select', options: [opt('all','All','كل الأنواع'), opt('dry','Dry','جافة'), opt('oily','Oily','دهنية'), opt('combination','Combination','مختلطة'), opt('sensitive','Sensitive','حساسة')], filterable: true },
    { key: 'hairType',          label: { en: 'Hair type',          ar: 'نوع الشعر' },           type: 'multi_select', options: [opt('all','All','كل الأنواع'), opt('dry','Dry','جاف'), opt('oily','Oily','دهني'), opt('curly','Curly','مجعّد'), opt('straight','Straight','ناعم')], filterable: true },
    { key: 'volume',            label: { en: 'Volume / size',      ar: 'الحجم' },               type: 'number',      unit: 'ml', comparable: true, validation: { min: 0, max: 100000 } },
    { key: 'ingredients',       label: { en: 'Ingredients',        ar: 'المكوّنات' },           type: 'textarea',    validation: { maxLength: 2000 } },
    { key: 'usageInstructions', label: { en: 'Usage instructions', ar: 'طريقة الاستخدام' },    type: 'textarea',    validation: { maxLength: 1200 } },
    { key: 'expiryDate',        label: { en: 'Expiry date',        ar: 'تاريخ الانتهاء' },      type: 'date' },
    { key: 'warnings',          label: { en: 'Warnings',           ar: 'تحذيرات' },             type: 'textarea',    validation: { maxLength: 1200 } },
    { key: 'crueltyFree',       label: { en: 'Cruelty-free',       ar: 'خالٍ من القسوة' },      type: 'boolean',     filterable: true, visibleOnCard: true },
  ],
};

const food: ProductCategorySchema = {
  key: 'food',
  label: { en: 'Food & Grocery', ar: 'الطعام والبقالة' },
  description: { en: 'Packaged food, beverages and grocery items.', ar: 'الأطعمة المعبّأة والمشروبات والبقالة.' },
  group: 'food',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size', label: { en: 'Size / pack', ar: 'الحجم / العبوة' }, suggestedValues: ['250g','500g','1kg'] },
  ],
  fields: [
    { key: 'weightVolume',       label: { en: 'Weight / volume',       ar: 'الوزن / الحجم' },        type: 'text',     comparable: true, visibleOnCard: true, placeholder: { en: '500 g, 1 L…', ar: '500 غ، 1 لتر…' } },
    { key: 'ingredients',        label: { en: 'Ingredients',           ar: 'المكوّنات' },            type: 'textarea', validation: { maxLength: 2000 } },
    { key: 'allergens',          label: { en: 'Allergens',             ar: 'مسببات الحساسية' },      type: 'multi_select', options: [opt('gluten','Gluten','غلوتين'), opt('dairy','Dairy','ألبان'), opt('nuts','Nuts','مكسّرات'), opt('eggs','Eggs','بيض'), opt('soy','Soy','صويا'), opt('sesame','Sesame','سمسم')], filterable: true },
    { key: 'nutritionFacts',     label: { en: 'Nutrition facts',       ar: 'القيمة الغذائية' },      type: 'textarea', validation: { maxLength: 2000 } },
    { key: 'expiryDate',         label: { en: 'Expiry / best before',  ar: 'تاريخ الانتهاء' },       type: 'date' },
    { key: 'storageInstructions',label: { en: 'Storage instructions',  ar: 'تعليمات التخزين' },      type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'countryOfOrigin',    label: { en: 'Country of origin',     ar: 'بلد المنشأ' },           type: 'text',     comparable: true },
    { key: 'halal',              label: { en: 'Halal',                 ar: 'حلال' },                 type: 'boolean',  filterable: true, visibleOnCard: true },
  ],
};

const home: ProductCategorySchema = {
  key: 'home',
  label: { en: 'Home & Furniture', ar: 'المنزل والأثاث' },
  description: { en: 'Furniture, décor and household goods.', ar: 'الأثاث والديكور والمستلزمات المنزلية.' },
  group: 'home',
  sellingTypes: ['simple', 'variants', 'made_to_order'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black','White','Red','Blue','Green'] },
    { key: 'size',  label: { en: 'Size',  ar: 'الحجم' } },
  ],
  fields: [
    { key: 'material',         label: { en: 'Material',           ar: 'الخامة' },             type: 'text',    filterable: true, comparable: true, visibleOnCard: true },
    { key: 'color',            label: { en: 'Color',              ar: 'اللون' },              type: 'text',    filterable: true, visibleOnCard: true },
    { key: 'dimensions',       label: { en: 'Dimensions',         ar: 'الأبعاد' },            type: 'dimension', comparable: true, placeholder: { en: '30 × 20 × 8 cm', ar: '30 × 20 × 8 سم' } },
    { key: 'roomType',         label: { en: 'Room type',          ar: 'الغرفة' },             type: 'select',  options: [opt('living','Living room','غرفة المعيشة'), opt('bedroom','Bedroom','غرفة النوم'), opt('kitchen','Kitchen','المطبخ'), opt('bathroom','Bathroom','الحمام'), opt('office','Office','المكتب'), opt('outdoor','Outdoor','خارجي')], filterable: true },
    { key: 'assemblyRequired', label: { en: 'Assembly required',  ar: 'يتطلب التركيب' },     type: 'boolean', filterable: true },
    { key: 'careInstructions', label: { en: 'Care instructions',  ar: 'تعليمات العناية' },   type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'weight',           label: { en: 'Weight',             ar: 'الوزن' },              type: 'weight',  unit: 'kg', comparable: true, validation: { min: 0, max: 100000 } },
    { key: 'supplierName',     label: { en: 'Supplier (internal)', ar: 'المورّد (داخلي)' },  type: 'text',    adminOnly: true, helpText: { en: 'Private sourcing note — never shown to customers.', ar: 'ملاحظة داخلية — لا تظهر للعملاء أبدًا.' } },
  ],
};

const handmade: ProductCategorySchema = {
  key: 'handmade',
  label: { en: 'Handmade / Crafts', ar: 'صناعة يدوية / حرف' },
  description: { en: 'Hand-crafted items, artisan goods and custom orders.', ar: 'المنتجات اليدوية والحِرَف والطلبات المخصصة.' },
  group: 'hobbies',
  sellingTypes: ['simple', 'made_to_order', 'variants'],
  variantOptions: [
    { key: 'color',         label: { en: 'Color',         ar: 'اللون' },        suggestedValues: ['Black','White','Red','Blue','Green'] },
    { key: 'size',          label: { en: 'Size',          ar: 'الحجم' } },
    { key: 'customization', label: { en: 'Customization', ar: 'التخصيص' } },
  ],
  fields: [
    { key: 'material',                label: { en: 'Material',                  ar: 'الخامة' },               type: 'text',    filterable: true, comparable: true, visibleOnCard: true },
    { key: 'handmade',                label: { en: 'Handmade',                  ar: 'صناعة يدوية' },          type: 'boolean', filterable: true, visibleOnCard: true },
    { key: 'productionTime',          label: { en: 'Production time',           ar: 'مدة التحضير' },          type: 'text',    comparable: true, placeholder: { en: '3–5 business days', ar: '3–5 أيام عمل' } },
    { key: 'customizable',            label: { en: 'Customizable',              ar: 'قابل للتخصيص' },         type: 'boolean', filterable: true },
    { key: 'customizationInstructions', label: { en: 'Customization instructions', ar: 'تعليمات التخصيص' }, type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'dimensions',              label: { en: 'Dimensions',                ar: 'الأبعاد' },              type: 'dimension', comparable: true },
  ],
};

const books: ProductCategorySchema = {
  key: 'books',
  label: { en: 'Books & Stationery', ar: 'الكتب والقرطاسية' },
  description: { en: 'Books, stationery, educational materials and eBooks.', ar: 'الكتب والقرطاسية والمواد التعليمية والكتب الإلكترونية.' },
  group: 'hobbies',
  sellingTypes: ['simple', 'variants', 'digital'],
  variantOptions: [
    { key: 'format', label: { en: 'Format', ar: 'الصيغة' }, suggestedValues: ['Paperback','Hardcover','eBook'] },
  ],
  fields: [
    { key: 'author',        label: { en: 'Author',          ar: 'المؤلف' },       type: 'text',   filterable: true, comparable: true, visibleOnCard: true },
    { key: 'publisher',     label: { en: 'Publisher',       ar: 'الناشر' },       type: 'text',   filterable: true, comparable: true },
    { key: 'language',      label: { en: 'Language',        ar: 'اللغة' },        type: 'select', options: [opt('ar','Arabic','العربية'), opt('en','English','الإنجليزية'), opt('fr','French','الفرنسية'), opt('other','Other','أخرى')], required: true, filterable: true },
    { key: 'format',        label: { en: 'Format',          ar: 'الصيغة' },       type: 'select', options: [opt('paperback','Paperback','غلاف ورقي'), opt('hardcover','Hardcover','غلاف مقوّى'), opt('ebook','eBook','كتاب إلكتروني')], filterable: true, comparable: true },
    { key: 'numberOfPages', label: { en: 'Number of pages', ar: 'عدد الصفحات' }, type: 'number', comparable: true, validation: { min: 0, max: 100000 } },
    { key: 'isbn',          label: { en: 'ISBN',            ar: 'الرقم الدولي ISBN' }, type: 'text', comparable: true, validation: { maxLength: 20 } },
    { key: 'edition',       label: { en: 'Edition',         ar: 'الإصدار' },      type: 'text',   comparable: true },
  ],
};

const services: ProductCategorySchema = {
  key: 'services',
  label: { en: 'Services', ar: 'الخدمات' },
  description: { en: 'Bookable services, consultations and professional work.', ar: 'الخدمات القابلة للحجز والاستشارات والعمل المهني.' },
  group: 'services',
  sellingTypes: ['service'],
  fields: [
    { key: 'serviceDuration',         label: { en: 'Service duration',        ar: 'مدة الخدمة' },          type: 'text',    comparable: true, visibleOnCard: true, placeholder: { en: '60 minutes', ar: '60 دقيقة' } },
    { key: 'serviceLocationType',     label: { en: 'Service location',        ar: 'مكان الخدمة' },         type: 'select',  options: [opt('onsite','On-site','في الموقع'), opt('remote','Remote','عن بُعد'), opt('in_store','In store','في المتجر')], required: true, filterable: true },
    { key: 'bookingRequired',         label: { en: 'Booking required',        ar: 'يتطلب حجزًا' },         type: 'boolean', filterable: true },
    { key: 'includedItems',           label: { en: 'Included items',          ar: 'يشمل' },                type: 'textarea', validation: { maxLength: 1600 } },
    { key: 'excludedItems',           label: { en: 'Excluded items',          ar: 'لا يشمل' },             type: 'textarea', validation: { maxLength: 1600 } },
    { key: 'preparationInstructions', label: { en: 'Preparation instructions', ar: 'تعليمات التحضير' },    type: 'textarea', validation: { maxLength: 1200 } },
  ],
};

// ---------------------------------------------------------------------------
// ── NEW CATEGORIES ─────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

const jewelry: ProductCategorySchema = {
  key: 'jewelry',
  label: { en: 'Jewelry & Watches', ar: 'المجوهرات والساعات' },
  description: { en: 'Gold, silver, gemstone jewelry and timepieces.', ar: 'مجوهرات الذهب والفضة والأحجار الكريمة والساعات.' },
  group: 'fashion',
  sellingTypes: ['simple', 'variants', 'made_to_order'],
  variantOptions: [
    { key: 'size',  label: { en: 'Ring / bangle size', ar: 'مقاس الخاتم / السوار' }, suggestedValues: ['5','6','7','8','9','10'] },
    { key: 'color', label: { en: 'Color / metal',      ar: 'اللون / المعدن' },        suggestedValues: ['Yellow Gold','White Gold','Rose Gold','Silver','Platinum'] },
  ],
  fields: [
    { key: 'metal',        label: { en: 'Metal type',       ar: 'نوع المعدن' },         type: 'select',      options: [opt('gold','Gold','ذهب'), opt('silver','Silver','فضة'), opt('platinum','Platinum','بلاتين'), opt('steel','Stainless steel','ستيل'), opt('other','Other','أخرى')], required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'karat',        label: { en: 'Karat / purity',   ar: 'العيار / النقاء' },    type: 'select',      options: [opt('10k','10K','10 قيراط'), opt('14k','14K','14 قيراط'), opt('18k','18K','18 قيراط'), opt('21k','21K','21 قيراط'), opt('22k','22K','22 قيراط'), opt('24k','24K','24 قيراط'), opt('925','925 Silver','فضة 925'), opt('pt950','PT 950','بلاتين 950')], filterable: true, comparable: true, visibleOnCard: true },
    { key: 'gemstone',     label: { en: 'Gemstone',         ar: 'الحجر الكريم' },       type: 'text',        filterable: true, comparable: true, placeholder: { en: 'Diamond, Ruby, Emerald…', ar: 'ألماس، ياقوت، زمرد…' } },
    { key: 'jewelryType',  label: { en: 'Jewelry type',     ar: 'نوع المجوهر' },        type: 'select',      options: [opt('ring','Ring','خاتم'), opt('necklace','Necklace','عقد'), opt('bracelet','Bracelet','سوار'), opt('earrings','Earrings','أقراط'), opt('pendant','Pendant','قلادة'), opt('watch','Watch','ساعة'), opt('bangle','Bangle','إسوارة'), opt('set','Set','طقم')], required: true, filterable: true, visibleOnCard: true },
    { key: 'claspType',    label: { en: 'Clasp / closure',  ar: 'قفل / إغلاق' },        type: 'select',      options: [opt('lobster','Lobster claw','مخلب جراد البحر'), opt('toggle','Toggle','تبديل'), opt('box','Box clasp','إبزيم صندوق'), opt('magnetic','Magnetic','مغناطيسي'), opt('none','None / open','بدون')], filterable: true },
    { key: 'weight_grams', label: { en: 'Weight (g)',        ar: 'الوزن (غ)' },          type: 'number',      unit: 'g', comparable: true, validation: { min: 0, max: 10000 } },
    { key: 'origin',       label: { en: 'Country of origin', ar: 'بلد الصنع' },          type: 'text',        comparable: true },
    { key: 'certified',    label: { en: 'Certified',         ar: 'معتمد' },              type: 'boolean',     filterable: true, helpText: { en: 'GIA, HRD, IGI or local assay certificate.', ar: 'شهادة GIA أو محلية.' } },
  ],
};

const perfumes: ProductCategorySchema = {
  key: 'perfumes',
  label: { en: 'Perfumes & Oud', ar: 'العطور والعود' },
  description: { en: 'Fragrances, oud, attars and scented products.', ar: 'العطور والعود والأتار والمنتجات المعطرة.' },
  group: 'health',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size',  label: { en: 'Bottle size', ar: 'حجم الزجاجة' }, suggestedValues: ['30ml','50ml','75ml','100ml','150ml','200ml'] },
    { key: 'scent', label: { en: 'Scent name',  ar: 'اسم العطر' } },
  ],
  fields: [
    { key: 'fragranceFamily',  label: { en: 'Fragrance family',  ar: 'عائلة العطر' },      type: 'select',       options: [opt('floral','Floral','زهري'), opt('woody','Woody','خشبي'), opt('oriental','Oriental / Oud','شرقي / عود'), opt('fresh','Fresh','منعش'), opt('citrus','Citrus','حمضي'), opt('gourmand','Gourmand','حلواني'), opt('aquatic','Aquatic','مائي'), opt('fougere','Fougère','فوجيري')], required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'concentration',    label: { en: 'Concentration',     ar: 'التركيز' },           type: 'select',       options: [opt('parfum','Parfum (Extrait)','عطر مركّز'), opt('edp','Eau de Parfum','إيدو بارفان'), opt('edt','Eau de Toilette','إيدو تواليت'), opt('edc','Eau de Cologne','إيدو كولون'), opt('attar','Attar / Oil','أتار / زيت'), opt('oud_oil','Oud oil','زيت عود')], required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'topNotes',         label: { en: 'Top notes',         ar: 'الرائحة الأولى' },   type: 'text',         filterable: true, placeholder: { en: 'Bergamot, Lemon…', ar: 'برغموت، ليمون…' } },
    { key: 'middleNotes',      label: { en: 'Middle (heart) notes', ar: 'الرائحة الوسطى' }, type: 'text',        filterable: true, placeholder: { en: 'Rose, Oud…', ar: 'ورد، عود…' } },
    { key: 'baseNotes',        label: { en: 'Base notes',         ar: 'الرائحة الأساسية' }, type: 'text',        filterable: true, placeholder: { en: 'Musk, Amber…', ar: 'مسك، عنبر…' } },
    { key: 'longevity',        label: { en: 'Longevity',          ar: 'الثبات' },            type: 'select',       options: [opt('1-2h','1–2 hrs','1–2 ساعة'), opt('3-5h','3–5 hrs','3–5 ساعات'), opt('6-8h','6–8 hrs','6–8 ساعات'), opt('8h+','8+ hrs','أكثر من 8 ساعات')], filterable: true, visibleOnCard: true },
    { key: 'sillage',          label: { en: 'Sillage (projection)', ar: 'الإسقاط' },        type: 'select',       options: [opt('soft','Soft','ناعم'), opt('moderate','Moderate','متوسط'), opt('strong','Strong','قوي'), opt('beast','Beast mode','قوي جداً')], filterable: true },
    { key: 'gender',           label: { en: 'Gender',             ar: 'الفئة' },             type: 'select',       options: [opt('men','Men','رجالي'), opt('women','Women','نسائي'), opt('unisex','Unisex','للجنسين')], filterable: true, visibleOnCard: true },
    { key: 'volume',           label: { en: 'Volume (ml)',         ar: 'الحجم (مل)' },        type: 'number',       unit: 'ml', comparable: true, validation: { min: 1, max: 10000 } },
  ],
};

const modestFashion: ProductCategorySchema = {
  key: 'modest_fashion',
  label: { en: 'Modest Fashion / Abayas', ar: 'الأزياء المحتشمة / العباءات' },
  description: { en: 'Abayas, hijabs, modest wear and Islamic fashion.', ar: 'العباءات والحجاب والملابس المحتشمة.' },
  group: 'fashion',
  sellingTypes: ['simple', 'variants', 'made_to_order'],
  variantOptions: [
    { key: 'size',  label: { en: 'Size',  ar: 'المقاس' }, suggestedValues: ['XS','S','M','L','XL','XXL','XXXL','Free size'] },
    { key: 'color', label: { en: 'Color', ar: 'اللون' },  suggestedValues: ['Black','Navy','Grey','Beige','Olive','White'] },
  ],
  fields: [
    { key: 'garmentType',    label: { en: 'Garment type',        ar: 'نوع اللباس' },        type: 'select',       options: [opt('abaya','Abaya','عباءة'), opt('hijab','Hijab','حجاب'), opt('niqab','Niqab','نقاب'), opt('jilbab','Jilbab','جلباب'), opt('kaftan','Kaftan','قفطان'), opt('modest_dress','Modest dress','فستان محتشم'), opt('set','Set / coordinate','طقم')], required: true, filterable: true, visibleOnCard: true },
    { key: 'fabric',         label: { en: 'Fabric',              ar: 'القماش' },             type: 'text',         filterable: true, comparable: true, placeholder: { en: 'Nida, Crepe, Chiffon…', ar: 'نيدا، كريب، شيفون…' } },
    { key: 'openStyle',      label: { en: 'Open / closed front', ar: 'مفتوح / مغلق' },       type: 'select',       options: [opt('open','Open abaya','مفتوحة'), opt('closed','Closed abaya','مغلقة'), opt('na','N/A','لا ينطبق')], filterable: true },
    { key: 'embroidery',     label: { en: 'Embroidery / print',  ar: 'تطريز / طباعة' },      type: 'select',       options: [opt('plain','Plain','سادة'), opt('embroidered','Embroidered','مطرّز'), opt('printed','Printed','مطبوع'), opt('stones','Stones / crystals','حجارة / كريستال')], filterable: true, visibleOnCard: true },
    { key: 'occasion',       label: { en: 'Occasion',            ar: 'المناسبة' },            type: 'select',       options: [opt('everyday','Everyday','يومي'), opt('formal','Formal','رسمي'), opt('wedding','Wedding','أعراس'), opt('prayer','Prayer','صلاة')], filterable: true },
    { key: 'sleeveLength',   label: { en: 'Sleeve length',       ar: 'طول الكُمّ' },          type: 'select',       options: [opt('full','Full length','طول كامل'), opt('three_quarter','¾ sleeve','ثلاثة أرباع'), opt('short','Short','قصير')], filterable: true },
    { key: 'careInstructions', label: { en: 'Care instructions', ar: 'تعليمات العناية' },    type: 'textarea',     validation: { maxLength: 1200 } },
    { key: 'countryOfOrigin', label: { en: 'Country of origin',  ar: 'بلد المنشأ' },          type: 'text',         comparable: true },
  ],
};

const kidsClothing: ProductCategorySchema = {
  key: 'kids_clothing',
  label: { en: 'Kids Clothing', ar: 'ملابس الأطفال' },
  description: { en: 'Clothing and accessories for babies, toddlers and children.', ar: 'ملابس وإكسسوارات للرضّع والأطفال.' },
  group: 'fashion',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size',  label: { en: 'Size / age',  ar: 'المقاس / العمر' }, suggestedValues: ['0-3m','3-6m','6-12m','1-2y','2-3y','3-4y','4-5y','5-6y','6-7y','8y','10y','12y'] },
    { key: 'color', label: { en: 'Color',       ar: 'اللون' },           suggestedValues: ['White','Pink','Blue','Red','Yellow','Green'] },
  ],
  fields: [
    { key: 'ageRange',         label: { en: 'Age range',          ar: 'الفئة العمرية' },     type: 'select',      options: [opt('0-12m','0–12 months','0–12 شهر'), opt('1-3y','1–3 years','1–3 سنوات'), opt('3-6y','3–6 years','3–6 سنوات'), opt('6-9y','6–9 years','6–9 سنوات'), opt('9-12y','9–12 years','9–12 سنة'), opt('teen','Teen','مراهقون')], required: true, filterable: true, visibleOnCard: true },
    { key: 'gender',           label: { en: 'Gender',             ar: 'الفئة' },             type: 'select',      options: [opt('boys','Boys','أولاد'), opt('girls','Girls','بنات'), opt('unisex','Unisex','للجنسين')], required: true, filterable: true, visibleOnCard: true },
    { key: 'material',         label: { en: 'Material',           ar: 'الخامة' },            type: 'text',        filterable: true, comparable: true, placeholder: { en: '100% cotton', ar: 'قطن 100%' } },
    { key: 'machineWashable',  label: { en: 'Machine-washable',   ar: 'يُغسل بالغسالة' },    type: 'boolean',     filterable: true, visibleOnCard: true },
    { key: 'season',           label: { en: 'Season',             ar: 'الموسم' },            type: 'select',      options: [opt('all','All seasons','كل المواسم'), opt('summer','Summer','صيفي'), opt('winter','Winter','شتوي')], filterable: true },
    { key: 'careInstructions', label: { en: 'Care instructions',  ar: 'تعليمات العناية' },   type: 'textarea',    validation: { maxLength: 1200 } },
  ],
};

const bagsLuggage: ProductCategorySchema = {
  key: 'bags_luggage',
  label: { en: 'Bags & Luggage', ar: 'الحقائب والأمتعة' },
  description: { en: 'Handbags, backpacks, travel luggage and wallets.', ar: 'الحقائب اليدوية والظهر وأمتعة السفر والمحافظ.' },
  group: 'fashion',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black','Brown','Beige','Navy','Red'] },
  ],
  fields: [
    { key: 'bagType',        label: { en: 'Bag type',         ar: 'نوع الحقيبة' },       type: 'select',  options: [opt('handbag','Handbag','حقيبة يد'), opt('backpack','Backpack','حقيبة ظهر'), opt('tote','Tote','توت'), opt('clutch','Clutch','كلتش'), opt('crossbody','Crossbody','كروس بودي'), opt('suitcase','Suitcase','حقيبة سفر'), opt('duffel','Duffel bag','دافل'), opt('wallet','Wallet','محفظة')], required: true, filterable: true, visibleOnCard: true },
    { key: 'material',       label: { en: 'Material',         ar: 'الخامة' },            type: 'text',    filterable: true, comparable: true, placeholder: { en: 'Genuine leather, Canvas…', ar: 'جلد طبيعي، قماش…' } },
    { key: 'color',          label: { en: 'Color',            ar: 'اللون' },             type: 'text',    filterable: true, visibleOnCard: true },
    { key: 'closure',        label: { en: 'Closure type',     ar: 'نوع الإغلاق' },       type: 'select',  options: [opt('zipper','Zipper','سحّاب'), opt('snap','Snap / magnetic','مغناطيسي'), opt('buckle','Buckle','إبزيم'), opt('open','Open top','مفتوح')], filterable: true },
    { key: 'dimensions',     label: { en: 'Dimensions',       ar: 'الأبعاد' },           type: 'dimension', comparable: true, placeholder: { en: '30 × 20 × 8 cm', ar: '30 × 20 × 8 سم' } },
    { key: 'gender',         label: { en: 'Gender',           ar: 'الفئة' },             type: 'select',  options: AUDIENCE_OPTIONS, filterable: true, visibleOnCard: true },
    { key: 'waterResistant', label: { en: 'Water-resistant',  ar: 'مقاوم للماء' },       type: 'boolean', filterable: true },
    { key: 'brand',          label: { en: 'Brand',            ar: 'العلامة التجارية' },  type: 'text',    filterable: true, comparable: true, visibleOnCard: true },
  ],
};

const sportsFitness: ProductCategorySchema = {
  key: 'sports_fitness',
  label: { en: 'Sports & Fitness', ar: 'الرياضة واللياقة' },
  description: { en: 'Sportswear, gym equipment and outdoor gear.', ar: 'الملابس الرياضية والمعدات الرياضية.' },
  group: 'hobbies',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size',  label: { en: 'Size',  ar: 'المقاس' }, suggestedValues: ['XS','S','M','L','XL','XXL'] },
    { key: 'color', label: { en: 'Color', ar: 'اللون' },  suggestedValues: ['Black','White','Blue','Red','Green'] },
  ],
  fields: [
    { key: 'sportType',      label: { en: 'Sport / activity', ar: 'الرياضة / النشاط' },   type: 'select',  options: [opt('gym','Gym','صالة رياضية'), opt('running','Running','الجري'), opt('football','Football','كرة القدم'), opt('basketball','Basketball','كرة السلة'), opt('swimming','Swimming','السباحة'), opt('cycling','Cycling','ركوب الدراجة'), opt('yoga','Yoga','اليوغا'), opt('boxing','Boxing','الملاكمة'), opt('tennis','Tennis','التنس'), opt('hiking','Hiking','المشي الجبلي'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'gender',         label: { en: 'Gender',           ar: 'الفئة' },              type: 'select',  options: AUDIENCE_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'material',       label: { en: 'Material',         ar: 'الخامة' },             type: 'text',    filterable: true, comparable: true, placeholder: { en: 'Polyester, Spandex…', ar: 'بوليستر، سبانديكس…' } },
    { key: 'sweatWicking',   label: { en: 'Sweat-wicking',    ar: 'ماص للعرق' },          type: 'boolean', filterable: true, visibleOnCard: true },
    { key: 'surface',        label: { en: 'Surface / terrain', ar: 'السطح / التضاريس' }, type: 'select',  options: [opt('indoor','Indoor','داخلي'), opt('outdoor','Outdoor','خارجي'), opt('both','Both','كلاهما')], filterable: true },
    { key: 'brand',          label: { en: 'Brand',            ar: 'العلامة التجارية' },   type: 'text',    filterable: true, comparable: true, visibleOnCard: true },
  ],
};

const toysBaby: ProductCategorySchema = {
  key: 'toys_baby',
  label: { en: 'Toys & Baby Products', ar: 'الألعاب ومنتجات الأطفال' },
  description: { en: 'Toys, baby gear, car seats, strollers and nursery items.', ar: 'الألعاب والعربات ومستلزمات الأطفال.' },
  group: 'hobbies',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Red','Blue','Yellow','Green','Pink'] },
  ],
  fields: [
    { key: 'ageRange',       label: { en: 'Recommended age',    ar: 'العمر الموصى به' },   type: 'select',      options: [opt('0-6m','0–6 months','0–6 أشهر'), opt('6-12m','6–12 months','6–12 شهر'), opt('1-3y','1–3 years','1–3 سنوات'), opt('3-6y','3–6 years','3–6 سنوات'), opt('6-12y','6–12 years','6–12 سنة'), opt('12y+','12+ years','12+ سنة')], required: true, filterable: true, visibleOnCard: true },
    { key: 'gender',         label: { en: 'Gender',             ar: 'الفئة' },             type: 'select',      options: [opt('boys','Boys','أولاد'), opt('girls','Girls','بنات'), opt('unisex','Unisex','للجنسين')], filterable: true, visibleOnCard: true },
    { key: 'material',       label: { en: 'Material',           ar: 'الخامة' },            type: 'text',        filterable: true, comparable: true, placeholder: { en: 'ABS Plastic, Wood, Fabric…', ar: 'بلاستيك، خشب، قماش…' } },
    { key: 'batteriesRequired', label: { en: 'Batteries required', ar: 'يتطلب بطاريات' }, type: 'boolean',     filterable: true },
    { key: 'educational',    label: { en: 'Educational',        ar: 'تعليمي' },            type: 'boolean',     filterable: true, visibleOnCard: true },
    { key: 'safetyCert',     label: { en: 'Safety certification', ar: 'شهادة الأمان' },   type: 'text',        comparable: true, placeholder: { en: 'CE, ASTM, EN71…', ar: 'CE، ASTM، EN71…' } },
    { key: 'brand',          label: { en: 'Brand',              ar: 'العلامة التجارية' },  type: 'text',        filterable: true, visibleOnCard: true },
  ],
};

const healthSupplements: ProductCategorySchema = {
  key: 'health_supplements',
  label: { en: 'Health & Supplements', ar: 'الصحة والمكملات الغذائية' },
  description: { en: 'Vitamins, protein, supplements and wellness products.', ar: 'الفيتامينات والبروتين والمكملات الغذائية.' },
  group: 'health',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size',   label: { en: 'Size / count',  ar: 'الحجم / الكمية' }, suggestedValues: ['30 tabs','60 tabs','90 tabs','500g','1kg','2kg'] },
    { key: 'flavor', label: { en: 'Flavor',         ar: 'النكهة' } },
  ],
  fields: [
    { key: 'form',              label: { en: 'Product form',      ar: 'شكل المنتج' },          type: 'select',      options: [opt('capsule','Capsule','كبسولة'), opt('tablet','Tablet','قرص'), opt('powder','Powder','مسحوق'), opt('liquid','Liquid','سائل'), opt('gummy','Gummy','جيلاتيني'), opt('bar','Bar','بار'), opt('softgel','Softgel','هلامي')], required: true, filterable: true, visibleOnCard: true },
    { key: 'servingSize',       label: { en: 'Serving size',      ar: 'حجم الحصة' },           type: 'text',        comparable: true, placeholder: { en: '1 capsule, 30g scoop…', ar: 'كبسولة واحدة، 30 غ…' } },
    { key: 'servingsPerContainer', label: { en: 'Servings per container', ar: 'الحصص في العبوة' }, type: 'number', comparable: true, validation: { min: 0, max: 10000 } },
    { key: 'targetBenefit',    label: { en: 'Target benefit',    ar: 'الفائدة المستهدفة' },    type: 'multi_select', options: [opt('muscle','Muscle building','بناء العضل'), opt('weight_loss','Weight loss','خسارة الوزن'), opt('immunity','Immunity','المناعة'), opt('energy','Energy','الطاقة'), opt('joint','Joint support','دعم المفاصل'), opt('heart','Heart health','صحة القلب'), opt('brain','Brain health','صحة الدماغ'), opt('sleep','Sleep','النوم'), opt('hair_nails','Hair & nails','الشعر والأظافر')], filterable: true },
    { key: 'allergenFree',     label: { en: 'Allergen-free from', ar: 'خالٍ من' },             type: 'multi_select', options: [opt('gluten','Gluten','غلوتين'), opt('dairy','Dairy','ألبان'), opt('soy','Soy','صويا'), opt('nuts','Nuts','مكسّرات'), opt('artificial','Artificial colours/flavours','ألوان/نكهات صناعية')], filterable: true },
    { key: 'expiryDate',       label: { en: 'Expiry date',       ar: 'تاريخ الانتهاء' },      type: 'date' },
    { key: 'brand',            label: { en: 'Brand',             ar: 'العلامة التجارية' },     type: 'text',        filterable: true, visibleOnCard: true },
    { key: 'halal',            label: { en: 'Halal',             ar: 'حلال' },                 type: 'boolean',     filterable: true, visibleOnCard: true },
  ],
};

const opticsEyewear: ProductCategorySchema = {
  key: 'optics_eyewear',
  label: { en: 'Optics & Eyewear', ar: 'البصريات والنظارات' },
  description: { en: 'Glasses, sunglasses, contact lenses and optical accessories.', ar: 'النظارات الطبية والشمسية والعدسات اللاصقة.' },
  group: 'health',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color',       label: { en: 'Frame color', ar: 'لون الإطار' }, suggestedValues: ['Black','Tortoise','Gold','Silver','Clear','Brown'] },
    { key: 'frame_size',  label: { en: 'Frame size',  ar: 'مقاس الإطار' }, suggestedValues: ['Small','Medium','Large','Extra Large'] },
  ],
  fields: [
    { key: 'eyewearType',       label: { en: 'Eyewear type',       ar: 'نوع النظارة' },       type: 'select',   options: [opt('sunglasses','Sunglasses','نظارة شمسية'), opt('optical','Optical frames','إطار طبي'), opt('reading','Reading glasses','نظارة قراءة'), opt('safety','Safety glasses','نظارة سلامة'), opt('contact','Contact lenses','عدسات لاصقة'), opt('goggles','Goggles','نظارة واقية')], required: true, filterable: true, visibleOnCard: true },
    { key: 'frameShape',        label: { en: 'Frame shape',        ar: 'شكل الإطار' },        type: 'select',   options: [opt('round','Round','دائري'), opt('square','Square','مربع'), opt('rectangle','Rectangle','مستطيل'), opt('cat_eye','Cat-eye','عين القطة'), opt('aviator','Aviator','طياري'), opt('oval','Oval','بيضاوي'), opt('rimless','Rimless','بدون إطار')], filterable: true, comparable: true },
    { key: 'frameMaterial',     label: { en: 'Frame material',     ar: 'مادة الإطار' },       type: 'select',   options: [opt('acetate','Acetate','أسيتات'), opt('metal','Metal','معدن'), opt('titanium','Titanium','تيتانيوم'), opt('plastic','Plastic','بلاستيك'), opt('wood','Wood','خشب')], filterable: true },
    { key: 'lensType',          label: { en: 'Lens type',          ar: 'نوع العدسة' },        type: 'select',   options: [opt('clear','Clear','شفاف'), opt('tinted','Tinted','ملون'), opt('polarized','Polarized','مستقطب'), opt('photochromic','Photochromic','فوتوكروميك'), opt('blue_light','Blue-light filter','فلتر ضوء أزرق')], filterable: true, visibleOnCard: true },
    { key: 'uvProtection',      label: { en: 'UV protection',      ar: 'حماية من الأشعة' },   type: 'select',   options: [opt('uv400','UV400','UV400'), opt('uv380','UV380','UV380'), opt('none','None','لا توجد')], filterable: true, visibleOnCard: true },
    { key: 'prescriptionReady', label: { en: 'Prescription-ready', ar: 'قابل للتقوية الطبية' }, type: 'boolean', filterable: true },
    { key: 'brand',             label: { en: 'Brand',              ar: 'العلامة التجارية' },  type: 'text',     filterable: true, visibleOnCard: true },
    { key: 'gender',            label: { en: 'Gender',             ar: 'الفئة' },             type: 'select',   options: AUDIENCE_OPTIONS, filterable: true },
  ],
};

const camerasPhotography: ProductCategorySchema = {
  key: 'cameras_photography',
  label: { en: 'Cameras & Photography', ar: 'الكاميرات والتصوير' },
  description: { en: 'Cameras, lenses, drones, accessories and studio equipment.', ar: 'الكاميرات والعدسات والطائرات المسيّرة ومعدات الاستوديو.' },
  group: 'electronics',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black','Silver','White'] },
  ],
  fields: [
    { key: 'cameraType',   label: { en: 'Camera type',      ar: 'نوع الكاميرا' },        type: 'select',      options: [opt('dslr','DSLR','رقمية احترافية'), opt('mirrorless','Mirrorless','بدون مرآة'), opt('action','Action / GoPro','أكشن'), opt('compact','Compact / Point-and-shoot','مدمجة'), opt('drone','Drone','طائرة مسيّرة'), opt('cctv','CCTV / Security','مراقبة'), opt('lens','Lens','عدسة'), opt('accessory','Accessory','ملحق')], required: true, filterable: true, visibleOnCard: true },
    { key: 'brand',        label: { en: 'Brand',            ar: 'العلامة التجارية' },    type: 'text',        required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'model',        label: { en: 'Model',            ar: 'الموديل' },             type: 'text',        required: true, comparable: true },
    { key: 'megapixels',   label: { en: 'Megapixels',       ar: 'الميغابكسل' },          type: 'number',      unit: 'MP', comparable: true, validation: { min: 0, max: 1000 } },
    { key: 'sensorSize',   label: { en: 'Sensor size',      ar: 'حجم الحساس' },          type: 'select',      options: [opt('full_frame','Full-frame','إطار كامل'), opt('aps_c','APS-C','APS-C'), opt('micro43','Micro 4/3','ميكرو 4/3'), opt('1inch','1 inch','1 بوصة'), opt('smartphone','Smartphone','هاتف'), opt('na','N/A','لا ينطبق')], filterable: true, comparable: true },
    { key: 'lensMount',    label: { en: 'Lens mount',       ar: 'حامل العدسة' },         type: 'text',        filterable: true, comparable: true, placeholder: { en: 'Sony E, Canon RF, Nikon Z…', ar: 'سوني E، كانون RF…' } },
    { key: 'condition',    label: { en: 'Condition',        ar: 'الحالة' },              type: 'select',      options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'connectivity', label: { en: 'Connectivity',     ar: 'الاتصال' },             type: 'multi_select', options: [opt('wifi','Wi-Fi','واي فاي'), opt('bluetooth','Bluetooth','بلوتوث'), opt('usb_c','USB-C','يو إس بي سي'), opt('hdmi','HDMI','HDMI'), opt('ethernet','Ethernet','إيثرنت')], filterable: true },
    { key: 'warrantyPeriod', label: { en: 'Warranty period', ar: 'مدة الضمان' },         type: 'text',        comparable: true, placeholder: { en: '12 months', ar: '12 شهر' } },
  ],
};

const kitchenAppliances: ProductCategorySchema = {
  key: 'kitchen_appliances',
  label: { en: 'Kitchen & Appliances', ar: 'المطبخ والأجهزة الكهربائية' },
  description: { en: 'Kitchen appliances, cookware and household appliances.', ar: 'أجهزة المطبخ وأدوات الطبخ والأجهزة المنزلية.' },
  group: 'home',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black','White','Silver','Red'] },
  ],
  fields: [
    { key: 'applianceType',  label: { en: 'Appliance type',   ar: 'نوع الجهاز' },       type: 'select',  options: [opt('kettle','Kettle','غلاية'), opt('blender','Blender','خلاط'), opt('air_fryer','Air fryer','قلاية هوائية'), opt('oven','Oven / toaster oven','فرن'), opt('microwave','Microwave','ميكروويف'), opt('coffee','Coffee machine','ماكينة قهوة'), opt('rice_cooker','Rice cooker','طباخة أرز'), opt('juicer','Juicer','عصارة'), opt('food_processor','Food processor','معالج طعام'), opt('fridge','Fridge / freezer','ثلاجة'), opt('washing_machine','Washing machine','غسالة'), opt('ac','Air conditioner','مكيف'), opt('vacuum','Vacuum cleaner','مكنسة كهربائية'), opt('iron','Steam iron','مكواة بخارية'), opt('cookware','Cookware / pots','أواني طبخ'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'brand',          label: { en: 'Brand',            ar: 'العلامة التجارية' },  type: 'text',    filterable: true, comparable: true, visibleOnCard: true },
    { key: 'powerWatts',     label: { en: 'Power (watts)',    ar: 'الطاقة (واط)' },      type: 'number',  unit: 'W', comparable: true, validation: { min: 0, max: 100000 } },
    { key: 'capacity',       label: { en: 'Capacity',         ar: 'السعة' },             type: 'text',    comparable: true, placeholder: { en: '1.5L, 4kg…', ar: '1.5 لتر، 4 كغ…' } },
    { key: 'voltageType',    label: { en: 'Voltage / plug',   ar: 'الجهد / القابس' },    type: 'select',  options: [opt('220v','220V (Jordan / EU)','220 فولت'), opt('110v','110V (US)','110 فولت'), opt('dual','Dual voltage','مزدوج')], filterable: true },
    { key: 'warrantyPeriod', label: { en: 'Warranty period',  ar: 'مدة الضمان' },        type: 'text',    comparable: true, placeholder: { en: '12 months', ar: '12 شهر' } },
    { key: 'condition',      label: { en: 'Condition',        ar: 'الحالة' },            type: 'select',  options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
  ],
};

const gardenOutdoor: ProductCategorySchema = {
  key: 'garden_outdoor',
  label: { en: 'Garden & Outdoors', ar: 'الحديقة والخارج' },
  description: { en: 'Garden furniture, plants, tools and outdoor equipment.', ar: 'أثاث الحديقة والنباتات والأدوات ومعدات الهواء الطلق.' },
  group: 'home',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Green','Brown','Black','White'] },
    { key: 'size',  label: { en: 'Size',  ar: 'الحجم' } },
  ],
  fields: [
    { key: 'productType',      label: { en: 'Product type',      ar: 'نوع المنتج' },        type: 'select',  options: [opt('plant','Plant / tree','نبات / شجرة'), opt('seed','Seeds / bulbs','بذور / بصيلات'), opt('pot','Pot / planter','وعاء / مزهرية'), opt('soil','Soil / fertilizer','تربة / سماد'), opt('tool','Garden tool','أداة حديقة'), opt('furniture','Outdoor furniture','أثاث خارجي'), opt('lighting','Outdoor lighting','إضاءة خارجية'), opt('BBQ','BBQ / grill','شواء'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'material',         label: { en: 'Material',          ar: 'المادة' },            type: 'text',    filterable: true, comparable: true },
    { key: 'weatherResistant', label: { en: 'Weather-resistant', ar: 'مقاوم للطقس' },      type: 'boolean', filterable: true, visibleOnCard: true },
    { key: 'uvResistant',      label: { en: 'UV-resistant',      ar: 'مقاوم للأشعة' },     type: 'boolean', filterable: true },
    { key: 'dimensions',       label: { en: 'Dimensions',        ar: 'الأبعاد' },           type: 'dimension', comparable: true },
    { key: 'careInstructions', label: { en: 'Care instructions', ar: 'تعليمات العناية' },   type: 'textarea', validation: { maxLength: 1200 } },
  ],
};

const petSupplies: ProductCategorySchema = {
  key: 'pet_supplies',
  label: { en: 'Pet Supplies', ar: 'مستلزمات الحيوانات الأليفة' },
  description: { en: 'Food, accessories and care products for pets.', ar: 'طعام وإكسسوارات ومنتجات العناية للحيوانات الأليفة.' },
  group: 'hobbies',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size',   label: { en: 'Size',   ar: 'الحجم' },    suggestedValues: ['XS','S','M','L','XL'] },
    { key: 'flavor', label: { en: 'Flavor', ar: 'النكهة' } },
  ],
  fields: [
    { key: 'petType',        label: { en: 'Pet type',         ar: 'نوع الحيوان' },        type: 'select',      options: [opt('dog','Dog','كلب'), opt('cat','Cat','قط'), opt('bird','Bird','طائر'), opt('fish','Fish','سمك'), opt('rabbit','Rabbit','أرنب'), opt('reptile','Reptile','زواحف'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'lifeStage',      label: { en: 'Life stage',       ar: 'مرحلة العمر' },        type: 'select',      options: [opt('puppy','Puppy / kitten','صغير'), opt('adult','Adult','بالغ'), opt('senior','Senior','كبير'), opt('all','All stages','جميع المراحل')], filterable: true },
    { key: 'productType',    label: { en: 'Product type',     ar: 'نوع المنتج' },          type: 'select',      options: [opt('food','Food','طعام'), opt('treat','Treat / snack','وجبة خفيفة'), opt('accessory','Accessory','إكسسوار'), opt('toy','Toy','لعبة'), opt('grooming','Grooming','تجميل'), opt('health','Health / medicine','صحة / دواء'), opt('bedding','Bedding / house','فراش / بيت')], required: true, filterable: true, visibleOnCard: true },
    { key: 'weightVolume',   label: { en: 'Weight / volume',  ar: 'الوزن / الحجم' },       type: 'text',        comparable: true, placeholder: { en: '1kg, 400g…', ar: '1 كغ، 400 غ…' } },
    { key: 'ingredients',    label: { en: 'Ingredients',      ar: 'المكوّنات' },           type: 'textarea',    validation: { maxLength: 2000 } },
    { key: 'brand',          label: { en: 'Brand',            ar: 'العلامة التجارية' },    type: 'text',        filterable: true, visibleOnCard: true },
  ],
};

const automotive: ProductCategorySchema = {
  key: 'automotive',
  label: { en: 'Car Parts & Accessories', ar: 'قطع السيارات والإكسسوارات' },
  description: { en: 'Auto parts, car accessories, oils and maintenance products.', ar: 'قطع غيار السيارات والإكسسوارات والزيوت.' },
  group: 'automotive',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' } },
  ],
  fields: [
    { key: 'partType',       label: { en: 'Part / product type',   ar: 'نوع القطعة / المنتج' }, type: 'select',  options: [opt('exterior','Exterior part','قطعة خارجية'), opt('interior','Interior accessory','إكسسوار داخلي'), opt('engine','Engine part','قطعة محرك'), opt('electrical','Electrical','كهربائي'), opt('brake','Brakes','فرامل'), opt('oil_filter','Oil / filter','زيت / فلتر'), opt('tires','Tires / wheels','إطارات / عجلات'), opt('audio','Car audio','صوتيات'), opt('security','Security / cameras','أمان / كاميرات'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'brand',          label: { en: 'Brand',                 ar: 'العلامة التجارية' },    type: 'text',    filterable: true, comparable: true, visibleOnCard: true },
    { key: 'compatibility',  label: { en: 'Compatible with',       ar: 'يتوافق مع' },           type: 'textarea', validation: { maxLength: 1200 }, helpText: { en: 'List makes / models / years this fits.', ar: 'اذكر الماركات والموديلات والسنوات المتوافقة.' } },
    { key: 'condition',      label: { en: 'Condition',             ar: 'الحالة' },              type: 'select',  options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'oem',            label: { en: 'OEM / aftermarket',     ar: 'أصلي / بديل' },         type: 'select',  options: [opt('oem','OEM (original)','قطعة أصلية'), opt('aftermarket','Aftermarket','بديل'), opt('oem_equivalent','OEM-equivalent','معادل الأصلي')], filterable: true, visibleOnCard: true },
    { key: 'warrantyPeriod', label: { en: 'Warranty period',       ar: 'مدة الضمان' },          type: 'text',    comparable: true },
  ],
};

const officeSupplies: ProductCategorySchema = {
  key: 'office_supplies',
  label: { en: 'Office & School Supplies', ar: 'مستلزمات المكتب والمدرسة' },
  description: { en: 'Stationery, office furniture, school supplies and printing.', ar: 'القرطاسية وأثاث المكتب ومستلزمات المدرسة.' },
  group: 'hobbies',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color',    label: { en: 'Color',    ar: 'اللون' } },
    { key: 'pack_size', label: { en: 'Pack size', ar: 'حجم العبوة' }, suggestedValues: ['1 pc','5 pcs','10 pcs','50 pcs','100 pcs'] },
  ],
  fields: [
    { key: 'productType', label: { en: 'Product type',    ar: 'نوع المنتج' },         type: 'select',  options: [opt('pen','Pen / pencil','قلم'), opt('notebook','Notebook','دفتر'), opt('paper','Paper / printer paper','ورق'), opt('folder','Folder / organizer','ملف'), opt('desk','Desk accessory','إكسسوار مكتب'), opt('chair','Chair','كرسي'), opt('toner','Toner / ink','حبر / تونر'), opt('whiteboard','Whiteboard','لوح أبيض'), opt('backpack','School bag','حقيبة مدرسة'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'material',    label: { en: 'Material',        ar: 'الخامة' },             type: 'text',    filterable: true, comparable: true },
    { key: 'brand',       label: { en: 'Brand',           ar: 'العلامة التجارية' },   type: 'text',    filterable: true, visibleOnCard: true },
    { key: 'color',       label: { en: 'Color',           ar: 'اللون' },              type: 'text',    filterable: true, visibleOnCard: true },
  ],
};

const musicalInstruments: ProductCategorySchema = {
  key: 'musical_instruments',
  label: { en: 'Musical Instruments', ar: 'الآلات الموسيقية' },
  description: { en: 'Instruments, audio equipment and music accessories.', ar: 'الآلات الموسيقية ومعدات الصوت والإكسسوارات.' },
  group: 'hobbies',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color / finish', ar: 'اللون / التشطيب' } },
  ],
  fields: [
    { key: 'instrumentFamily', label: { en: 'Instrument family',    ar: 'عائلة الآلة' },       type: 'select',      options: [opt('strings','Strings','وترية'), opt('wind','Wind / brass','نفخية'), opt('percussion','Percussion','إيقاعية'), opt('keyboard','Keyboard / piano','لوحة مفاتيح / بيانو'), opt('electronic','Electronic / DJ','إلكترونية / DJ'), opt('vocals','Vocal / mic','مايك / صوت'), opt('oud','Oud / Middle Eastern','عود / شرقية'), opt('accessory','Accessory','ملحق')], required: true, filterable: true, visibleOnCard: true },
    { key: 'brand',            label: { en: 'Brand',                ar: 'العلامة التجارية' },  type: 'text',        filterable: true, comparable: true, visibleOnCard: true },
    { key: 'condition',        label: { en: 'Condition',            ar: 'الحالة' },            type: 'select',      options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'includedItems',    label: { en: 'Included accessories', ar: 'الملحقات المرفقة' }, type: 'multi_select', options: [opt('case','Case / bag','حقيبة'), opt('cable','Cable','كابل'), opt('manual','Manual','دليل'), opt('strings_extra','Extra strings','أوتار إضافية'), opt('picks','Picks / sticks','ريشة / عصا')], filterable: true },
    { key: 'expertiseLevel',   label: { en: 'Expertise level',     ar: 'مستوى الخبرة' },      type: 'select',      options: [opt('beginner','Beginner','مبتدئ'), opt('intermediate','Intermediate','متوسط'), opt('advanced','Advanced / Pro','متقدم')], filterable: true },
  ],
};

const weddingEvents: ProductCategorySchema = {
  key: 'wedding_events',
  label: { en: 'Wedding & Events', ar: 'الأفراح والمناسبات' },
  description: { en: 'Wedding decorations, favors, event supplies and party goods.', ar: 'ديكورات الأعراس وهدايا المناسبات ومستلزمات الحفلات.' },
  group: 'hobbies',
  sellingTypes: ['simple', 'variants', 'made_to_order'],
  variantOptions: [
    { key: 'color',    label: { en: 'Color palette', ar: 'لوحة الألوان' } },
    { key: 'quantity', label: { en: 'Quantity / pack', ar: 'الكمية / الحزمة' }, suggestedValues: ['1 pc','Set of 10','Set of 50','Set of 100'] },
  ],
  fields: [
    { key: 'productType',    label: { en: 'Product type',     ar: 'نوع المنتج' },         type: 'select',  options: [opt('decor','Decoration','ديكور'), opt('favor','Wedding favor','هدية ضيوف'), opt('floral','Floral arrangement','تنسيق زهور'), opt('cake_topper','Cake topper','تزيين كعكة'), opt('invitation','Invitation / stationery','دعوة / قرطاسية'), opt('lighting','Lighting / candle','إضاءة / شمعة'), opt('balloon','Balloons','بالونات'), opt('table','Table setting','مستلزمات طاولة'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'material',       label: { en: 'Material',         ar: 'المادة' },             type: 'text',    filterable: true, comparable: true },
    { key: 'customizable',   label: { en: 'Customizable',     ar: 'قابل للتخصيص' },       type: 'boolean', filterable: true, visibleOnCard: true },
    { key: 'leadTime',       label: { en: 'Lead time',        ar: 'وقت التحضير' },        type: 'text',    comparable: true, placeholder: { en: '3–5 business days', ar: '3–5 أيام عمل' } },
    { key: 'eventType',      label: { en: 'Event type',       ar: 'نوع المناسبة' },       type: 'select',  options: [opt('wedding','Wedding','عرس'), opt('engagement','Engagement','خطوبة'), opt('birthday','Birthday','عيد ميلاد'), opt('babyshower','Baby shower','استقبال مولود'), opt('graduation','Graduation','تخرج'), opt('corporate','Corporate / event','مؤسسي'), opt('other','Other','أخرى')], filterable: true },
  ],
};

const traditionalFood: ProductCategorySchema = {
  key: 'traditional_food',
  label: { en: 'Traditional & Local Food', ar: 'الطعام التقليدي والمحلي' },
  description: { en: 'Dates, olive oil, za\'atar, sweets and Jordanian specialty foods.', ar: 'التمور وزيت الزيتون والزعتر والحلويات والأغذية الأردنية.' },
  group: 'food',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size', label: { en: 'Size / pack', ar: 'الحجم / العبوة' }, suggestedValues: ['250g','500g','1kg','2kg','5kg'] },
  ],
  fields: [
    { key: 'specialty',          label: { en: 'Specialty / product',   ar: 'التخصص / المنتج' },      type: 'select',      options: [opt('dates','Dates','تمور'), opt('olive_oil','Olive oil','زيت زيتون'), opt('zataar','Za\'atar mix','زعتر'), opt('sweets','Oriental sweets','حلويات شرقية'), opt('pickles','Pickles','مخللات'), opt('honey','Honey','عسل'), opt('dairy','Dairy / labaneh','ألبان / لبنة'), opt('spices','Spices / herbs','بهارات / أعشاب'), opt('dried_fruit','Dried fruit & nuts','فواكه مجففة ومكسرات'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'region',             label: { en: 'Region / origin',       ar: 'المنطقة / المنشأ' },     type: 'select',      options: [opt('jordan','Jordan','الأردن'), opt('palestine','Palestine','فلسطين'), opt('saudi','Saudi Arabia','السعودية'), opt('egypt','Egypt','مصر'), opt('syria','Syria','سوريا'), opt('levant','Levant region','بلاد الشام'), opt('gulf','Gulf region','دول الخليج'), opt('international','International','دولي')], filterable: true, comparable: true, visibleOnCard: true },
    { key: 'weightVolume',       label: { en: 'Weight / volume',       ar: 'الوزن / الحجم' },        type: 'text',        comparable: true, visibleOnCard: true },
    { key: 'ingredients',        label: { en: 'Ingredients',           ar: 'المكوّنات' },            type: 'textarea',    validation: { maxLength: 2000 } },
    { key: 'halal',              label: { en: 'Halal',                 ar: 'حلال' },                 type: 'boolean',     filterable: true, visibleOnCard: true },
    { key: 'organic',            label: { en: 'Organic / natural',     ar: 'عضوي / طبيعي' },         type: 'boolean',     filterable: true, visibleOnCard: true },
    { key: 'expiryDate',         label: { en: 'Expiry / best before',  ar: 'تاريخ الانتهاء' },       type: 'date' },
    { key: 'allergens',          label: { en: 'Allergens',             ar: 'مسببات الحساسية' },      type: 'multi_select', options: [opt('gluten','Gluten','غلوتين'), opt('dairy','Dairy','ألبان'), opt('nuts','Nuts','مكسّرات'), opt('sesame','Sesame','سمسم'), opt('eggs','Eggs','بيض')], filterable: true },
    { key: 'storageInstructions',label: { en: 'Storage instructions',  ar: 'تعليمات التخزين' },      type: 'textarea',    validation: { maxLength: 1200 } },
  ],
};

const digitalProducts: ProductCategorySchema = {
  key: 'digital_products',
  label: { en: 'Digital Products', ar: 'المنتجات الرقمية' },
  description: { en: 'Software, e-books, digital downloads, templates and subscriptions.', ar: 'البرامج والكتب الإلكترونية والتحميلات الرقمية والقوالب.' },
  group: 'digital',
  sellingTypes: ['digital'],
  fields: [
    { key: 'productType',   label: { en: 'Product type',     ar: 'نوع المنتج' },         type: 'select',  options: [opt('software','Software / app','برنامج / تطبيق'), opt('ebook','eBook','كتاب إلكتروني'), opt('template','Template / design file','قالب / ملف تصميم'), opt('course','Online course','دورة أونلاين'), opt('music','Music / audio','موسيقى / صوت'), opt('video','Video / film','فيديو / فيلم'), opt('game','Game','لعبة'), opt('font','Font / typeface','خط'), opt('preset','Preset / filter','إعداد مسبق'), opt('subscription','Subscription / key','اشتراك / مفتاح'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'fileFormat',    label: { en: 'File format(s)',   ar: 'صيغة الملف' },         type: 'text',    comparable: true, placeholder: { en: 'PDF, MP3, ZIP, EXE…', ar: 'PDF، MP3، ZIP، EXE…' } },
    { key: 'fileSize',      label: { en: 'File size',        ar: 'حجم الملف' },          type: 'text',    comparable: true, placeholder: { en: '250 MB', ar: '250 ميغابايت' } },
    { key: 'licenseType',   label: { en: 'License type',     ar: 'نوع الترخيص' },        type: 'select',  options: [opt('personal','Personal use','استخدام شخصي'), opt('commercial','Commercial use','استخدام تجاري'), opt('extended','Extended / unlimited','مفتوح / غير محدود'), opt('subscription','Subscription','اشتراك')], required: true, filterable: true, visibleOnCard: true },
    { key: 'deliveryMethod',label: { en: 'Delivery method',  ar: 'طريقة التسليم' },      type: 'select',  options: [opt('download','Instant download','تحميل فوري'), opt('email','Email delivery','تسليم بالبريد'), opt('link','Shared link','رابط مشترك'), opt('account','Account access','وصول بحساب')], required: true, filterable: true },
    { key: 'platform',      label: { en: 'Platform / OS',    ar: 'النظام / المنصة' },    type: 'text',    comparable: true, placeholder: { en: 'Windows, Mac, iOS, Android…', ar: 'ويندوز، ماك، iOS، أندرويد…' } },
    { key: 'language',      label: { en: 'Language',         ar: 'اللغة' },              type: 'select',  options: [opt('ar','Arabic','العربية'), opt('en','English','الإنجليزية'), opt('multi','Multilingual','متعدد اللغات')], filterable: true },
  ],
};

const medicalWellness: ProductCategorySchema = {
  key: 'medical_wellness',
  label: { en: 'Medical & Wellness Equipment', ar: 'الأجهزة الطبية والصحية' },
  description: { en: 'Medical devices, physiotherapy equipment and wellness tools.', ar: 'الأجهزة الطبية والعلاج الطبيعي وأدوات الصحة.' },
  group: 'health',
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' } },
  ],
  fields: [
    { key: 'deviceType',     label: { en: 'Device type',      ar: 'نوع الجهاز' },          type: 'select',  options: [opt('bp_monitor','Blood pressure monitor','جهاز ضغط الدم'), opt('glucose','Glucose meter','جهاز سكر الدم'), opt('thermometer','Thermometer','ميزان الحرارة'), opt('nebulizer','Nebulizer','جهاز استنشاق'), opt('wheelchair','Wheelchair','كرسي متحرك'), opt('crutches','Crutches / walker','عكاز'), opt('massage','Massager','جهاز مساج'), opt('tens','TENS / EMS unit','جهاز TENS'), opt('scale','Body scale','ميزان جسم'), opt('first_aid','First-aid supply','مستلزم إسعاف أولي'), opt('other','Other','أخرى')], required: true, filterable: true, visibleOnCard: true },
    { key: 'intendedUse',    label: { en: 'Intended use',     ar: 'الاستخدام المقصود' },   type: 'text',    comparable: true },
    { key: 'certifications', label: { en: 'Certifications',   ar: 'الاعتمادات' },          type: 'text',    comparable: true, placeholder: { en: 'FDA, CE, ISO 13485…', ar: 'FDA، CE، ISO 13485…' } },
    { key: 'powerSource',    label: { en: 'Power source',     ar: 'مصدر الطاقة' },         type: 'select',  options: [opt('battery','Battery','بطارية'), opt('plug','Mains / plug','كهرباء'), opt('usb','USB','يو إس بي'), opt('manual','Manual / no power','يدوي')], filterable: true },
    { key: 'condition',      label: { en: 'Condition',        ar: 'الحالة' },              type: 'select',  options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'brand',          label: { en: 'Brand',            ar: 'العلامة التجارية' },    type: 'text',    filterable: true, visibleOnCard: true },
    { key: 'warrantyPeriod', label: { en: 'Warranty period',  ar: 'مدة الضمان' },          type: 'text',    comparable: true },
  ],
};

// ---------------------------------------------------------------------------
// Registry.
// ---------------------------------------------------------------------------

export const PRODUCT_CATEGORY_SCHEMAS: ProductCategorySchema[] = [
  // Fashion & Apparel
  clothing, shoes, modestFashion, kidsClothing, bagsLuggage,
  // Electronics & Tech
  electronics, mobilePhones, camerasPhotography, kitchenAppliances,
  // Food & Grocery
  food, traditionalFood,
  // Health & Beauty
  beauty, perfumes, healthSupplements, opticsEyewear, medicalWellness,
  // Home & Living
  home, gardenOutdoor,
  // Hobbies & Entertainment
  handmade, books, sportsFitness, toysBaby, petSupplies, officeSupplies, musicalInstruments, weddingEvents,
  // Automotive
  automotive,
  // Services
  services,
  // Digital
  digitalProducts,
];

const SCHEMA_BY_KEY: Record<string, ProductCategorySchema> = Object.fromEntries(
  PRODUCT_CATEGORY_SCHEMAS.map((schema) => [schema.key, schema]),
);

export const ALL_SELLING_TYPES: SellingType[] = ['simple', 'variants', 'made_to_order', 'digital', 'service'];

/** Selling types that map to a VARIABLE product (per-variant stock) vs SIMPLE. */
export function persistedSellingType(selling: SellingType): 'SIMPLE' | 'VARIABLE' {
  return selling === 'variants' ? 'VARIABLE' : 'SIMPLE';
}

export function getProductCategorySchema(categoryKey: string | null | undefined): ProductCategorySchema | undefined {
  if (!categoryKey) return undefined;
  return SCHEMA_BY_KEY[categoryKey];
}

export function isKnownCategoryKey(categoryKey: string | null | undefined): boolean {
  return Boolean(categoryKey && categoryKey in SCHEMA_BY_KEY);
}

export function listProductCategorySchemas(): ProductCategorySchema[] {
  return PRODUCT_CATEGORY_SCHEMAS;
}

export function productCategoryKeys(): string[] {
  return PRODUCT_CATEGORY_SCHEMAS.map((schema) => schema.key);
}

export function getCategoryField(categoryKey: string, fieldKey: string): ProductDetailFieldSchema | undefined {
  return getProductCategorySchema(categoryKey)?.fields.find((field) => field.key === fieldKey);
}

export function filterableAttributesFor(categoryKey: string): ProductDetailFieldSchema[] {
  return getProductCategorySchema(categoryKey)?.fields.filter((field) => field.filterable && !field.adminOnly) ?? [];
}

/** A field is shown on the public product page unless explicitly hidden or admin-only. */
export function isFieldPublic(field: ProductDetailFieldSchema): boolean {
  return !field.adminOnly && field.visibleOnProductPage !== false;
}

export function localize(value: Bilingual | undefined, lang: 'en' | 'ar'): string {
  if (!value) return '';
  return value[lang] || value.en || '';
}

/** Return categories clustered by their group, in CATEGORY_GROUPS order. */
export function groupedCategorySchemas(): { group: { key: string; label: Bilingual }; schemas: ProductCategorySchema[] }[] {
  const byGroup = new Map<string, ProductCategorySchema[]>();
  for (const schema of PRODUCT_CATEGORY_SCHEMAS) {
    const gk = schema.group ?? '_other';
    if (!byGroup.has(gk)) byGroup.set(gk, []);
    byGroup.get(gk)!.push(schema);
  }
  const result: { group: { key: string; label: Bilingual }; schemas: ProductCategorySchema[] }[] = [];
  for (const grp of CATEGORY_GROUPS) {
    const schemas = byGroup.get(grp.key);
    if (schemas && schemas.length > 0) result.push({ group: grp, schemas });
  }
  const ungrouped = byGroup.get('_other');
  if (ungrouped && ungrouped.length > 0) {
    result.push({ group: { key: '_other', label: { en: 'Other', ar: 'أخرى' } }, schemas: ungrouped });
  }
  return result;
}

const isBlank = (value: ProductAttributeValue): boolean =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

/**
 * Coerce a raw form value to the field's stored type. Returns null when the value is
 * empty so absent attributes don't pollute the JSON blob.
 */
export function coerceAttributeValue(field: ProductDetailFieldSchema, raw: unknown): ProductAttributeValue {
  if (raw === undefined || raw === null || raw === '') return null;
  switch (field.type) {
    case 'number':
    case 'weight':
    case 'dimension': {
      // dimension is free-text ("30 x 20"); only number/weight coerce to a number.
      if (field.type === 'dimension') return String(raw).trim() || null;
      const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(num) ? num : null;
    }
    case 'boolean':
      if (typeof raw === 'boolean') return raw;
      return /^(true|yes|1|on)$/i.test(String(raw).trim());
    case 'multi_select': {
      const list = Array.isArray(raw) ? raw : String(raw).split(',');
      const cleaned = list.map((item) => String(item).trim()).filter(Boolean);
      return cleaned.length ? Array.from(new Set(cleaned)) : null;
    }
    default:
      return String(raw).trim() || null;
  }
}

export type AttributeError = { key: string; message: string };

/**
 * Validate a category's attributes against its schema. Pure: returns errors so the
 * backend can 400 and the frontend can show them inline. Unknown category → no errors
 * (the category isn't enforced; treated as free-form).
 */
export function validateCategoryAttributes(
  categoryKey: string | null | undefined,
  attributes: Record<string, ProductAttributeValue> | undefined,
): AttributeError[] {
  const schema = getProductCategorySchema(categoryKey);
  if (!schema) return [];
  const attrs = attributes ?? {};
  const errors: AttributeError[] = [];

  for (const field of schema.fields) {
    const value = attrs[field.key];
    const blank = isBlank(value);

    if (field.required && blank) {
      errors.push({ key: field.key, message: `${field.label.en} is required.` });
      continue;
    }
    if (blank) continue;

    const allowed = field.options?.map((option) => option.value);
    if (field.type === 'select' || field.type === 'color') {
      if (allowed && !allowed.includes(String(value))) {
        errors.push({ key: field.key, message: `Invalid value for ${field.label.en}.` });
      }
    } else if (field.type === 'multi_select') {
      if (!Array.isArray(value)) {
        errors.push({ key: field.key, message: `${field.label.en} must be a list.` });
      } else if (allowed) {
        const bad = value.find((item) => !allowed.includes(item));
        if (bad !== undefined) errors.push({ key: field.key, message: `Invalid value "${bad}" for ${field.label.en}.` });
      }
    } else if (field.type === 'number' || field.type === 'weight') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push({ key: field.key, message: `${field.label.en} must be a number.` });
      } else {
        if (field.validation?.min !== undefined && value < field.validation.min) errors.push({ key: field.key, message: `${field.label.en} must be ≥ ${field.validation.min}.` });
        if (field.validation?.max !== undefined && value > field.validation.max) errors.push({ key: field.key, message: `${field.label.en} must be ≤ ${field.validation.max}.` });
      }
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') errors.push({ key: field.key, message: `${field.label.en} must be true/false.` });
    } else {
      // text-like
      if (typeof value !== 'string') {
        errors.push({ key: field.key, message: `${field.label.en} must be text.` });
      } else {
        if (field.validation?.maxLength && value.length > field.validation.maxLength) errors.push({ key: field.key, message: `${field.label.en} is too long.` });
        if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) errors.push({ key: field.key, message: `${field.label.en} has an invalid format.` });
      }
    }
  }
  return errors;
}

/**
 * Normalize attributes for storage: keep only known keys, coerce to the field's type,
 * drop blanks. Unknown category → return {} (don't trust arbitrary keys).
 */
export function normalizeCategoryAttributes(
  categoryKey: string | null | undefined,
  attributes: Record<string, unknown> | undefined,
): Record<string, ProductAttributeValue> {
  const schema = getProductCategorySchema(categoryKey);
  if (!schema || !attributes) return {};
  const out: Record<string, ProductAttributeValue> = {};
  for (const field of schema.fields) {
    const coerced = coerceAttributeValue(field, attributes[field.key]);
    if (!isBlank(coerced)) out[field.key] = coerced;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Whole-details helpers (named per the product spec). These operate on the
// `details` blob's category-relevant parts: attributes + options + variants.
// ---------------------------------------------------------------------------

type DetailsLike = {
  categoryKey?: string | null;
  sellingType?: string;
  attributes?: Record<string, ProductAttributeValue>;
  options?: Array<{ name: string; values: Array<{ value: string }> }>;
  variants?: Array<{ title?: string; selections: Record<string, string> }>;
};

/**
 * Validate the category-relevant parts of a product's details: the category exists,
 * required attributes are present, select values are allowed, and every variant's
 * selections match the declared options. Returns plain errors (path-aware).
 */
export function validateProductDetails(
  categoryKey: string | null | undefined,
  details: DetailsLike,
): AttributeError[] {
  const errors: AttributeError[] = [];
  if (categoryKey && !isKnownCategoryKey(categoryKey)) {
    errors.push({ key: 'categoryKey', message: `Unknown product category "${categoryKey}".` });
    return errors;
  }
  errors.push(...validateCategoryAttributes(categoryKey, details.attributes));

  // Variant ↔ option consistency: each variant selection must reference a declared
  // option name and one of that option's declared values.
  const options = details.options ?? [];
  const optionValues = new Map(options.map((option) => [option.name, new Set(option.values.map((v) => v.value))]));
  for (const variant of details.variants ?? []) {
    for (const [name, value] of Object.entries(variant.selections ?? {})) {
      const allowed = optionValues.get(name);
      if (!allowed) {
        errors.push({ key: 'variants', message: `Variant references unknown option "${name}".` });
      } else if (!allowed.has(value)) {
        errors.push({ key: 'variants', message: `Variant value "${value}" is not a declared "${name}" option.` });
      }
    }
  }
  return errors;
}

/** Normalize the category-relevant parts of details (coerce/clean attributes).
 *  Without a known category there is nothing to normalize — details pass through
 *  untouched so legacy products keep their existing shape. */
export function normalizeProductDetails<T extends DetailsLike>(categoryKey: string | null | undefined, details: T): T {
  if (!getProductCategorySchema(categoryKey)) return details;
  return { ...details, attributes: normalizeCategoryAttributes(categoryKey, details.attributes) };
}

/** Strip admin-only attributes for the public storefront payload. */
export function publicAttributes(
  categoryKey: string | null | undefined,
  attributes: Record<string, ProductAttributeValue> | undefined,
): Record<string, ProductAttributeValue> {
  const schema = getProductCategorySchema(categoryKey);
  if (!schema || !attributes) return {};
  const out: Record<string, ProductAttributeValue> = {};
  for (const field of schema.fields) {
    if (field.adminOnly) continue;
    if (field.key in attributes && !isBlank(attributes[field.key])) out[field.key] = attributes[field.key];
  }
  return out;
}
