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
  sellingTypes: SellingType[];
  fields: ProductDetailFieldSchema[];
  variantOptions?: ProductVariantOptionTemplate[];
  storefrontSections?: ProductStorefrontSection[];
};

// ---------------------------------------------------------------------------
// Reusable option sets (kept here so categories that share them stay in sync).
// ---------------------------------------------------------------------------

const opt = (value: string, en: string, ar: string): ProductFieldOption => ({ value, label: { en, ar } });

const AUDIENCE_OPTIONS: ProductFieldOption[] = [
  opt('men', 'Men', 'رجال'),
  opt('women', 'Women', 'نساء'),
  opt('unisex', 'Unisex', 'للجنسين'),
  opt('kids', 'Kids', 'أطفال'),
  opt('baby', 'Baby', 'رضّع'),
];

const CONDITION_OPTIONS: ProductFieldOption[] = [
  opt('new', 'New', 'جديد'),
  opt('refurbished', 'Refurbished', 'مجدّد'),
  opt('used_like_new', 'Used — like new', 'مستعمل — كالجديد'),
  opt('used_good', 'Used — good', 'مستعمل — جيد'),
];

const YES_NO: ProductFieldOption[] = [
  opt('yes', 'Yes', 'نعم'),
  opt('no', 'No', 'لا'),
];

// ---------------------------------------------------------------------------
// Category definitions.
// ---------------------------------------------------------------------------

