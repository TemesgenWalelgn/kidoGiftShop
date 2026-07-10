"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Product {
  id: string;
  title: string;
  price: number | string;
  description: string;
  imageUrl: string;
  type: string;
  subCategory: string;
  items?: string[];
  visible?: boolean;
}

export default function UserPage() {
  const [activeTab, setActiveTab] = useState("surprise");
  const [activeSub, setActiveSub] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const subCats = ["all", "men", "women", "children", "father", "mother", "new born"];

  useEffect(() => { setActiveSub("all"); }, [activeTab]);

  useEffect(() => {
  // 1. Clear products immediately to prevent the "flicker" of old data
  setProducts([]); 
  setActiveSub("all");
}, [activeTab]);

useEffect(() => {
  // 2. Also clear when sub-category changes
  setProducts([]); 
  
  let q = query(collection(db, "products"), where("type", "==", activeTab));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    data = data.filter(p => p.visible !== false);
    
    if (activeSub !== "all") data = data.filter(p => p.subCategory === activeSub);
    
    setProducts(data);
  });

  return () => unsubscribe();
}, [activeTab, activeSub]);

  const handleOrder = (product: Product) => {
    const message = `Hi! I want to order: ${product.title} - ${product.price} ETB`;
    window.open(`https://wa.me/251911000000?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-6 lg:p-10">
      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#6ab04c] to-[#2e7d32]">
          Our Collection
        </h1>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {["surprise", "flower", "decoration"].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-6 py-2.5 rounded-full font-bold transition-all duration-300 border-2 text-sm md:text-base ${
              activeTab === tab 
                ? "bg-[#6ab04c] text-white border-[#6ab04c] shadow-lg scale-105" 
                : "bg-white text-[#6ab04c] border-[#6ab04c] hover:bg-green-50"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* SUB-NAVIGATION */}
      {activeTab === "surprise" && (
        <div className="flex justify-center flex-wrap gap-2 mb-8">
          {subCats.map(sub => (
            <button 
              key={sub} 
              onClick={() => setActiveSub(sub)} 
              className={`px-4 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activeSub === sub 
                  ? "bg-black text-white shadow-md" 
                  : "bg-white text-gray-500 hover:bg-gray-100"
              }`}
            >
              {sub.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* CATALOG GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-3xl p-3 md:p-4 shadow-sm border border-gray-100 flex flex-row items-stretch gap-4 hover:shadow-md transition-shadow">
            
            <div 
              onClick={() => setSelectedProduct(p)}
              className="w-[60%] aspect-[3/3] overflow-hidden rounded-2xl flex-shrink-0 cursor-pointer group"
            >
              <img 
                src={p.imageUrl} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                alt={p.title} 
              />
            </div>

            <div className="w-1/2 flex flex-col justify-between py-1">
              <div>
                <h3 className="text-sm md:text-lg font-bold text-gray-800 line-clamp-2 mb-1">{p.title}</h3>
                <p className="text-sm md:text-lg font-black text-[#6ab04c] mb-2">{p.price} ETB</p>
                
                {p.description && (
                  <div className="text-[10px] md:text-xs text-gray-500 mb-2 leading-relaxed">
                    <p className="line-clamp-3">{p.description}</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleOrder(p)}
                className="w-full py-2 bg-gradient-to-r from-[#6ab04c] to-[#2e7d32] text-white text-xs md:text-sm font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-sm"
              >
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" 
          onClick={() => setSelectedProduct(null)}
        >
          <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute -top-10 right-0 text-white font-bold hover:text-gray-300"
            >
              Close ✕
            </button>
            <img src={selectedProduct.imageUrl} className="w-full h-auto rounded-2xl shadow-2xl" alt="Full view" />
          </div>
        </div>
      )}
    </div>
  );
}