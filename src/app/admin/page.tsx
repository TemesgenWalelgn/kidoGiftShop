"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase"; // Added auth
import { onAuthStateChanged, signOut } from "firebase/auth"; // Added Firebase Auth functions
import { useRouter } from "next/navigation"; // Added router for redirects
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  setDoc
} from "firebase/firestore";
import { CldUploadWidget } from "next-cloudinary";
import { Pencil, Trash2, Eye, EyeOff, Settings } from "lucide-react";

interface Product {
  id: string;
  price: number | string;
  description: { am: string; en: string; om: string };
  images: string[];
  type: string;
  subCategory: string;
  flowerCount?: string | number;
  visible?: boolean;
  createdAt?: any;
}

interface TempSubCategory {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  name: { am: string; en: string; om: string };
  createdAt?: any;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState("surprise");
  const [activeSub, setActiveSub] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Temporary Subcategory Configuration State
  const [tempSubCategories, setTempSubCategories] = useState<TempSubCategory[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);

  // ===== EVENT THEME STATE (Hydration-Safe) =====
  const [eventTheme, setEventTheme] = useState("none");
  const [eventEnabled, setEventEnabled] = useState(false);
  const [eventAnimation, setEventAnimation] = useState(true);
  const [eventParticles, setEventParticles] = useState(false);
  const [savingEventTheme, setSavingEventTheme] = useState(false);
  const [showEventPanel, setShowEventPanel] = useState(false);

  // ===== AUTHENTICATION CHECK =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push("/admin/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Sync cache immediately on client mount
  useEffect(() => {
    const cachedTheme = localStorage.getItem("kido_theme_name");
    const cachedEnabled = localStorage.getItem("kido_theme_enabled");
    if (cachedTheme) setEventTheme(cachedTheme);
    if (cachedEnabled !== null) setEventEnabled(cachedEnabled === "true");
  }, []);

  // ===== PACKAGE / SUBCATEGORY MANAGEMENT =====
  const [subCategoryOrder, setSubCategoryOrder] = useState<Record<string, string[]>>({});
  const [draggedSub, setDraggedSub] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("newest");
  const [copyingProduct, setCopyingProduct] = useState<Product | null>(null);
  const [copyTargetSub, setCopyTargetSub] = useState("");

  const [tempForm, setTempForm] = useState({
    type: "surprise",
    enabled: true,
    name: { am: "", en: "", om: "" }
  });

  const getInitialFormState = (): Omit<Product, 'id'> => ({
    price: "",
    description: { am: "", en: "", om: "" },
    images: [],
    type: activeTab,
    subCategory: activeSub !== "all" ? activeSub : "",
    flowerCount: ""
  });

  const [product, setProduct] = useState<Omit<Product, 'id'>>(getInitialFormState());