const clothing: ProductCategorySchema = {
  key: 'clothing',
  label: { en: 'Clothing & Fashion', ar: 'الملابس والأزياء' },
  description: { en: 'Apparel, garments and fashion accessories.', ar: 'الملابس والإكسسوارات.' },
  sellingTypes: ['simple', 'variants', 'made_to_order'],
  variantOptions: [
    { key: 'size', label: { en: 'Size', ar: 'المقاس' }, suggestedValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black', 'White', 'Red', 'Blue', 'Green'] },
  ],
  fields: [
    { key: 'gender', label: { en: 'Gender / audience', ar: 'الفئة' }, type: 'select', options: AUDIENCE_OPTIONS, required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'sizeSystem', label: { en: 'Size system', ar: 'نظام المقاسات' }, type: 'select', options: [opt('eu', 'EU', 'أوروبي'), opt('us', 'US', 'أمريكي'), opt('uk', 'UK', 'بريطاني'), opt('intl', 'International (S/M/L)', 'دولي (S/M/L)')], filterable: true },
    { key: 'availableSizes', label: { en: 'Available sizes', ar: 'المقاسات المتوفرة' }, type: 'multi_select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => opt(s, s, s)), filterable: true, helpText: { en: 'Used for filters; variants stay the source of truth for stock.', ar: 'تُستخدم للفلترة؛ تبقى المتغيّرات مرجع المخزون.' } },
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, type: 'text', filterable: true, comparable: true, visibleOnCard: true, placeholder: { en: 'Olive, Black, Cream…', ar: 'زيتي، أسود، كريمي…' } },
    { key: 'material', label: { en: 'Material', ar: 'الخامة' }, type: 'text', filterable: true, comparable: true, placeholder: { en: '100% cotton', ar: 'قطن 100%' } },
    { key: 'fit', label: { en: 'Fit', ar: 'القَصّة' }, type: 'select', options: [opt('slim', 'Slim', 'ضيّق'), opt('regular', 'Regular', 'عادي'), opt('relaxed', 'Relaxed', 'مريح'), opt('oversized', 'Oversized', 'واسع')], filterable: true, comparable: true },
    { key: 'season', label: { en: 'Season', ar: 'الموسم' }, type: 'select', options: [opt('all', 'All seasons', 'كل المواسم'), opt('summer', 'Summer', 'صيفي'), opt('winter', 'Winter', 'شتوي'), opt('spring', 'Spring', 'ربيعي'), opt('autumn', 'Autumn', 'خريفي')], filterable: true },
    { key: 'careInstructions', label: { en: 'Care instructions', ar: 'تعليمات العناية' }, type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'countryOfOrigin', label: { en: 'Country of origin', ar: 'بلد المنشأ' }, type: 'text', comparable: true },
  ],
  storefrontSections: [
    { key: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' }, fieldKeys: ['gender', 'material', 'fit', 'color', 'season'] },
    { key: 'care', label: { en: 'Care', ar: 'العناية' }, fieldKeys: ['careInstructions', 'countryOfOrigin'] },
  ],
};

const shoes: ProductCategorySchema = {
  key: 'shoes',
  label: { en: 'Shoes', ar: 'الأحذية' },
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size', label: { en: 'Size', ar: 'المقاس' }, suggestedValues: ['38', '39', '40', '41', '42', '43', '44'] },
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black', 'White', 'Red', 'Blue', 'Green'] },
  ],
  fields: [
    { key: 'gender', label: { en: 'Gender / audience', ar: 'الفئة' }, type: 'select', options: AUDIENCE_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'shoeSizeSystem', label: { en: 'Shoe size system', ar: 'نظام مقاس الحذاء' }, type: 'select', options: [opt('eu', 'EU', 'أوروبي'), opt('us', 'US', 'أمريكي'), opt('uk', 'UK', 'بريطاني')], required: true, filterable: true },
    { key: 'availableSizes', label: { en: 'Available sizes', ar: 'المقاسات المتوفرة' }, type: 'multi_select', options: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'].map((s) => opt(s, s, s)), filterable: true },
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, type: 'text', filterable: true, visibleOnCard: true },
    { key: 'material', label: { en: 'Material', ar: 'الخامة' }, type: 'text', filterable: true, comparable: true },
    { key: 'soleMaterial', label: { en: 'Sole material', ar: 'خامة النعل' }, type: 'text', comparable: true },
    { key: 'closureType', label: { en: 'Closure type', ar: 'نوع الإغلاق' }, type: 'select', options: [opt('laces', 'Laces', 'رباط'), opt('slip_on', 'Slip-on', 'بدون رباط'), opt('velcro', 'Velcro', 'لاصق'), opt('buckle', 'Buckle', 'إبزيم'), opt('zipper', 'Zipper', 'سحّاب')], filterable: true },
    { key: 'occasion', label: { en: 'Occasion', ar: 'المناسبة' }, type: 'select', options: [opt('casual', 'Casual', 'كاجوال'), opt('formal', 'Formal', 'رسمي'), opt('sport', 'Sport', 'رياضي'), opt('outdoor', 'Outdoor', 'خارجي')], filterable: true },
  ],
};

const electronics: ProductCategorySchema = {
  key: 'electronics',
  label: { en: 'Electronics', ar: 'الإلكترونيات' },
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'storage', label: { en: 'Storage', ar: 'التخزين' }, suggestedValues: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black', 'White', 'Red', 'Blue', 'Green'] },
    { key: 'ram', label: { en: 'RAM', ar: 'الذاكرة' }, suggestedValues: ['4GB', '8GB', '16GB', '32GB'] },
  ],
  fields: [
    { key: 'brand', label: { en: 'Brand', ar: 'العلامة التجارية' }, type: 'text', required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'model', label: { en: 'Model', ar: 'الموديل' }, type: 'text', required: true, comparable: true },
    { key: 'condition', label: { en: 'Condition', ar: 'الحالة' }, type: 'select', options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'warrantyPeriod', label: { en: 'Warranty period', ar: 'مدة الضمان' }, type: 'text', comparable: true, placeholder: { en: '12 months', ar: '12 شهر' } },
    { key: 'powerSource', label: { en: 'Power source', ar: 'مصدر الطاقة' }, type: 'select', options: [opt('battery', 'Battery', 'بطارية'), opt('plug', 'Mains / plug', 'كهرباء'), opt('usb', 'USB', 'يو إس بي'), opt('solar', 'Solar', 'طاقة شمسية')], filterable: true },
    { key: 'batteryCapacity', label: { en: 'Battery capacity', ar: 'سعة البطارية' }, type: 'number', unit: 'mAh', comparable: true, validation: { min: 0, max: 1_000_000 } },
    { key: 'connectivity', label: { en: 'Connectivity', ar: 'الاتصال' }, type: 'multi_select', options: [opt('wifi', 'Wi-Fi', 'واي فاي'), opt('bluetooth', 'Bluetooth', 'بلوتوث'), opt('nfc', 'NFC', 'إن إف سي'), opt('usb_c', 'USB-C', 'يو إس بي سي'), opt('hdmi', 'HDMI', 'إتش دي إم آي'), opt('cellular', 'Cellular', 'خلوي')], filterable: true },
    { key: 'storage', label: { en: 'Storage', ar: 'سعة التخزين' }, type: 'text', filterable: true, comparable: true },
    { key: 'ram', label: { en: 'RAM', ar: 'الذاكرة العشوائية' }, type: 'text', filterable: true, comparable: true },
    { key: 'screenSize', label: { en: 'Screen size', ar: 'حجم الشاشة' }, type: 'number', unit: 'in', comparable: true, validation: { min: 0, max: 200 } },
    { key: 'includedAccessories', label: { en: 'Included accessories', ar: 'الملحقات المرفقة' }, type: 'multi_select', options: [opt('charger', 'Charger', 'شاحن'), opt('cable', 'Cable', 'كابل'), opt('case', 'Case', 'حافظة'), opt('manual', 'Manual', 'دليل'), opt('earphones', 'Earphones', 'سماعات')] },
  ],
};

