"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from "firebase/firestore";
import { CldUploadWidget } from "next-cloudinary";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: number | string;
  description: string;
  imageUrl: string;
  type: string;
  subCategory: string;
  items?: string[]; // Note: If you want to use the list feature, you may need to add it here
  visible?: boolean;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("surprise");
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const subCats = ["men", "women", "children", "father", "mother", "new born"];
  
  const initialFormState: Omit<Product, 'id'> = { 
    title: "", 
    price: "", 
    description: "", 
    imageUrl: "", 
    type: activeTab, 
    subCategory: "men" 
  };
  
  const [product, setProduct] = useState<Omit<Product, 'id'>>(initialFormState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProduct(prev => ({ ...prev, type: activeTab }));
    fetchProducts();
  }, [activeTab]);

  const fetchProducts = async () => {
    const q = query(collection(db, "products"), where("type", "==", activeTab));
    const snapshot = await getDocs(q);
    setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, "products", id));
      fetchProducts();
    }
  };

  const toggleVisibility = async (id: string, currentVisible?: boolean) => {
    const newVisibility = currentVisible === false ? true : false;
    await updateDoc(doc(db, "products", id), { visible: newVisibility });
    fetchProducts();
  };

  const handleEdit = (p: Product) => {
    setProduct({ title: p.title, price: p.price, description: p.description, imageUrl: p.imageUrl, type: p.type, subCategory: p.subCategory });
    setEditingId(p.id);
    setIsAdding(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Admin Dashboard</h1>

      <div className="flex justify-center flex-wrap gap-3 mb-10">
        {["surprise", "flower", "decoration"].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-8 py-3 rounded-[30px] font-bold transition-all border-2 ${
              activeTab === tab ? "bg-[#6ab04c] text-white border-[#6ab04c] shadow-lg scale-105" : "bg-white text-[#6ab04c] border-[#6ab04c] hover:bg-green-50"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!product.imageUrl) return alert("Please upload an image!");
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
        }} className="max-w-xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">{editingId ? "Edit Product" : "Add New Product"}</h2>
          
          <input className="w-full p-4 mb-4 border rounded-2xl text-gray-900 bg-gray-50" placeholder="Title" value={product.title} onChange={(e) => setProduct({...product, title: e.target.value})} required />
          
          <select className="w-full p-4 mb-4 border rounded-2xl text-gray-900 bg-gray-50" value={product.subCategory} onChange={(e) => setProduct({...product, subCategory: e.target.value})}>
             {subCats.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
          </select>
          
          <input className="w-full p-4 mb-4 border rounded-2xl text-gray-900 bg-gray-50" type="number" placeholder="Price" value={product.price} onChange={(e) => setProduct({...product, price: e.target.value})} required />
          
          {/* DESCRIPTION FIELD ADDED */}
          <textarea className="w-full p-4 mb-4 border rounded-2xl text-gray-900 bg-gray-50 h-32" placeholder="Description" value={product.description} onChange={(e) => setProduct({...product, description: e.target.value})} />
          
          <div className="mb-6">
             {product.imageUrl ? <img src={product.imageUrl} className="h-40 w-full object-cover rounded-2xl mb-2" /> : 
               <CldUploadWidget uploadPreset="kido_uploads" onSuccess={(res: any) => setProduct({...product, imageUrl: res.info.secure_url})}>
                 {({ open }) => <button type="button" onClick={() => open()} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold">Upload Image</button>}
               </CldUploadWidget>}
          </div>
          
          <button type="submit" className="w-full py-4 bg-[#6ab04c] text-white rounded-2xl font-bold text-lg">{loading ? "Saving..." : "Save Product"}</button>
          <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="w-full mt-2 py-2 text-gray-500">Cancel</button>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p.id} className={`bg-white rounded-3xl p-4 shadow-sm border ${p.visible === false ? "opacity-50" : ""}`}>
              <div className="relative h-52 mb-4">
                <img src={p.imageUrl} className="w-full h-full object-cover rounded-2xl" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => toggleVisibility(p.id, p.visible)} className="p-2 bg-white rounded-full shadow"><EyeOff size={16} /></button>
                  <button onClick={() => handleEdit(p)} className="p-2 bg-white rounded-full shadow text-blue-600"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 bg-white rounded-full shadow text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="font-bold text-lg">{p.title}</h3>
              <p className="text-sm text-gray-500 mb-2 line-clamp-2">{p.description}</p>
              <p className="text-[#6ab04c] font-black text-xl">{Number(p.price).toLocaleString()} ETB</p>
            </div>
          ))}
          <button onClick={() => setIsAdding(true)} className="rounded-3xl border-4 border-dashed p-8 text-gray-400 flex flex-col items-center justify-center">+ Add New</button>
        </div>
      )}
    </div>
  );
}