  // Listen to temporary subcategories in real time
  useEffect(() => {
    if (!isAuthenticated) return; // Wait until authenticated
    const q = query(collection(db, "temporarySubCategories"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      } as TempSubCategory));

      data.sort((a, b) => {
        if ((a.order ?? 0) !== (b.order ?? 0)) {
          return (a.order ?? 0) - (b.order ?? 0);
        }

        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return aTime - bTime;
      });

      setTempSubCategories(data);
    }, (error) => {
      console.error("Error loading temporary subcategories:", error);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // ===== LISTEN TO EVENT THEME (SYNC CACHE) =====
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = onSnapshot(
      doc(db, "settings", "eventTheme"),
      (snapshot) => {
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

        // Keep local cache synced with Firebase
        if (typeof window !== "undefined") {
          localStorage.setItem("kido_theme_name", data.event || "none");
          localStorage.setItem("kido_theme_enabled", data.enabled === true ? "true" : "false");
        }
      },
      (error) => {
        console.error("Error loading event theme:", error);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // ===== LOAD SUBCATEGORY ORDER =====
  useEffect(() => {
    if (!isAuthenticated) return;
    return onSnapshot(
      doc(db, "settings", "subCategoryOrder"),
      (snapshot) => {
        if (snapshot.exists()) {
          setSubCategoryOrder(snapshot.data().orders || {});
        }
      },
      (error) => console.error("Error loading subcategory order:", error)
    );
  }, [isAuthenticated]);

  const getDefaultSubCategories = (tab: string) => {
    if (tab === "flower") {
      return ["all", "wedding", "shimigilina", "birthday", "anniversery", "graduation"];
    }

    if (tab === "decoration") {
      return ["all", "birthday", "shimigilina", "nika", "wedding", "babtaizm", "graduation"];
    }

    return ["all", "men", "women", "children", "father", "mother", "new born"];
  };

  const getSubCategoriesForTab = (tab: string) => {
    const normal = getDefaultSubCategories(tab);
    const temporary = tempSubCategories
      .filter((item) => item.type === tab && item.enabled)
      .map((item) => item.id);

    const available = [...normal, ...temporary];
    const saved = subCategoryOrder[tab] || [];

    const ordered = [
      ...saved.filter((id) => available.includes(id)),
      ...available.filter((id) => !saved.includes(id))
    ];

    return ordered;
  };

  const saveSubCategoryOrder = async (tab: string, order: string[]) => {
    try {
      const nextOrders = { ...subCategoryOrder, [tab]: order };
      setSubCategoryOrder(nextOrders);
      await setDoc(
        doc(db, "settings", "subCategoryOrder"),
        { orders: nextOrders },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving subcategory order:", error);
      alert("Failed to save subcategory order.");
    }
  };

  const handleSubDrop = async (targetSub: string) => {
    if (!draggedSub || draggedSub === targetSub) {
      setDraggedSub(null);
      return;
    }

    const current = getSubCategoriesForTab(activeTab);
    const from = current.indexOf(draggedSub);
    const to = current.indexOf(targetSub);

    if (from < 0 || to < 0) {
      setDraggedSub(null);
      return;
    }

    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, draggedSub);

    setDraggedSub(null);
    await saveSubCategoryOrder(activeTab, next);
  };

  const sortProductList = (items: Product[]) => {
    return [...items].sort((a, b) => {
      if (sortOption === "priceLow") {
        return Number(a.price) - Number(b.price);
      }

      if (sortOption === "priceHigh") {
        return Number(b.price) - Number(a.price);
      }

      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;

      return sortOption === "oldest" ? aTime - bTime : bTime - aTime;
    });
  };

  // ===== DUPLICATE PACKAGE =====
  const duplicateProduct = async () => {
    if (!copyingProduct || !copyTargetSub) return;

    if (copyTargetSub === copyingProduct.subCategory) {
      alert("The package is already in this subcategory.");
      return;
    }

    try {
      let targetTabType = copyingProduct.type;
      const targetTempSub = tempSubCategories.find((item) => item.id === copyTargetSub);
      if (targetTempSub) {
        targetTabType = targetTempSub.type;
      } else {
        const flowerDefaults = getDefaultSubCategories("flower");
        const decoDefaults = getDefaultSubCategories("decoration");
        if (flowerDefaults.includes(copyTargetSub)) targetTabType = "flower";
        else if (decoDefaults.includes(copyTargetSub)) targetTabType = "decoration";
        else targetTabType = "surprise";
      }

      const snapshot = await getDocs(
        query(
          collection(db, "products"),
          where("type", "==", targetTabType)
        )
      );

      const duplicateExists = snapshot.docs.some((item) => {
        const data = item.data();
        return (
          data.subCategory === copyTargetSub &&
          Number(data.price) === Number(copyingProduct.price) &&
          JSON.stringify(data.description || {}) ===
            JSON.stringify(copyingProduct.description || {}) &&
          JSON.stringify(data.images || []) ===
            JSON.stringify(copyingProduct.images || [])
        );
      });

      if (duplicateExists) {
        alert("A similar package already exists in the destination subcategory.");
        return;
      }

      const { id, ...productWithoutId } = copyingProduct;

      await addDoc(collection(db, "products"), {
        ...productWithoutId,
        type: targetTabType,
        subCategory: copyTargetSub,
        createdAt: serverTimestamp()
      });

      const destinationTab = targetTabType;
      const destinationSub = copyTargetSub;

      setCopyingProduct(null);
      setCopyTargetSub("");

      setActiveTab(destinationTab);
      setActiveSub(destinationSub);
      fetchProducts();
    } catch (error) {
      console.error("Error duplicating package:", error);
      alert("Failed to duplicate package.");
    }
  };

  // ===== SAVE EVENT THEME =====
  const saveEventTheme = async () => {
    setSavingEventTheme(true);

    try {
      await setDoc(doc(db, "settings", "eventTheme"), {
        event: eventTheme,
        enabled: eventEnabled,
        animation: eventAnimation,
        particles: eventParticles
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("kido_theme_name", eventTheme);
        localStorage.setItem("kido_theme_enabled", eventEnabled ? "true" : "false");
      }

    } catch (error) {
      console.error("Error saving event theme:", error);
      alert("Failed to save event theme.");
    } finally {
      setSavingEventTheme(false);
    }
  };
  
  const resetTempForm = () => {
    setEditingTempId(null);
    setTempForm({
      type: activeTab,
      enabled: true,
      name: { am: "", en: "", om: "" }
    });
  };

  const openTempConfigForEdit = (temp: TempSubCategory) => {
    setEditingTempId(temp.id);
    setTempForm({
      type: temp.type,
      enabled: temp.enabled,
      name: {
        am: temp.name?.am || "",
        en: temp.name?.en || "",
        om: temp.name?.om || ""
      }
    });
  };

  const saveTempSubCategory = async () => {
    if (
      !tempForm.name.am.trim() &&
      !tempForm.name.en.trim() &&
      !tempForm.name.om.trim()
    ) {
      alert("Please enter at least one name.");
      return;
    }

    try {
      if (editingTempId) {
        await updateDoc(doc(db, "temporarySubCategories", editingTempId), {
          type: tempForm.type,
          enabled: tempForm.enabled,
          name: tempForm.name
        });
      } else {
        const sameType = tempSubCategories.filter(
          (item) => item.type === tempForm.type
        );

        const nextOrder =
          sameType.length > 0
            ? Math.max(...sameType.map((item) => item.order ?? 0)) + 1
            : 1;

        await addDoc(collection(db, "temporarySubCategories"), {
          type: tempForm.type,
          enabled: tempForm.enabled,
          order: nextOrder,
          name: tempForm.name,
          createdAt: serverTimestamp()
        });
      }

      resetTempForm();
    } catch (error) {
      console.error("Error saving temporary subcategory:", error);
      alert("Failed to save temporary subcategory.");
    }
  };

  const toggleTempSubCategory = async (temp: TempSubCategory) => {
    try {
      await updateDoc(doc(db, "temporarySubCategories", temp.id), {
        enabled: !temp.enabled
      });
    } catch (error) {
      console.error("Error toggling temporary subcategory:", error);
      alert("Failed to change visibility.");
    }
  };

  const deleteTempSubCategory = async (id: string) => {
    if (
      !confirm(
        "Delete this temporary subcategory? Products assigned to it will remain in Firebase but will no longer appear under a menu category."
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "temporarySubCategories", id));
    } catch (error) {
      console.error("Error deleting temporary subcategory:", error);
      alert("Failed to delete temporary subcategory.");
    }
  };

  const getTempSubCategoriesForTab = (tab: string) => {
    return tempSubCategories
      .filter((item) => item.type === tab)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  const getSubCategories = () => getSubCategoriesForTab(activeTab);

  useEffect(() => {
    setActiveSub("all");
  }, [activeTab]);

  useEffect(() => {
    if (activeSub === "all") return;

    const isTemporary = tempSubCategories.some(
      (item) => item.id === activeSub
    );

    if (
      isTemporary &&
      !tempSubCategories.find((item) => item.id === activeSub)?.enabled
    ) {
      setActiveSub("all");
    }
  }, [tempSubCategories, activeSub]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setProduct((prev) => ({ ...prev, type: activeTab }));
    fetchProducts();
  }, [activeTab, activeSub, isAuthenticated]);

  useEffect(() => {
    setProducts((prev) => sortProductList(prev));
  }, [sortOption]);

  const fetchProducts = async () => {
    const q = query(
      collection(db, "products"),
      where("type", "==", activeTab)
    );

    const snapshot = await getDocs(q);

    let data = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      images:
        docSnap.data().images ||
        (docSnap.data().imageUrl ? [docSnap.data().imageUrl] : [])
    } as Product));

    // Remove duplicate products by Firestore document ID safely
    data = Array.from(
      new Map(data.map((item) => [item.id, item])).values()
    );

    if (activeSub !== "all") {
      data = data.filter((p) => p.subCategory === activeSub);
    }

    setProducts(sortProductList(data));
  };