const mobilePhones: ProductCategorySchema = {
  key: 'mobile_phones',
  label: { en: 'Mobile Phones', ar: 'الهواتف المحمولة' },
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'storage', label: { en: 'Storage', ar: 'التخزين' }, suggestedValues: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black', 'White', 'Red', 'Blue', 'Green'] },
    { key: 'ram', label: { en: 'RAM', ar: 'الذاكرة' }, suggestedValues: ['4GB', '6GB', '8GB', '12GB', '16GB'] },
  ],
  fields: [
    { key: 'brand', label: { en: 'Brand', ar: 'العلامة التجارية' }, type: 'text', required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'model', label: { en: 'Model', ar: 'الموديل' }, type: 'text', required: true, comparable: true },
    { key: 'storage', label: { en: 'Storage', ar: 'سعة التخزين' }, type: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB'].map((s) => opt(s, s, s)), required: true, filterable: true, comparable: true, visibleOnCard: true },
    { key: 'ram', label: { en: 'RAM', ar: 'الذاكرة العشوائية' }, type: 'select', options: ['4GB', '6GB', '8GB', '12GB', '16GB'].map((s) => opt(s, s, s)), filterable: true, comparable: true },
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, type: 'text', required: true, filterable: true, visibleOnCard: true },
    { key: 'batteryHealth', label: { en: 'Battery health', ar: 'صحة البطارية' }, type: 'number', unit: '%', comparable: true, validation: { min: 0, max: 100 }, helpText: { en: 'Mostly for used phones.', ar: 'غالبًا للهواتف المستعملة.' } },
    { key: 'networkCompatibility', label: { en: 'Network compatibility', ar: 'توافق الشبكة' }, type: 'select', options: [opt('5g', '5G', '5G'), opt('4g', '4G / LTE', '4G / LTE'), opt('3g', '3G', '3G')], filterable: true },
    { key: 'simType', label: { en: 'SIM type', ar: 'نوع الشريحة' }, type: 'select', options: [opt('nano', 'Nano SIM', 'نانو'), opt('dual', 'Dual SIM', 'شريحتان'), opt('esim', 'eSIM', 'eSIM')], filterable: true },
    { key: 'condition', label: { en: 'Condition', ar: 'الحالة' }, type: 'select', options: CONDITION_OPTIONS, required: true, filterable: true, visibleOnCard: true },
    { key: 'warrantyPeriod', label: { en: 'Warranty period', ar: 'مدة الضمان' }, type: 'text', comparable: true, placeholder: { en: '12 months', ar: '12 شهر' } },
  ],
};

