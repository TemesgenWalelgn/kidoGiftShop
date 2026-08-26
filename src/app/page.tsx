"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc
} from "firebase/firestore";

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

interface TempSubCategory {
  id: string;
  type: string;
  enabled: boolean;
  order?: number;
  name: { am: string; en: string; om: string };
}

export default function UserPage() {
  const [lang, setLang] = useState<"am" | "en" | "om">("am");
  const [activeTab, setActiveTab] = useState("surprise");
  const [activeSub, setActiveSub] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [tempSubs, setTempSubs] = useState<TempSubCategory[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // ===== EVENT THEME STATE =====
  const [eventTheme, setEventTheme] = useState("none");
  const [eventEnabled, setEventEnabled] = useState(false);
  const [eventAnimation, setEventAnimation] = useState(true);
  const [eventParticles, setEventParticles] = useState(false);

  const translations = {
    am: {
      brandName: "ኪዶ አበባ እና ስጦታ መሸጫ",
      tagline: "ለልዩ ቀናትዎ የሚያምሩ አበቦች እና የስጦታ ፓኬጆች",
      footerAbout: "ኪዶ አበባ እና ስጦታ መሸጫ - ፍቅሮን በስጦታ እና በአበባ ይግለጹ።",
      collectionTitle: "የአማራጮቻችንን ይመልከቱ",
      orderButton: "አሁኑኑ ይዘዙ",
      orderSuccess: "ትዕዛዝ ተልኳል! ✅",
      footerContact: "እኛን ለማግኘት",
      footerRights: "መብቱ በህግ የተጠበቀ ነው።",
      tabs: {
        surprise: "የሰርፕራይዝ ጥቅል",
        flower: "አበቦች",
        decoration: "የዲኮር ስራ"
      },
      subs: {
        flower: {
          all: "ሁሉም",
          wedding: "ሰርግ",
          shimigilina: "ሽምግልና",
          birthday: "ልደት",
          anniversery: "አንቨርሰሪ በዓል",
          graduation: "ምረቃ"
        },
        decoration: {
          all: "ሁሉም",
          birthday: "ልደት",
          shimigilina: "ሽምግልና",
          nika: "ኒካህ",
          wedding: "ሰርግ",
          babtaizm: "ጥምቀት",
          graduation: "ምረቃ"
        },
        surprise: {
          all: "ሁሉም",
          men: "ለወንዶች",
          women: "ለሴቶች",
          children: "ለህፃናት",
          father: "ለአባት",
          mother: "ለእናት",
          "new born": "ለአራስ"
        }
      },
      orderPhrases: {
        surprise: "ዌብሳይታችሁ ላይ ካየሁት አስገራሚ ፓኬጅ ውስጥ ይሄንን ማዘዝ እፈልጋለው",
        flower: "ዌብሳይታችሁ ላይ ካየሁት የአበባ እቅፍ ውስጥ ይሄንን ማዘዝ እፈልጋለው",
        decoration: "ዌብሳይታችሁ ላይ ካየሁት የዲኮር ውስጥ ይሄንን ማዘዝ እፈልጋለው",
        default: "ዌብሳይታችሁ ላይ ካየሁት ፓኬጅ ውስጥ ይሄንን ማዘዝ እፈልጋለው"
      },
      callToAction: "አመሰግናለው"
    },

    en: {
      brandName: "Kido Flowers & Gifts Shop",
      tagline: "Beautiful flowers and custom surprise packages for your special moments",
      footerAbout: "Kido Gifts & Flower Shop - Express your love through gifts and flowers.",
      collectionTitle: "Our Collection",
      orderButton: "Order Now",
      orderSuccess: "Order Sent! ✅",
      footerContact: "Contact Us",
      footerRights: "All rights reserved.",
      tabs: {
        surprise: "Surprise pkg",
        flower: "Flowers",
        decoration: "Event Decor"
      },
      subs: {
        flower: {
          all: "All",
          wedding: "For Wedding",
          shimigilina: "For Engagement",
          birthday: "For Birthday",
          anniversery: "For Anniversary",
          graduation: "For Graduation"
        },
        decoration: {
          all: "All",
          birthday: "For Birthday",
          shimigilina: "For Engagement",
          nika: "For Nika",
          wedding: "For Wedding",
          babtaizm: "For Baptism",
          graduation: "For Graduation"
        },
        surprise: {
          all: "All",
          men: "For Men",
          women: "For Women",
          children: "For Children",
          father: "For Father",
          mother: "For Mother",
          "new born": "New Born"
        }
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
      brandName: "Kennaafi Abaaboowwan Kido",
      tagline: "Abaaboowwan miidhagoo fi qophii kennaa addaa guyyoota keessaniif",
      footerAbout: "Suuqii Kennaa fi Abaabsaa Kido - Jaalala keessan kennaadhaan ibsaa.",
      collectionTitle: "Walitti Qabama Keenya",
      orderButton: "Ajajaa",
      orderSuccess: "Ajajni Ergame! ✅",
      footerContact: "Nu Quunnamaa",
      footerRights: "Mirgi hunduu eegamaadha.",
      tabs: {
        surprise: "surprisee",
        flower: "Abaaboo",
        decoration: "decoraa"
      },
      subs: {
        flower: {
          all: "Hunda",
          wedding: "Guyyaa Gaa'elaa",
          shimigilina: "Kadhannaa",
          birthday: "Guyyaa Dhalootaa",
          anniversery: "Ayyaana Waggaa",
          graduation: "Eebbifa"
        },
        decoration: {
          all: "Hunda",
          birthday: "Guyyaa Dhalootaa",
          shimigilina: "Kadhannaa",
          nika: "Nika",
          wedding: "Guyyaa Gaa'elaa",
          babtaizm: "Cuuphaa",
          graduation: "Eebbifa"
        },
        surprise: {
          all: "Hunda",
          men: "Dhiira",
          women: "Dubara",
          children: "Ijoollee",
          father: "Abbaa",
          mother: "Haadha",
          "new born": "Mucaa Haarawa"
        }
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

  // Load temporary categories in real time
  useEffect(() => {
    return onSnapshot(
      collection(db, "temporarySubCategories"),
      snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TempSubCategory));

        setTempSubs(
          data
            .filter(x => x.enabled)
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        );
      },
      error => console.error("Temporary categories:", error)
    );
  }, []);

  // ===== LOAD EVENT THEME IN REAL TIME =====
  useEffect(() => {
    return onSnapshot(
      doc(db, "settings", "eventTheme"),
      snapshot => {
        if (!snapshot.exists()) {
          setEventTheme("none");
          setEventEnabled(false);
          setEventAnimation(true);
          setEventParticles(false);
          return;
        }

        const data = snapshot.data();

        setEventTheme(data.event || "none");
        setEventEnabled(data.enabled === true);
        setEventAnimation(data.animation !== false);
        setEventParticles(data.particles === true);
      },
      error => console.error("Event theme:", error)
    );
  }, []);

  const getSubCategories = () => {
    const normal =
      activeTab === "flower"
        ? [
            "all",
            "wedding",
            "shimigilina",
            "birthday",
            "anniversery",
            "graduation"
          ]
        : activeTab === "decoration"
        ? [
            "all",
            "birthday",
            "shimigilina",
            "nika",
            "wedding",
            "babtaizm",
            "graduation"
          ]
        : [
            "all",
            "men",
            "women",
            "children",
            "father",
            "mother",
            "new born"
          ];

    const temporary = tempSubs
      .filter(x => x.type === activeTab)
      .map(x => x.id);

    return [normal[0], ...temporary, ...normal.slice(1)];
  };

  const getSubName = (sub: string) => {
    const temp = tempSubs.find(x => x.id === sub);

    if (temp) {
      return temp.name?.[lang] || temp.name?.en || "Special";
    }

    return (translations[lang].subs as any)[activeTab][sub];
  };

  useEffect(() => {
    setActiveSub("all");
  }, [activeTab]);

  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("type", "==", activeTab)
    );

    return onSnapshot(q, snapshot => {
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        images:
          doc.data().images ||
          (doc.data().imageUrl ? [doc.data().imageUrl] : [])
      } as Product));

      data = data.filter(p => p.visible !== false);

      if (activeSub !== "all") {
        data = data.filter(p => p.subCategory === activeSub);
      }

      setProducts(data);
    });
  }, [activeTab, activeSub]);

  const handleOrder = (p: Product, index: number) => {
    setLoadingId(p.id);

    const titlePrefix =
      p.type === "flower" ? "Flower" : "Package";

    const temp = tempSubs.find(
      x => x.id === p.subCategory
    );

    const categoryName =
      temp?.name?.[lang] || p.subCategory;

    const packageName =
      `${titlePrefix} ${index + 1} (${categoryName.toUpperCase()} - ${Number(
        p.price
      ).toLocaleString()} ETB)`;

    const telegramUsername = "kido1222";

    const phrases =
      translations[lang].orderPhrases as Record<string, string>;

    const phrase =
      phrases[p.type] || phrases.default;

    const desc =
      p.description[lang] ||
      p.description.am ||
      p.description.en;

    const message =
      `ሰላም @${telegramUsername}፣\n\n${phrase}\n\n*${packageName}*\n${desc}\n\n${translations[lang].callToAction}`;

    window.open(
      `https://t.me/${telegramUsername}?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    setTimeout(() => setLoadingId(null), 2000);
  };

  return (
    <div
      className={`min-h-screen ${
        eventEnabled && eventTheme !== "none"
          ? `theme-${eventTheme}`
          : ""
      } theme-page flex flex-col`}
    >

      {eventEnabled && eventParticles && (
        <div className="event-particles" />
      )}

      <header className="bg-[var(--brand-light)] border-b border-gray-200 shadow-sm sticky top-0 z-40">

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 h-20 flex items-center justify-between">

          <div className="flex items-center gap-2 sm:gap-3">

            <img
              src="https://res.cloudinary.com/dmp2grjb1/image/upload/v1787681880/kido_logo_f2vkmh.png"
              alt="KIDO Logo"
              className="h-14 sm:h-16 md:h-[70px] w-auto object-contain"
            />

            <div className="flex flex-col justify-center leading-none">

              <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wide text-[var(--brand-green)]">
                KIDO
              </span>

              <span className="text-[8px] sm:text-[10px] md:text-xs font-semibold tracking-[0.15em] text-gray-500 mt-1">
                FLOWERS & GIFTS SHOP
              </span>

            </div>

          </div>

          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-full border">

            {(["አማርኛ", "English", "Afaan Oromoo"] as const).map(l => {

              const code =
                l === "አማርኛ"
                  ? "am"
                  : l === "English"
                  ? "en"
                  : "om";

              return (
                <button
                  key={l}
                  onClick={() => setLang(code)}
                  className={`px-3 py-1 rounded-full font-bold text-xs ${
                    lang === code
                      ? "bg-[var(--event-primary)] text-white"
                      : "text-gray-600"
                  }`}
                >
                  {code === "am"
                    ? "አማ"
                    : code === "en"
                    ? "EN"
                    : "OM"}
                </button>
              );
            })}

          </div>

        </div>
      </header>

      <main className="flex-grow p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">

        <div className="text-center mb-8">

          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--event-secondary)] to-[var(--event-primary)]">
            {translations[lang].collectionTitle}
          </h1>

        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">

          {["surprise", "flower", "decoration"].map(tab => (

            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full font-bold border-2 text-sm md:text-base ${
                activeTab === tab
                  ? "bg-[var(--event-primary)] text-white border-[var(--event-primary)] shadow-lg"
                  : "bg-[var(--brand-light)] text-[var(--event-primary)] border-[var(--event-primary)]"
              }`}
            >
              {translations[lang].tabs[
                tab as keyof typeof translations.am.tabs
              ]}
            </button>

          ))}

        </div>

        <div className="flex justify-center flex-wrap gap-2 mb-8">

          {getSubCategories().map(sub => (

            <button
              key={sub}
              onClick={() => setActiveSub(sub)}
              className={`px-4 py-1.5 rounded-xl text-xs md:text-sm font-semibold ${
                activeSub === sub
                  ? "bg-[var(--text-dark)] text-white shadow-md"
                  : "bg-[var(--brand-light)] text-gray-500"
              }`}
            >
              {getSubName(sub)}
            </button>

          ))}

        </div>

        {/* 2 columns on mobile, 3 laptop, 4 desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">

          {products.map((p, index) => {

            const title =
              p.type === "flower"
                ? "Flower"
                : "Package";

            return (

              <div
                key={p.id}
                className={`theme-card bg-[var(--brand-light)] rounded-2xl md:rounded-3xl p-2 sm:p-3 md:p-4 shadow-sm border border-gray-100 flex flex-col h-full min-w-0 hover:shadow-md transition-shadow ${
                  eventAnimation ? "theme-animate" : ""
                }`}
              >

                <div
                  onClick={() => setSelectedProduct(p)}
                  className="w-full aspect-square overflow-hidden rounded-xl md:rounded-2xl cursor-pointer group"
                >

                  <img
                    src={p.images[0]}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={`${title} ${index + 1}`}
                  />

                </div>

                <div className="flex flex-col flex-1 pt-3 px-1">

                  <div>

                    <div className="inline-block bg-gray-100 px-2 py-0.5 rounded-md mb-1.5">

                      <span className="text-[8px] sm:text-[10px] font-black text-gray-600 uppercase">
                        {title} {index + 1}
                      </span>

                    </div>

                    <p className="text-sm sm:text-base md:text-xl font-black text-[var(--event-primary)] mb-1.5">
                      {Number(p.price).toLocaleString()} ETB
                    </p>

                    <p className="text-[9px] sm:text-[10px] md:text-sm text-gray-500 leading-relaxed line-clamp-3 min-h-[45px] md:min-h-[60px]">
                      Includes: {p.description[lang]}
                    </p>

                  </div>

                  <button
                    onClick={() => handleOrder(p, index)}
                    disabled={loadingId === p.id}
                    className={`w-full mt-auto py-2 sm:py-2.5 md:py-3 text-[9px] sm:text-xs md:text-sm font-extrabold rounded-lg md:rounded-xl transition-all shadow-lg ${
                      loadingId === p.id
                        ? "bg-amber-500 text-white"
                        : "bg-[var(--event-primary)] text-white hover:opacity-95"
                    }`}
                  >
                    {loadingId === p.id
                      ? translations[lang].orderSuccess
                      : translations[lang].orderButton}
                  </button>

                </div>

              </div>
            );
          })}

        </div>

      </main>

      <footer className="bg-[var(--text-dark)] text-white mt-12 py-10 px-4 md:px-6 lg:px-10">

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">

          <div className="text-center md:text-left">

            <h3 className="text-lg font-bold text-[var(--brand-gold)] mb-2">
              {translations[lang].brandName}
            </h3>

            <p className="text-xs md:text-sm text-gray-400 max-w-md mb-4">
              {translations[lang].footerAbout}
            </p>

            <div className="flex justify-center md:justify-start gap-4">

              <a
                href="https://tiktok.com/@kido.surprise.delivery"
                target="_blank"
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"
              >
                ♪
              </a>

              <a
                href="https://instagram.com/kido122227"
                target="_blank"
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"
              >
                ◎
              </a>

              <a
                href="https://t.me/kidodelivery"
                target="_blank"
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"
              >
                ➤
              </a>

            </div>

            <p className="text-xs md:text-sm text-gray-300 mt-4">
              {translations[lang].footerContact}:{" "}

              <a
                href="tel:+251951161632"
                className="underline"
              >
                +251 951 161 632
              </a>
            </p>

          </div>

          <div className="text-center md:text-right text-xs text-gray-400">

            <p className="mb-3">

              Developed by{" "}

              <a
                href="https://t.me/temesgenwalelign"
                target="_blank"
                className="text-[var(--brand-gold)] font-bold"
              >
                Temesgen Walelgn
              </a>

              {" | "}

              <a href="tel:+251993370491">
                +251 993 370 491
              </a>

            </p>

            <p>
              © {new Date().getFullYear()}{" "}
              {translations[lang].brandName}.{" "}
              {translations[lang].footerRights}
            </p>

          </div>

        </div>

      </footer>

      {selectedProduct && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setSelectedProduct(null)}
        >

          <div
            className="relative w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >

            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute -top-10 right-0 text-white font-bold"
            >
              Close ✕
            </button>

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

      <img
        src={main}
        className="w-full aspect-square object-cover rounded-2xl shadow-2xl"
      />

      <div className="flex gap-2 justify-center overflow-x-auto">

        {product.images.map((img, i) => (

          <button
            key={i}
            onClick={() => setMain(img)}
            className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
              main === img
                ? "border-[var(--event-primary)]"
                : "border-transparent"
            }`}
          >

            <img
              src={img}
              className="w-full h-full object-cover"
            />

          </button>

        ))}

      </div>

    </div>
  );
}