"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from "firebase/firestore";
import { CldUploadWidget } from "next-cloudinary";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("surprise");
  const [activeSub, setActiveSub] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initialFormState: Omit<Product, 'id'> = { 
    price: "", 
    description: { am: "", en: "", om: "" }, 
    images: [], 
    type: activeTab, 
    subCategory: "all", 
    flowerCount: "" 
  };
  
  const [product, setProduct] = useState<Omit<Product, 'id'>>(initialFormState);

  const getSubCategories = () => {
    if (activeTab === "flower") return ["all", "wedding", "shimigilina", "birthday", "anniversery", "graduation"];
    if (activeTab === "decoration") return ["all", "birthday", "shimigilina", "nika", "wedding", "babtaizm", "graduation"];
    return ["all", "men", "women", "children", "father", "mother", "new born"];
  };

  useEffect(() => { setActiveSub("all"); }, [activeTab]);

  useEffect(() => {
    setProduct(prev => ({ ...prev, type: activeTab }));
    fetchProducts();
  }, [activeTab, activeSub]);

  const fetchProducts = async () => {
    const q = query(collection(db, "products"), where("type", "==", activeTab));
    const snapshot = await getDocs(q);
    let data = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      images: doc.data().images || (doc.data().imageUrl ? [doc.data().imageUrl] : []) 
    } as Product));

    if (activeSub !== "all") {
      data = data.filter(p => p.subCategory === activeSub);
    }
    setProducts(data);
  };

  const removeImage = (index: number) => {
    setProduct(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, "products", id));
      fetchProducts();
    }
  };

  const toggleVisibility = async (id: string, currentVisible?: boolean) => {
    await updateDoc(doc(db, "products", id), { visible: !currentVisible });
    fetchProducts();
  };

  const handleEdit = (p: Product) => {
    const { id, ...productData } = p;
    setProduct({ ...productData });
    setEditingId(p.id);
    setIsAdding(true);
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col justify-between">
      {/* ===== CLASSIC HEADER ===== */}
      <header className="bg-[var(--brand-light)] border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 h-16 md:h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg md:text-2xl font-black text-[var(--brand-green)] tracking-tight">
              Admin Portal
            </span>
            <span className="text-[10px] md:text-xs text-gray-500 font-medium hidden sm:block">
              Kido Gifts & Flower Shop Management
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isAdding && (
              <button 
                onClick={() => { setProduct(initialFormState); setIsAdding(true); }}
                className="px-4 py-2 bg-[var(--brand-green)] text-white text-xs md:text-sm font-bold rounded-full shadow-md hover:opacity-95 transition-all"
              >
                + Add New
              </button>
            )}
            {isAdding && (
              <button 
                onClick={() => { setIsAdding(false); setEditingId(null); setProduct(initialFormState); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-xs md:text-sm font-bold rounded-full hover:bg-gray-300 transition-all"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="flex-grow p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-green)]">
            Manage Inventory
          </h1>
        </div>

        {/* Compact Tab Switcher */}
        <div className="flex justify-center gap-1.5 md:gap-3 mb-6 overflow-x-auto py-1">
          {[
            { id: "surprise", label: "Surprise" }, 
            { id: "flower", label: "Flowers" }, 
            { id: "decoration", label: "Decoration" }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-4 md:px-6 py-2 rounded-full font-bold transition-all duration-300 border text-xs md:text-base whitespace-nowrap ${
                activeTab === tab.id 
                  ? "bg-[var(--brand-green)] text-white border-[var(--brand-green)] shadow-md" 
                  : "bg-[var(--brand-light)] text-[var(--brand-green)] border-[var(--brand-green)] hover:bg-[var(--soft-green)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Subcategories Horizontal Scroll */}
        <div className="flex justify-start md:justify-center overflow-x-auto gap-2 mb-8 pb-2 scrollbar-none">
          {getSubCategories().map(sub => (
            <button 
              key={sub} 
              onClick={() => setActiveSub(sub)} 
              className={`px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                activeSub === sub 
                  ? "bg-[var(--text-dark)] text-white shadow-sm" 
                  : "bg-[var(--brand-light)] text-gray-500 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {sub.toUpperCase()}
            </button>
          ))}
        </div>

        {isAdding ? (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (product.images.length === 0) return alert("Please upload at least one image!");
            setLoading(true);
            
            const productData = { ...product, price: Number(product.price) };
            
            if (editingId) {
              await updateDoc(doc(db, "products", editingId), productData);
            } else {
              await addDoc(collection(db, "products"), { ...productData, visible: true, createdAt: serverTimestamp() });
            }
            setProduct(initialFormState);
            setEditingId(null);
            setIsAdding(false);
            fetchProducts();
            setLoading(false);
          }} className="max-w-xl mx-auto bg-[var(--brand-light)] p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-[var(--text-dark)]">
              {editingId ? "Edit" : "Add"} {activeTab.toUpperCase()}
            </h2>
            
            <label className="block text-xs font-bold text-gray-500 mb-1">Subcategory</label>
            <select 
              className="w-full p-3.5 mb-4 border-2 border-gray-200 rounded-2xl bg-[var(--brand-light)] text-[var(--text-dark)] font-medium focus:border-[var(--brand-green)] outline-none text-sm" 
              value={product.subCategory} 
              onChange={(e) => setProduct({...product, subCategory: e.target.value})}
            >
              {getSubCategories().filter(c => c !== "all").map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
            </select>
            
            <label className="block text-xs font-bold text-gray-500 mb-1">Price (ETB)</label>
            <input 
              className="w-full p-3.5 mb-4 border-2 border-gray-200 rounded-2xl bg-[var(--brand-light)] text-[var(--text-dark)] font-medium placeholder-gray-400 focus:border-[var(--brand-green)] outline-none text-sm" 
              type="number" 
              placeholder="e.g. 1500" 
              value={product.price} 
              onChange={(e) => setProduct({...product, price: e.target.value})} 
              required 
            />

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-bold text-gray-500 mb-1">Descriptions (Multi-language)</label>
              {['am', 'en', 'om'].map((lang) => (
                <textarea 
                  key={lang}
                  className="w-full p-3 border-2 border-gray-200 rounded-2xl bg-[var(--brand-light)] text-[var(--text-dark)] font-medium placeholder-gray-400 h-20 focus:border-[var(--brand-green)] outline-none text-xs md:text-sm" 
                  placeholder={`Description (${lang.toUpperCase()})`} 
                  value={product.description[lang as keyof typeof product.description]} 
                  onChange={(e) => setProduct({...product, description: {...product.description, [lang]: e.target.value}})} 
                  required={lang === 'am'}
                />
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-[var(--text-dark)] mb-2">
                Images ({product.images.length}/{activeTab === "surprise" ? "1" : "3"})
              </label>

              <div className="flex gap-2 mb-2 flex-wrap">
                {product.images.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 md:w-20 md:h-20">
                    <img src={url} className="w-full h-full object-cover rounded-xl shadow-sm" />
                    <button 
                      type="button" 
                      onClick={() => removeImage(i)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow"
                    >✕</button>
                  </div>
                ))}
              </div>

              {(activeTab === "surprise" ? product.images.length < 1 : product.images.length < 3) && (
                <CldUploadWidget 
                  uploadPreset="kido_uploads" 
                  onSuccess={(res: any) => {
                    setProduct(prev => ({ ...prev, images: [...prev.images, res.info.secure_url] }));
                    // Force body scroll unlock and restore window interaction after modal closes
                    document.body.style.overflow = "auto";
                    document.body.style.position = "static";
                  }}
                >
                  {({ open }) => (
                    <button 
                      type="button" 
                      onClick={() => {
                        // Ensure body is ready for modal
                        open();
                      }} 
                      className="w-full py-3 bg-[var(--text-dark)] text-[var(--brand-light)] rounded-2xl font-bold text-xs md:text-sm shadow-md hover:bg-black transition-all"
                    >
                      Upload Image {activeTab === "surprise" ? "" : product.images.length + 1}
                    </button>
                  )}
                </CldUploadWidget>
              )}
            </div>

            <button type="submit" className="w-full py-3.5 bg-[var(--brand-green)] text-white rounded-2xl font-bold text-sm md:text-base shadow-lg hover:opacity-95 transition-all">
              {loading ? "Saving..." : "Save Product"}
            </button>
            <button 
              type="button" 
              onClick={() => { setIsAdding(false); setEditingId(null); setProduct(initialFormState); }} 
              className="w-full mt-2 py-2 text-gray-500 text-xs font-semibold hover:text-black"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, index) => (
              <div key={p.id} className={`bg-[var(--brand-light)] rounded-3xl p-3 md:p-4 shadow-sm border border-gray-100 flex flex-row items-stretch gap-4 transition-all ${p.visible === false ? "opacity-50" : ""}`}>
                {/* Image Section */}
                <div className="w-[50%] aspect-[1/1] overflow-hidden rounded-2xl flex-shrink-0 relative">
                  <img src={p.images[0]} className="w-full h-full object-cover" alt={`Package ${index + 1}`} />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
                    <span className="text-[10px] text-white font-bold uppercase">{p.subCategory}</span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="w-[50%] flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">
                        Pkg {index + 1}
                      </span>
                    </div>

                    <p className="text-lg md:text-xl font-black text-[var(--brand-green)] mb-1">
                      {Number(p.price).toLocaleString()} ETB
                    </p>

                    <p className="text-[11px] text-gray-500 line-clamp-3 italic mb-2">
                      {p.description.en || p.description.am}
                    </p>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-gray-100">
                    <button 
                      onClick={() => toggleVisibility(p.id, p.visible)} 
                      className={`p-2 rounded-xl text-xs flex items-center justify-center transition-colors ${p.visible === false ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                      title="Toggle Visibility"
                    >
                      {p.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button 
                      onClick={() => handleEdit(p)} 
                      className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Edit Product"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)} 
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== CLASSIC FOOTER ===== */}
      <footer className="bg-[var(--text-dark)] text-white mt-12 py-8 px-4 md:px-6 lg:px-10 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <h3 className="text-base font-bold text-[var(--brand-gold)]">
              Kido Admin Panel
            </h3>
            <p className="text-xs text-gray-400">
              Secure catalog and order tracking system.
            </p>
          </div>
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
            © {new Date().getFullYear()} Kido Gifts & Flowers. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}