const beauty: ProductCategorySchema = {
  key: 'beauty',
  label: { en: 'Beauty & Personal Care', ar: 'الجمال والعناية الشخصية' },
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size', label: { en: 'Size', ar: 'الحجم' }, suggestedValues: ['30ml', '50ml', '100ml', '200ml'] },
    { key: 'scent', label: { en: 'Scent', ar: 'الرائحة' } },
  ],
  fields: [
    { key: 'skinType', label: { en: 'Skin type', ar: 'نوع البشرة' }, type: 'multi_select', options: [opt('all', 'All', 'كل الأنواع'), opt('dry', 'Dry', 'جافة'), opt('oily', 'Oily', 'دهنية'), opt('combination', 'Combination', 'مختلطة'), opt('sensitive', 'Sensitive', 'حساسة')], filterable: true },
    { key: 'hairType', label: { en: 'Hair type', ar: 'نوع الشعر' }, type: 'multi_select', options: [opt('all', 'All', 'كل الأنواع'), opt('dry', 'Dry', 'جاف'), opt('oily', 'Oily', 'دهني'), opt('curly', 'Curly', 'مجعّد'), opt('straight', 'Straight', 'ناعم')], filterable: true },
    { key: 'volume', label: { en: 'Volume / size', ar: 'الحجم' }, type: 'number', unit: 'ml', comparable: true, validation: { min: 0, max: 100000 } },
    { key: 'ingredients', label: { en: 'Ingredients', ar: 'المكوّنات' }, type: 'textarea', validation: { maxLength: 2000 } },
    { key: 'usageInstructions', label: { en: 'Usage instructions', ar: 'طريقة الاستخدام' }, type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'expiryDate', label: { en: 'Expiry date', ar: 'تاريخ الانتهاء' }, type: 'date' },
    { key: 'warnings', label: { en: 'Warnings', ar: 'تحذيرات' }, type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'crueltyFree', label: { en: 'Cruelty-free', ar: 'خالٍ من القسوة على الحيوان' }, type: 'boolean', filterable: true, visibleOnCard: true },
  ],
};

const food: ProductCategorySchema = {
  key: 'food',
  label: { en: 'Food & Grocery', ar: 'الطعام والبقالة' },
  sellingTypes: ['simple', 'variants'],
  variantOptions: [
    { key: 'size', label: { en: 'Size / pack', ar: 'الحجم / العبوة' }, suggestedValues: ['250g', '500g', '1kg'] },
  ],
  fields: [
    { key: 'weightVolume', label: { en: 'Weight / volume', ar: 'الوزن / الحجم' }, type: 'text', comparable: true, visibleOnCard: true, placeholder: { en: '500 g, 1 L…', ar: '500 غ، 1 لتر…' } },
    { key: 'ingredients', label: { en: 'Ingredients', ar: 'المكوّنات' }, type: 'textarea', validation: { maxLength: 2000 } },
    { key: 'allergens', label: { en: 'Allergens', ar: 'مسببات الحساسية' }, type: 'multi_select', options: [opt('gluten', 'Gluten', 'غلوتين'), opt('dairy', 'Dairy', 'ألبان'), opt('nuts', 'Nuts', 'مكسّرات'), opt('eggs', 'Eggs', 'بيض'), opt('soy', 'Soy', 'صويا'), opt('sesame', 'Sesame', 'سمسم')], filterable: true },
    { key: 'nutritionFacts', label: { en: 'Nutrition facts', ar: 'القيمة الغذائية' }, type: 'textarea', validation: { maxLength: 2000 } },
    { key: 'expiryDate', label: { en: 'Expiry / best before', ar: 'تاريخ الانتهاء' }, type: 'date' },
    { key: 'storageInstructions', label: { en: 'Storage instructions', ar: 'تعليمات التخزين' }, type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'countryOfOrigin', label: { en: 'Country of origin', ar: 'بلد المنشأ' }, type: 'text', comparable: true },
    { key: 'halal', label: { en: 'Halal', ar: 'حلال' }, type: 'boolean', filterable: true, visibleOnCard: true },
  ],
};

