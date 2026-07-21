"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Product {
  id: string;
  price: number | string;
  description: { am: string; en: string; om: string };
  images: string[];
  type: string;
  subCategory: string;
  flowerCount?: string | number;
  visible?: boolean;
}

export default function UserPage() {
  const [lang, setLang] = useState<'am' | 'en' | 'om'>('am');
  const [activeTab, setActiveTab] = useState("surprise");
  const [activeSub, setActiveSub] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const translations = {
    am: {
      brandName: "ኪዶ ስጦታዎች እና አበቦች",
      tagline: "ለልዩ ቀናትዎ የሚያምሩ አበቦች እና የስጦታ ፓኬጆች",
      footerAbout: "ኪዶ ስጦታ እና አበባ ማቅረቢያ - ፍቅርን በስጦታ እና በ አበባ ይግለጹ።",
      collectionTitle: "የእኛ ስብስቦች",
      orderButton: "ይዘዙ",
      orderSuccess: "ትዕዛዝ ተልኳል! ✅",
      footerContact: "አግኙን",
      footerRights: "መብቱ በህግ የተጠበቀ ነው።",
      tabs: { surprise: "የስጦታ ጥቅል", flower: "አበቦች", decoration: "አስጌጥ", all: "ሁሉም" },
      subs: {
        flower: { all: "ሁሉም", wedding: "ሰርግ", shimigilina: "ሽምግልና", birthday: "ልደት", anniversery: "የአመት በዓል", graduation: "ምረቃ" },
        decoration: { all: "ሁሉም", birthday: "ልደት", shimigilina: "ሽምግልና", nika: "ኒካህ", wedding: "ሰርግ", babtaizm: "ጥምቀት", graduation: "ምረቃ" },
        surprise: { all: "ሁሉም", men: "ወንዶች", women: "ሴቶች", children: "ህፃናት", father: "አባት", mother: "እናት", "new born": "አዲስ የተወለደ" }
      },
      orderPhrases: {
        surprise: "ዌብሳይታችሁ ላይ ካየሁት አስገራሚ ፓኬጅ ውስጥ ይሄንን ማዘዝ እፈልጋለው",
        flower: "ዌብሳይታችሁ ላይ ካየሁት የአበባ እቅፍ ውስጥ ይሄንን ማዘዝ እፈልጋለው",
        decoration: "ዌብሳይታችሁ ላይ ካየሁት የማስጌጫ ፓኬጅ ውስጥ ይሄንን ማዘዝ እፈልጋለው",
        default: "ዌብሳይታችሁ ላይ ካየሁት ፓኬጅ ውስጥ ይሄንን ማዘዝ እፈልጋለው"
      },
      callToAction: "አመሰግናለው"
    },
    en: {
      brandName: "Kido Gifts & Flowers",
      tagline: "Beautiful flowers and custom surprise packages for your special moments",
      footerAbout: "Kido Gifts & Flower Shop - Express your love through gifts and flowers.",
      collectionTitle: "Our Collection",
      orderButton: "Order Now",
      orderSuccess: "Order Sent! ✅",
      footerContact: "Contact Us",
      footerRights: "All rights reserved.",
      tabs: { surprise: "Surprise", flower: "Flowers", decoration: "Decoration", all: "All" },
      subs: {
        flower: { all: "All", wedding: "Wedding", shimigilina: "Engagement", birthday: "Birthday", anniversery: "Anniversary", graduation: "Graduation" },
        decoration: { all: "All", birthday: "Birthday", shimigilina: "Engagement", nika: "Nika", wedding: "Wedding", babtaizm: "Baptism", graduation: "Graduation" },
        surprise: { all: "All", men: "Men", women: "Women", children: "Children", father: "Father", mother: "Mother", "new born": "New Born" }
      },
      orderPhrases: {
        surprise: "Hello, I would like to order this surprise package from your website:",
        flower: "Hello, I would like to order this flower bouquet from your website:",
        decoration: "Hello, I would like to order this decoration package from your website:",
        default: "Hello, I would like to order this package from your website:"
      },
      callToAction: "Thank you"
    },
    om: {
      brandName: "Kennaafi Abaaroowwan Kido",
      tagline: "Abaaroowwan miidhagoo fi qophii kennaa addaa guyyoota keessaniif",
      footerAbout: "Suuqii Kennaa fi Abaarsaa Kido - Jaalala keessan kennaadhaan ibsaa.",
      collectionTitle: "Walitti Qabama Keenya",
      orderButton: "Ajajaa",
      orderSuccess: "Ajajni Ergame! ✅",
      footerContact: "Nu Quunnamaa",
      footerRights: "Mirgi hunduu eegamaadha.",
      tabs: { surprise: "Kennaa", flower: "Abaaroo", decoration: "Miidhagina", all: "Hunda" },
      subs: {
        flower: { all: "Hunda", wedding: "Guyyaa Gaa'elaa", shimigilina: "Kadhannaa", birthday: "Guyyaa Dhalootaa", anniversery: "Ayyaana Waggaa", graduation: "Eebbifa" },
        decoration: { all: "Hunda", birthday: "Guyyaa Dhalootaa", shimigilina: "Kadhannaa", nika: "Nika", wedding: "Guyyaa Gaa'elaa", babtaizm: "Cuuphaa", graduation: "Eebbifa" },
        surprise: { all: "Hunda", men: "Dhiira", women: "Dubara", children: "Ijoollee", father: "Abbaa", mother: "Haadha", "new born": "Mucaa Haarawa" }
      },
      orderPhrases: {
        surprise: "Marsariitii keessan irraa paakajeetii dinqisiisaa kana ajajuu barbaada:",
        flower: "Marsariitii keessan irraa abaaboo kana ajajuu barbaada:",
        decoration: "Marsariitii keessan irraa paakajeetii miidhaginaa kana ajajuu barbaada:",
        default: "Marsariitii keessan irraa kana ajajuu barbaada:"
      },
      callToAction: "Galatoomaa"
    }
  };

  const getSubCategories = () => {
    if (activeTab === "flower") return ["all", "wedding", "shimigilina", "birthday", "anniversery", "graduation"];
    if (activeTab === "decoration") return ["all", "birthday", "shimigilina", "nika", "wedding", "babtaizm", "graduation"];
    return ["all", "men", "women", "children", "father", "mother", "new born"];
  };

  useEffect(() => { setActiveSub("all"); }, [activeTab]);

  useEffect(() => {
    setProducts([]); 
    const q = query(collection(db, "products"), where("type", "==", activeTab));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        images: doc.data().images || (doc.data().imageUrl ? [doc.data().imageUrl] : []) 
      } as Product));
      
      data = data.filter(p => p.visible !== false);
      
      // When "all" is selected, show all products across categories for this tab type without subCategory filtering
      if (activeSub !== "all") {
        data = data.filter(p => p.subCategory === activeSub);
      }
      
      setProducts(data);
    });
    return () => unsubscribe();
  }, [activeTab, activeSub]);

  const handleOrder = (p: Product, index: number) => {
    setLoadingId(p.id);

    const titlePrefix = p.type === "flower" ? "Flower" : "Package";
    const packageName = `${titlePrefix} ${index + 1} (${p.subCategory.toUpperCase()} - ${Number(p.price).toLocaleString()} ETB)`;
    const telegramUsername = 'kido1222';

    const categoryKey = p.type?.toLowerCase() || 'default';
    const currentPhrases = translations[lang].orderPhrases as Record<string, string>;
    const customPhrase = currentPhrases[categoryKey] || currentPhrases.default;
    const callToAction = translations[lang].callToAction;
    
    const descText = p.description[lang] || p.description.am || p.description.en;
    
    const message = `ሰላም @${telegramUsername}፣\n\n${customPhrase}:\n\n*${packageName}*\n${descText}\n\n${callToAction}`;
    const encodedMessage = encodeURIComponent(message);
    const telegramUrl = `https://t.me/${telegramUsername}?text=${encodedMessage}`;

    setTimeout(() => {
      setLoadingId(null);
    }, 2000);

    window.open(telegramUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col justify-between">
      {/* ===== CLASSIC HEADER ===== */}
      <header className="bg-[var(--brand-light)] border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-black text-[var(--brand-green)] tracking-tight">
              {translations[lang].brandName}
            </span>
            <span className="text-[10px] md:text-xs text-gray-500 font-medium hidden sm:block">
              {translations[lang].tagline}
            </span>
          </div>

          {/* Language Selector in Header */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-full border border-gray-200">
            {(['አማርኛ', 'English', 'Afaan Oromoo'] as const).map((l) => {
              const code = l === 'አማርኛ' ? 'am' : l === 'English' ? 'en' : 'om';
              return (
                <button 
                  key={l}
                  onClick={() => setLang(code)}
                  className={`px-3 py-1 rounded-full font-bold text-xs transition-all ${lang === code ? "bg-[var(--brand-green)] text-white shadow-sm" : "text-gray-600 hover:text-black"}`}
                >
                  {l === 'አማርኛ' ? 'አማ' : l === 'English' ? 'EN' : 'OM'}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="flex-grow p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-green)]">
            {translations[lang].collectionTitle}
          </h1>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["surprise", "flower", "decoration"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-full font-bold transition-all duration-300 border-2 text-sm md:text-base ${activeTab === tab ? "bg-[var(--brand-green)] text-white border-[var(--brand-green)] shadow-lg scale-105" : "bg-[var(--brand-light)] text-[var(--brand-green)] border-[var(--brand-green)] hover:bg-[var(--soft-green)]"}`}>
              {translations[lang].tabs[tab as keyof typeof translations.am.tabs]}
            </button>
          ))}
        </div>

        <div className="flex justify-center flex-wrap gap-2 mb-8">
          {getSubCategories().map(sub => (
            <button key={sub} onClick={() => setActiveSub(sub)} className={`px-4 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${activeSub === sub ? "bg-[var(--text-dark)] text-white shadow-md" : "bg-[var(--brand-light)] text-gray-500 hover:bg-gray-100"}`}>
              {(translations[lang].subs as any)[activeTab][sub]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {products.map((p, index) => {
            const titlePrefix = p.type === "flower" ? "Flower" : "Package";
            return (
              <div key={p.id} className="bg-[var(--brand-light)] rounded-3xl p-3 md:p-4 shadow-sm border border-gray-100 flex flex-row items-stretch gap-4 hover:shadow-md transition-shadow">
                <div onClick={() => setSelectedProduct(p)} className="w-[60%] aspect-[3/3] overflow-hidden rounded-2xl flex-shrink-0 cursor-pointer group">
                  <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={`${titlePrefix} ${index + 1}`} />
                </div>

                <div className="w-1/2 flex flex-col justify-between py-2 px-1">
                  <div>
                    <div className="inline-block bg-gray-100 px-2 py-0.5 rounded-md mb-2">
                      <span className="text-[10px] md:text-xs font-black text-gray-600 uppercase tracking-widest">
                        {titlePrefix} {index + 1}
                      </span>
                    </div>

                    <p className="text-xl md:text-2xl font-black text-[var(--brand-green)] mb-2">
                      {Number(p.price).toLocaleString()} ETB
                    </p>

                    <div className="text-[11px] md:text-sm text-gray-500 mb-4 leading-relaxed">
                      <p className="line-clamp-4 italic font-medium">
                        Includes: {p.description[lang]}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleOrder(p, index)} 
                    disabled={loadingId === p.id}
                    className={`w-full py-3 text-xs md:text-sm font-extrabold rounded-xl transition-all shadow-lg active:scale-[0.97] ${
                      loadingId === p.id 
                        ? "bg-amber-500 text-white cursor-not-allowed" 
                        : "bg-[var(--brand-green)] text-white hover:opacity-95"
                    }`}
                  >
                    {loadingId === p.id ? translations[lang].orderSuccess : translations[lang].orderButton}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ===== CLASSIC FOOTER ===== */}
      <footer className="bg-[var(--text-dark)] text-white mt-12 py-10 px-4 md:px-6 lg:px-10 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          
          {/* Brand Info & Social Media Links */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className="text-lg font-bold text-[var(--brand-gold)] mb-2">
              {translations[lang].brandName}
            </h3>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed max-w-md mb-4">
              {translations[lang].footerAbout}
            </p>

            {/* Clickable Social Media Icons */}
            <div className="flex items-center gap-4">
              {/* TikTok */}
              <a 
                href="https://tiktok.com/@kido.surprise.delivery" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[var(--brand-green)] transition-all text-white"
                title="TikTok"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a 
                href="https://instagram.com/kido122227" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[var(--brand-green)] transition-all text-white"
                title="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* Telegram */}
              <a 
                href="https://t.me/kidodelivery" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[var(--brand-green)] transition-all text-white"
                title="Telegram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.534.26l.213-3.053 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.659-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </a>
            </div>
            <span className="text-xs md:text-sm font-semibold text-gray-300 mb-1 flex items-center justify-center md:justify-end gap-1.5 mt-4">
              {translations[lang].footerContact}: 
              <a href="tel:+251951161632" className="hover:text-[var(--brand-gold)] underline flex items-center gap-1">
                <svg className="w-3.5 h-3.5 fill-current text-[var(--brand-gold)]" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                +251 951 161 632
              </a>
            </span>
          </div>

          {/* Contact, Copyright & Developer Attribution */}
          <div className="flex flex-col items-center md:items-end justify-center text-center md:text-right">
            {/* Developer Credit Link */}
            <p className="text-xs text-gray-400 mb-3 flex items-center justify-center md:justify-end gap-1.5">
              Developed by{" "}
              <a 
                href="https://t.me/temesgenwalelign" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[var(--brand-gold)] font-bold hover:underline"
              >
                Temesgen Walelgn
              </a>
              <span className="text-gray-600">|</span>
              <a 
                href="tel:+251993370491" 
                className="inline-flex items-center gap-1 text-gray-300 hover:text-[var(--brand-gold)] transition-colors"
                title="Call Developer"
              >
                <svg className="w-3.5 h-3.5 fill-current text-[var(--brand-gold)]" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                <span className="text-xs font-semibold">+251 993 370 491</span>
              </a>
            </p>
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} {translations[lang].brandName}. {translations[lang].footerRights}
            </p>
          </div>

        </div>
      </footer>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setSelectedProduct(null)}>
          <div className="relative w-full max-w-lg flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedProduct(null)} className="absolute -top-10 right-0 text-white font-bold hover:text-gray-300">Close ✕</button>
            <GalleryView product={selectedProduct} />
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryView({ product }: { product: Product }) {
  const [main, setMain] = useState(product.images[0]);
  return (
    <div className="flex flex-col gap-3">
      <img src={main} className="w-full aspect-square object-cover rounded-2xl shadow-2xl" />
      <div className="flex gap-2 justify-center">
        {product.images.map((img, i) => (
          <button key={i} onClick={() => setMain(img)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${main === img ? "border-[var(--brand-green)]" : "border-transparent"}`}>
            <img src={img} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}