  const removeImage = (index: number) => {
    setProduct((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        fetchProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product. Please check your connection.");
      }
    }
  };

  const toggleVisibility = async (
    id: string,
    currentVisible?: boolean
  ) => {
    await updateDoc(doc(db, "products", id), {
      visible: !currentVisible
    });

    fetchProducts();
  };

  const handleEdit = (p: Product) => {
    const { id, ...productData } = p;
    setProduct({ ...productData });
    setEditingId(p.id);
    setIsAdding(true);
  };

  // Prevent rendering the dashboard interface until auth check clears
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--brand-bg)]">
        <div className="animate-pulse text-[var(--brand-green)] font-bold text-lg">Verifying Access...</div>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className={`min-h-screen ${
        eventEnabled && eventTheme !== "none"
          ? `theme-${eventTheme}`
          : ""
      } theme-page flex flex-col justify-between`}
    >
      {eventEnabled && eventParticles && (
        <div className="event-particles">
          {/* This loop creates 15 falling emojis */}
          {[...Array(15)].map((_, i) => (
            <span key={i}></span>
          ))}
        </div>
      )}

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

            <button
              onClick={() => setShowEventPanel(!showEventPanel)}
              className="px-3.5 py-2 bg-gray-100 text-gray-700 text-xs md:text-sm font-bold rounded-full hover:bg-gray-200 transition-all"
            >
              🎨 <span className="hidden sm:inline">Event Theme</span>
            </button>

            <button
              onClick={() => {
                resetTempForm();
                setShowConfigModal(true);
              }}
              className="px-3.5 py-2 bg-gray-100 text-gray-700 text-xs md:text-sm font-bold rounded-full hover:bg-gray-200 transition-all flex items-center gap-1.5"
              title="Configure Temporary Packages"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Temp Packages Setup</span>
            </button>

            {!isAdding && (
              <button
                onClick={() => {
                  setProduct(getInitialFormState());
                  setIsAdding(true);
                }}
                className="px-4 py-2 bg-[var(--brand-green)] text-white text-xs md:text-sm font-bold rounded-full shadow-md hover:opacity-95 transition-all"
              >
                + Add New
              </button>
            )}

            {isAdding && (
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setProduct(getInitialFormState());
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-xs md:text-sm font-bold rounded-full hover:bg-gray-300 transition-all"
              >
                Back to Dashboard
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={() => signOut(auth)}
              className="px-4 py-2 bg-red-50 text-red-600 text-xs md:text-sm font-bold rounded-full hover:bg-red-100 transition-all ml-1 md:ml-2"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* ===== EVENT THEME PANEL ===== */}
      {showEventPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--brand-light)] w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black text-[var(--text-dark)]">
                  🎨 Event Theme
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Control the seasonal design on both pages.
                </p>
              </div>

              <button
                onClick={() => setShowEventPanel(false)}
                className="text-gray-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                <div>
                  <p className="text-sm font-bold text-gray-700">
                    Event Theme
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Turn seasonal design on or off
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={eventEnabled}
                  onChange={(e) =>
                    setEventEnabled(e.target.checked)
                  }
                  className="w-5 h-5 accent-[var(--brand-green)]"
                />
              </label>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Choose Event
                </label>

                <select
                  value={eventTheme}
                  onChange={(e) => setEventTheme(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white text-gray-800 outline-none"
                >
                  <option value="none">
                    Normal KIDO Theme
                  </option>
                  <option value="newyear">
                    🇪🇹 Ethiopian New Year
                  </option>
                  <option value="valentine">
                    ❤️ Valentine's Day
                  </option>
                  <option value="christmas">
                    🎄 Christmas
                  </option>
                  <option value="muslim">
                    ☪️ Muslim Holy Day
                  </option>
                  <option value="fathers">
                    👔 Father's Day
                  </option>
                  <option value="mothers">
                    🌷 Mother's Day
                  </option>
                </select>
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                <span className="text-sm font-bold text-gray-700">
                  ✨ Animations
                </span>

                <input
                  type="checkbox"
                  checked={eventAnimation}
                  onChange={(e) =>
                    setEventAnimation(e.target.checked)
                  }
                  className="w-5 h-5 accent-[var(--brand-green)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                <span className="text-sm font-bold text-gray-700">
                  ✨ Background Effects
                </span>

                <input
                  type="checkbox"
                  checked={eventParticles}
                  onChange={(e) =>
                    setEventParticles(e.target.checked)
                  }
                  className="w-5 h-5 accent-[var(--brand-green)]"
                />
              </label>

              <button
                onClick={saveEventTheme}
                disabled={savingEventTheme}
                className="w-full py-3 bg-[var(--brand-green)] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-all"
              >
                {savingEventTheme
                  ? "Saving..."
                  : "Save Event Theme"}
              </button>
                  
            </div>
          </div>
        </div>
      )}

      {/* ===== TEMPORARY SUBCATEGORY CONFIGURATION MODAL ===== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--brand-light)] w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-black text-[var(--text-dark)]">
                  Temporary Packages
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Create as many temporary subcategories as you need.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowConfigModal(false);
                  resetTempForm();
                }}
                className="text-gray-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 mb-6">

              <h3 className="font-extrabold text-sm text-[var(--brand-green)] mb-4">
                {editingTempId
                  ? "Edit Temporary Subcategory"
                  : "Create New Temporary Subcategory"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">

                <select
                  value={tempForm.type}
                  onChange={(e) =>
                    setTempForm((prev) => ({
                      ...prev,
                      type: e.target.value
                    }))
                  }
                  className="p-3 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 outline-none font-medium"
                >
                  <option value="surprise">Surprise</option>
                  <option value="flower">Flowers</option>
                  <option value="decoration">Decoration</option>
                </select>

                <input
                  type="text"
                  placeholder="Name (AM)"
                  value={tempForm.name.am}
                  onChange={(e) =>
                    setTempForm((prev) => ({
                      ...prev,
                      name: {
                        ...prev.name,
                        am: e.target.value
                      }
                    }))
                  }
                  className="p-3 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 outline-none font-medium"
                />

                <input
                  type="text"
                  placeholder="Name (EN)"
                  value={tempForm.name.en}
                  onChange={(e) =>
                    setTempForm((prev) => ({
                      ...prev,
                      name: {
                        ...prev.name,
                        en: e.target.value
                      }
                    }))
                  }
                  className="p-3 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 outline-none font-medium"
                />

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                <input
                  type="text"
                  placeholder="Name (OM)"
                  value={tempForm.name.om}
                  onChange={(e) =>
                    setTempForm((prev) => ({
                      ...prev,
                      name: {
                        ...prev.name,
                        om: e.target.value
                      }
                    }))
                  }
                  className="p-3 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 outline-none font-medium"
                />

                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempForm.enabled}
                    onChange={(e) =>
                      setTempForm((prev) => ({
                        ...prev,
                        enabled: e.target.checked
                      }))
                    }
                    className="w-4 h-4 accent-[var(--brand-green)]"
                  />

                  <span className="text-xs font-bold text-gray-700">
                    Visible to customers
                  </span>
                </label>

              </div>

              <div className="flex gap-2 mt-4">

                <button
                  onClick={saveTempSubCategory}
                  className="flex-1 py-3 bg-[var(--brand-green)] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-all"
                >
                  {editingTempId
                    ? "Update"
                    : "Add Temporary Package"}
                </button>

                {editingTempId && (
                  <button
                    onClick={resetTempForm}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all"
                  >
                    New
                  </button>
                )}

              </div>
            </div>

            <div className="space-y-3">

              <h3 className="font-extrabold text-sm text-gray-700">
                Existing Temporary Categories
              </h3>

              {tempSubCategories.length === 0 ? (
                <div className="p-5 text-center rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
                  No temporary subcategories created yet.
                </div>
              ) : (
                tempSubCategories.map((temp, index) => (
                  <div
                    key={`${temp.id}-${index}`}
                    className="p-4 rounded-2xl border border-gray-200 bg-white flex flex-col md:flex-row md:items-center gap-3 justify-between"
                  >

                    <div className="min-w-0">

                      <div className="flex items-center gap-2 flex-wrap">

                        <span className="font-black text-sm text-[var(--brand-green)]">
                          {temp.name.en ||
                            temp.name.am ||
                            temp.name.om ||
                            "Unnamed"}
                        </span>

                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          {temp.type}
                        </span>

                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                            temp.enabled
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {temp.enabled ? "Visible" : "Hidden"}
                        </span>

                      </div>

                      <p className="text-[11px] text-gray-500 mt-1">
                        AM: {temp.name.am || "-"} · OM:{" "}
                        {temp.name.om || "-"}
                      </p>

                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">

                      <button
                        onClick={() =>
                          toggleTempSubCategory(temp)
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-bold ${
                          temp.enabled
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {temp.enabled ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() =>
                          openTempConfigForEdit(temp)
                        }
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={() =>
                          deleteTempSubCategory(temp.id)
                        }
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>

                    </div>
                  </div>
                ))
              )}

            </div>
          </div>
        </div>
      )}

      {/* ===== DUPLICATE PACKAGE MODAL ===== */}
      {copyingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--brand-light)] w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black text-[var(--text-dark)]">
                  Duplicate Package
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Copy this package to another subcategory.
                </p>
              </div>
              <button
                onClick={() => {
                  setCopyingProduct(null);
                  setCopyTargetSub("");
                }}
                className="text-gray-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 mb-4">
              <p className="text-xs font-bold text-gray-500">Current package</p>
              <p className="text-sm font-black text-[var(--brand-green)] mt-1">
                {Number(copyingProduct.price).toLocaleString()} ETB
              </p>
            </div>

            <label className="block text-xs font-bold text-gray-500 mb-1">
              Copy to subcategory
            </label>

            <select
              value={copyTargetSub}
              onChange={(e) => setCopyTargetSub(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white text-gray-800 outline-none mb-4"
            >
              <option value="">Select destination</option>
              {getSubCategories()
                .filter((cat) => cat !== "all" && cat !== copyingProduct.subCategory)
                .map((cat, index) => {
                  const temp = tempSubCategories.find((item) => item.id === cat);
                  return (
                    <option key={`${cat}-${index}`} value={cat}>
                      {temp
                        ? (temp.name.en || temp.name.am || temp.name.om || "Special").toUpperCase()
                        : cat.toUpperCase()}
                    </option>
                  );
                })}
            </select>

            <button
              onClick={duplicateProduct}
              disabled={!copyTargetSub}
              className="w-full py-3 bg-[var(--brand-green)] text-white rounded-xl font-bold text-sm disabled:opacity-40"
            >
              Duplicate Package
            </button>
          </div>
        </div>
      )}

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
          ].map((tab, index) => (
            <button
              key={`${tab.id}-${index}`}
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-3 mb-8">
          <div className="flex justify-start md:justify-center overflow-x-auto gap-2 pb-2 scrollbar-none">
            {getSubCategories().map((sub, index) => {
              const temp = tempSubCategories.find((item) => item.id === sub);
              const isTemp = !!temp;

              return (
                <button
                  key={`${sub}-${index}`}
                  draggable
                  onDragStart={() => setDraggedSub(sub)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleSubDrop(sub)}
                  onClick={() => setActiveSub(sub)}
                  title="Drag to change position"
                  className={`px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 cursor-grab active:cursor-grabbing ${
                    activeSub === sub
                      ? "bg-[var(--text-dark)] text-white shadow-sm"
                      : isTemp
                      ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                      : "bg-[var(--brand-light)] text-gray-500 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {isTemp
                    ? (temp?.name?.en || temp?.name?.am || "Special").toUpperCase()
                    : sub.toUpperCase()}
                </button>
              );
            })}
          </div>

          <select
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setProducts((prev) => sortProductList(prev));
            }}
            className="self-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 outline-none"
            title="Sort package list"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priceLow">Price: Low to High</option>
            <option value="priceHigh">Price: High to Low</option>
          </select>
        </div>

        {isAdding ? (

          <form
            onSubmit={async (e) => {
              e.preventDefault();

              if (product.images.length === 0) {
                return alert("Please upload at least one image!");
              }

              setLoading(true);

              const productData = {
                ...product,
                price: Number(product.price)
              };

              if (editingId) {
                await updateDoc(
                  doc(db, "products", editingId),
                  productData
                );
              } else {
                await addDoc(collection(db, "products"), {
                  ...productData,
                  visible: true,
                  createdAt: serverTimestamp()
                });
              }

              setProduct(getInitialFormState());
              setEditingId(null);
              setIsAdding(false);
              fetchProducts();
              setLoading(false);
            }}
            className="max-w-xl mx-auto bg-[var(--brand-light)] p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100"
          >

            <h2 className="text-xl md:text-2xl font-bold mb-6 text-[var(--text-dark)]">
              {editingId ? "Edit" : "Add"}{" "}
              {activeTab.toUpperCase()}
            </h2>

            <label className="block text-xs font-bold text-gray-500 mb-1">
              Subcategory
            </label>

            <select
              className="w-full p-3.5 mb-4 border-2 border-gray-200 rounded-2xl bg-[var(--brand-light)] text-[var(--text-dark)] font-medium focus:border-[var(--brand-green)] outline-none text-sm"
              value={product.subCategory || ""}
              onChange={(e) =>
                setProduct({
                  ...product,
                  subCategory: e.target.value
                })
              }
              required
            >
              <option value="" disabled>
                Select Subcategory
              </option>

              {getSubCategories()
                .filter((c) => c !== "all")
                .map((cat, index) => {
                  const temp = tempSubCategories.find(
                    (item) => item.id === cat
                  );

                  return (
                    <option key={`${cat}-${index}`} value={cat}>
                      {temp
                        ? (
                            temp.name.en ||
                            temp.name.am ||
                            temp.name.om ||
                            "Special"
                          ).toUpperCase()
                        : cat.toUpperCase()}
                    </option>
                  );
                })}
            </select>

            <label className="block text-xs font-bold text-gray-500 mb-1">
              Price (ETB)
            </label>

            <input
              className="w-full p-3.5 mb-4 border-2 border-gray-200 rounded-2xl bg-[var(--brand-light)] text-[var(--text-dark)] font-medium placeholder-gray-400 focus:border-[var(--brand-green)] outline-none text-sm"
              type="number"
              placeholder="e.g. 1500"
              value={product.price}
              onChange={(e) =>
                setProduct({
                  ...product,
                  price: e.target.value
                })
              }
              required
            />

            <div className="space-y-3 mb-4">

              <label className="block text-xs font-bold text-gray-500 mb-1">
                Descriptions (Multi-language)
              </label>

              {["am", "en", "om"].map((lang) => (
                <textarea
                  key={lang}
                  className="w-full p-3 border-2 border-gray-200 rounded-2xl bg-[var(--brand-light)] text-[var(--text-dark)] font-medium placeholder-gray-400 h-20 focus:border-[var(--brand-green)] outline-none text-xs md:text-sm"
                  placeholder={`Description (${lang.toUpperCase()})`}
                  value={
                    product.description[
                      lang as keyof typeof product.description
                    ]
                  }
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      description: {
                        ...product.description,
                        [lang]: e.target.value
                      }
                    })
                  }
                  required={lang === "am"}
                />
              ))}

            </div>

            <div className="mb-6">

              <label className="block text-xs font-bold text-[var(--text-dark)] mb-2">
                Images (
                {product.images.length}/
                {activeTab === "surprise" ? "1" : "3"})
              </label>

              <div className="flex gap-2 mb-2 flex-wrap">

                {product.images.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative w-16 h-16 md:w-20 md:h-20"
                  >
                    <img
                      src={url}
                      className="w-full h-full object-cover rounded-xl shadow-sm"
                    />

                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}

              </div>

              {(activeTab === "surprise"
                ? product.images.length < 1
                : product.images.length < 3) && (

                <CldUploadWidget
                  uploadPreset="kido_uploads"
                  onSuccess={(res: any) => {
                    setProduct((prev) => ({
                      ...prev,
                      images: [
                        ...prev.images,
                        res.info.secure_url
                      ]
                    }));

                    document.body.style.overflow = "auto";
                    document.body.style.position = "static";
                  }}
                >
                  {({ open }) => (
                    <button
                      type="button"
                      onClick={() => {
                        open();
                      }}
                      className="w-full py-3 bg-[var(--text-dark)] text-[var(--brand-light)] rounded-2xl font-bold text-xs md:text-sm shadow-md hover:bg-black transition-all"
                    >
                      Upload Image{" "}
                      {activeTab === "surprise"
                        ? ""
                        : product.images.length + 1}
                    </button>
                  )}
                </CldUploadWidget>

              )}

            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[var(--brand-green)] text-white rounded-2xl font-bold text-sm md:text-base shadow-lg hover:opacity-95 transition-all"
            >
              {loading ? "Saving..." : "Save Product"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                setProduct(getInitialFormState());
              }}
              className="w-full mt-2 py-2 text-gray-500 text-xs font-semibold hover:text-black"
            >
              Cancel
            </button>

          </form>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">

            {products.map((p, index) => (

              <div
                key={`${p.id}-${index}`}
                className={`theme-card bg-[var(--brand-light)] rounded-3xl p-3 md:p-4 shadow-sm border border-gray-100 flex flex-row items-stretch gap-4 transition-all ${
                  p.visible === false ? "opacity-50" : ""
                } ${eventAnimation ? "theme-animate" : ""}`}
              >

                <div className="w-[50%] aspect-[1/1] overflow-hidden rounded-2xl flex-shrink-0 relative">

                  <img
                    src={p.images[0]}
                    className="w-full h-full object-cover"
                    alt={`Package ${index + 1}`}
                  />

                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md">

                    <span className="text-[10px] text-white font-bold uppercase">
                      {tempSubCategories.find(
                        (item) => item.id === p.subCategory
                      )?.name?.en || p.subCategory}
                    </span>

                  </div>

                </div>

                <div className="w-[50%] flex flex-col justify-between py-1">

                  <div>

                    <div className="flex items-center justify-between mb-1">

                      <span className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">
                        Pkg {index + 1}
                      </span>

                    </div>

                    <p className="text-lg md:text-xl font-black text-[var(--event-primary)] mb-1">
                      {Number(p.price).toLocaleString()} ETB
                    </p>

                    <p className="text-[11px] text-gray-500 line-clamp-3 italic mb-2">
                      {p.description.en || p.description.am}
                    </p>

                  </div>

                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-gray-100">

                    <button
                      onClick={() =>
                        toggleVisibility(p.id, p.visible)
                      }
                      className={`p-2 rounded-xl text-xs flex items-center justify-center transition-colors ${
                        p.visible === false
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title="Toggle Visibility"
                    >
                      {p.visible === false ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>

                    <button
                      onClick={() => handleEdit(p)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Edit Product"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() => {
                        setCopyingProduct(p);
                        setCopyTargetSub("");
                      }}
                      className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
                      title="Duplicate Product"
                    >
                      📋
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

          <div className="text-xs text-gray-400 flex flex-col items-center md:items-end gap-1.5">

            <p className="flex items-center justify-center md:justify-end gap-1.5">
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
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                <span className="font-semibold">+251 993 370 491</span>
              </a>
            </p>

            <a 
              href="https://www.google.com/maps/search/?api=1&query=Kido+gift+shop+harar" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 mt-1 hover:text-[var(--brand-gold)] transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-[var(--brand-gold)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Harar, Ethiopia
            </a>

            <p className="text-gray-500 mt-2">
              © {new Date().getFullYear()} Kido Gifts & Flowers. All rights reserved.
            </p>

          </div>

        </div>
      </footer>

    </div>
  );
}