const home: ProductCategorySchema = {
  key: 'home',
  label: { en: 'Home & Furniture', ar: 'المنزل والأثاث' },
  sellingTypes: ['simple', 'variants', 'made_to_order'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black', 'White', 'Red', 'Blue', 'Green'] },
    { key: 'size', label: { en: 'Size', ar: 'الحجم' } },
  ],
  fields: [
    { key: 'material', label: { en: 'Material', ar: 'الخامة' }, type: 'text', filterable: true, comparable: true, visibleOnCard: true },
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, type: 'text', filterable: true, visibleOnCard: true },
    { key: 'dimensions', label: { en: 'Dimensions', ar: 'الأبعاد' }, type: 'dimension', comparable: true, placeholder: { en: '30 × 20 × 8 cm', ar: '30 × 20 × 8 سم' } },
    { key: 'roomType', label: { en: 'Room type', ar: 'الغرفة' }, type: 'select', options: [opt('living', 'Living room', 'غرفة المعيشة'), opt('bedroom', 'Bedroom', 'غرفة النوم'), opt('kitchen', 'Kitchen', 'المطبخ'), opt('bathroom', 'Bathroom', 'الحمام'), opt('office', 'Office', 'المكتب'), opt('outdoor', 'Outdoor', 'خارجي')], filterable: true },
    { key: 'assemblyRequired', label: { en: 'Assembly required', ar: 'يتطلب التركيب' }, type: 'boolean', filterable: true },
    { key: 'careInstructions', label: { en: 'Care instructions', ar: 'تعليمات العناية' }, type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'weight', label: { en: 'Weight', ar: 'الوزن' }, type: 'weight', unit: 'kg', comparable: true, validation: { min: 0, max: 100000 } },
    { key: 'supplierName', label: { en: 'Supplier (internal)', ar: 'المورّد (داخلي)' }, type: 'text', adminOnly: true, helpText: { en: 'Private sourcing note — never shown to customers.', ar: 'ملاحظة داخلية — لا تظهر للعملاء أبدًا.' } },
  ],
};

const handmade: ProductCategorySchema = {
  key: 'handmade',
  label: { en: 'Handmade / Crafts', ar: 'صناعة يدوية / حرف' },
  sellingTypes: ['simple', 'made_to_order', 'variants'],
  variantOptions: [
    { key: 'color', label: { en: 'Color', ar: 'اللون' }, suggestedValues: ['Black', 'White', 'Red', 'Blue', 'Green'] },
    { key: 'size', label: { en: 'Size', ar: 'الحجم' } },
    { key: 'customization', label: { en: 'Customization', ar: 'التخصيص' } },
  ],
  fields: [
    { key: 'material', label: { en: 'Material', ar: 'الخامة' }, type: 'text', filterable: true, comparable: true, visibleOnCard: true },
    { key: 'handmade', label: { en: 'Handmade', ar: 'صناعة يدوية' }, type: 'boolean', filterable: true, visibleOnCard: true },
    { key: 'productionTime', label: { en: 'Production time', ar: 'مدة التحضير' }, type: 'text', comparable: true, placeholder: { en: '3–5 business days', ar: '3–5 أيام عمل' } },
    { key: 'customizable', label: { en: 'Customizable', ar: 'قابل للتخصيص' }, type: 'boolean', filterable: true },
    { key: 'customizationInstructions', label: { en: 'Customization instructions', ar: 'تعليمات التخصيص' }, type: 'textarea', validation: { maxLength: 1200 } },
    { key: 'dimensions', label: { en: 'Dimensions', ar: 'الأبعاد' }, type: 'dimension', comparable: true },
  ],
};

const books: ProductCategorySchema = {
  key: 'books',
  label: { en: 'Books & Stationery', ar: 'الكتب والقرطاسية' },
  sellingTypes: ['simple', 'variants', 'digital'],
  variantOptions: [
    { key: 'format', label: { en: 'Format', ar: 'الصيغة' }, suggestedValues: ['Paperback', 'Hardcover', 'eBook'] },
  ],
  fields: [
    { key: 'author', label: { en: 'Author', ar: 'المؤلف' }, type: 'text', filterable: true, comparable: true, visibleOnCard: true },
    { key: 'publisher', label: { en: 'Publisher', ar: 'الناشر' }, type: 'text', filterable: true, comparable: true },
    { key: 'language', label: { en: 'Language', ar: 'اللغة' }, type: 'select', options: [opt('ar', 'Arabic', 'العربية'), opt('en', 'English', 'الإنجليزية'), opt('fr', 'French', 'الفرنسية'), opt('other', 'Other', 'أخرى')], required: true, filterable: true },
    { key: 'format', label: { en: 'Format', ar: 'الصيغة' }, type: 'select', options: [opt('paperback', 'Paperback', 'غلاف ورقي'), opt('hardcover', 'Hardcover', 'غلاف مقوّى'), opt('ebook', 'eBook', 'كتاب إلكتروني')], filterable: true, comparable: true },
    { key: 'numberOfPages', label: { en: 'Number of pages', ar: 'عدد الصفحات' }, type: 'number', comparable: true, validation: { min: 0, max: 100000 } },
    { key: 'isbn', label: { en: 'ISBN', ar: 'الرقم الدولي ISBN' }, type: 'text', comparable: true, validation: { maxLength: 20 } },
    { key: 'edition', label: { en: 'Edition', ar: 'الإصدار' }, type: 'text', comparable: true },
  ],
};

const services: ProductCategorySchema = {
  key: 'services',
  label: { en: 'Services', ar: 'الخدمات' },
  sellingTypes: ['service'],
  fields: [
    { key: 'serviceDuration', label: { en: 'Service duration', ar: 'مدة الخدمة' }, type: 'text', comparable: true, visibleOnCard: true, placeholder: { en: '60 minutes', ar: '60 دقيقة' } },
    { key: 'serviceLocationType', label: { en: 'Service location', ar: 'مكان الخدمة' }, type: 'select', options: [opt('onsite', 'On-site', 'في الموقع'), opt('remote', 'Remote', 'عن بُعد'), opt('in_store', 'In store', 'في المتجر')], required: true, filterable: true },
    { key: 'bookingRequired', label: { en: 'Booking required', ar: 'يتطلب حجزًا' }, type: 'boolean', filterable: true },
    { key: 'includedItems', label: { en: 'Included items', ar: 'يشمل' }, type: 'textarea', validation: { maxLength: 1600 } },
    { key: 'excludedItems', label: { en: 'Excluded items', ar: 'لا يشمل' }, type: 'textarea', validation: { maxLength: 1600 } },
    { key: 'preparationInstructions', label: { en: 'Preparation instructions', ar: 'تعليمات التحضير' }, type: 'textarea', validation: { maxLength: 1200 } },
  ],
};

// ---------------------------------------------------------------------------
// Registry.
// ---------------------------------------------------------------------------

export const PRODUCT_CATEGORY_SCHEMAS: ProductCategorySchema[] = [
  clothing,
  shoes,
  electronics,
  mobilePhones,
  beauty,
  food,
  home,
  handmade,
  books,
  services,
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
