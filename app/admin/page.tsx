'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product, Category, StockStatus, StockVariant, Order, OrderItem, OrderStatus } from '@/types';
import { useSiteData, defaultSiteData, HERO_IMAGE_KEY } from '@/hooks/useSiteData';
import {
  formatPrice,
  COLOR_PALETTE,
  getColorHex,
  generateDefaultStockMatrix,
  computeStockStatusFromMatrix,
} from '@/data/products';
import { useOrders } from '@/hooks/useOrders';
import { deleteCategoryFromSupabase, deleteProductFromSupabase } from '@/lib/supabase';
import { sendOrderNotification } from '@/lib/notifications';
import styles from './admin.module.css';

const ADMIN_PASSWORD = 'velime2024';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Taille Unique'];

export default function AdminPage() {
  const {
    heroTitle,
    heroSubtitle,
    heroCtaText,
    heroImage,
    products,
    categories,
    brands,
    lookbookPhotos,
    saveData,
  } = useSiteData();

  const { orders, updateStatus, removeOrder } = useOrders();
  
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'hero' | 'brands' | 'lookbook'>('orders');
  const [savedMsg, setSavedMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Inline confirmation state (replaces window.confirm which fails on mobile)
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  // Orders management filters & search
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [copiedBordereau, setCopiedBordereau] = useState(false);
  const [isTestingNotify, setIsTestingNotify] = useState(false);
  const [notifyTestStatus, setNotifyTestStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTestNotification = async () => {
    setIsTestingNotify(true);
    setNotifyTestStatus(null);
    try {
      await sendOrderNotification({
        id: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        orderNumber: `CMD-TEST-${Math.floor(100 + Math.random() * 900)}`,
        customerName: 'Client Test Velime',
        customerPhone: '0550123456',
        wilayaName: 'Alger',
        commune: 'Centre',
        deliveryType: 'domicile',
        items: [
          {
            productName: 'Article Test Velime',
            size: 'M',
            color: 'Noir',
            quantity: 1,
            price: 8500,
          },
        ],
        itemsSubtotal: 8500,
        deliveryCost: 500,
        totalAmount: 9000,
        notes: 'Test de notification push en temps réel.',
      });
      setNotifyTestStatus({
        type: 'success',
        text: 'Alerte test envoyée avec succès sur le topic "velime_orders_dz" ! Votre téléphone doit sonner.',
      });
    } catch (err: any) {
      setNotifyTestStatus({
        type: 'error',
        text: `Erreur d'envoi : ${err?.message || 'Erreur inconnue'}`,
      });
    } finally {
      setIsTestingNotify(false);
    }
  };

  const handleCopyBordereau = (ord: Order) => {
    const itemsText = ord.items
      .map(
        (it: OrderItem) =>
          `• ${it.productName} | Taille : ${it.size}${it.color ? ` | Couleur : ${it.color}` : ''} | Qté : ${it.quantity} (${formatPrice(it.price * it.quantity)})`
      )
      .join('\n');

    const text = `📦 COMMANDE #${ord.orderNumber}
👤 Client : ${ord.customerName}
📞 Téléphone : ${ord.customerPhone}
📍 Destination : ${ord.wilayaName} (${ord.wilayaCode}) — ${ord.commune}
🚚 Mode : ${ord.deliveryType === 'domicile' ? 'À Domicile (main propre)' : 'Bureau / Stop-Desk'}
${ord.notes ? `📝 Remarques : ${ord.notes}\n` : ''}👗 Article(s) commandé(s) :
${itemsText}
💰 Frais de livraison : ${formatPrice(ord.deliveryCost)}
💵 TOTAL À ENCAISSER : ${formatPrice(ord.totalAmount)}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedBordereau(true);
      showNotification('Bordereau copié pour le livreur !');
      setTimeout(() => setCopiedBordereau(false), 2500);
    }
  };

  // Dedicated Stock Management Modal
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [quickStockStatus, setQuickStockStatus] = useState<StockStatus>('in_stock');
  const [quickStockMatrix, setQuickStockMatrix] = useState<StockVariant[]>([]);

  const openStockModal = (p: Product) => {
    setStockModalProduct(p);
    const initialSizes = p.sizes || ['S', 'M', 'L'];
    const initialColors = p.colors && p.colors.length > 0 ? p.colors : ['Standard'];
    const initialMatrix =
      p.stockMatrix && p.stockMatrix.length > 0
        ? p.stockMatrix
        : generateDefaultStockMatrix(initialSizes, initialColors, p.stockStatus !== 'total_out');
    setQuickStockStatus(p.stockStatus || (p.inStock ? 'in_stock' : 'total_out'));
    setQuickStockMatrix(initialMatrix);
  };

  const toggleQuickMatrixCell = (size: string, color: string) => {
    setQuickStockMatrix((prev) =>
      prev.map((item) => {
        if (item.size === size && (item.color || 'Standard') === color) {
          return { ...item, inStock: !item.inStock };
        }
        return item;
      })
    );
  };

  const setAllQuickMatrixStock = (val: boolean) => {
    setQuickStockMatrix((prev) => prev.map((m) => ({ ...m, inStock: val })));
  };

  const toggleQuickSizeColumn = (sz: string, val: boolean) => {
    setQuickStockMatrix((prev) =>
      prev.map((item) => (item.size === sz ? { ...item, inStock: val } : item))
    );
  };

  const handleSaveQuickStock = () => {
    if (!stockModalProduct) return;
    const computedStatus =
      quickStockStatus === 'partial_out'
        ? computeStockStatusFromMatrix(quickStockMatrix)
        : quickStockStatus;
    const isInStock = computedStatus !== 'total_out';

    const updated = products.map((p) => {
      if (p.id !== stockModalProduct.id) return p;
      return {
        ...p,
        stockStatus: computedStatus,
        inStock: isInStock,
        stockMatrix: quickStockMatrix,
        badge:
          computedStatus === 'total_out'
            ? 'Rupture de Stock'
            : computedStatus === 'partial_out'
            ? 'Stock Limité'
            : p.badge === 'Rupture de Stock' || p.badge === 'Stock Limité'
            ? undefined
            : p.badge,
      };
    });

    saveData({
      heroTitle,
      heroSubtitle,
      heroCtaText,
      heroImage,
      categories,
      products: updated,
      brands,
      lookbookPhotos: lookbookList,
    });

    showNotification(
      `Disponibilité de « ${stockModalProduct.name} » mise à jour (${
        computedStatus === 'in_stock'
          ? 'En Stock'
          : computedStatus === 'partial_out'
          ? 'Rupture Partielle'
          : 'Rupture Totale'
      }).`
    );
    setStockModalProduct(null);
  };

  // Modal states for Product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal states for Category
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states for Product
  const [prodForm, setProdForm] = useState<{
    name: string;
    slug: string;
    category: string;
    price: number;
    originalPrice: number | '';
    description: string;
    sizes: string[];
    availableSizes: string[];
    colors: string[];
    availableColors: string[];
    stockMatrix: StockVariant[];
    customColorInput: string;
    customSizeInput: string;
    stockStatus: StockStatus;
    badge: string;
    isNew: boolean;
    isBestSeller: boolean;
    image: string;
    images: string[];
    newImageUrl: string;
  }>({
    name: '',
    slug: '',
    category: '',
    price: 0,
    originalPrice: '',
    description: '',
    sizes: ['S', 'M', 'L'],
    availableSizes: ['S', 'M', 'L'],
    colors: ['Noir', 'Beige'],
    availableColors: ['Noir', 'Beige'],
    stockMatrix: generateDefaultStockMatrix(['S', 'M', 'L'], ['Noir', 'Beige'], true),
    customColorInput: '',
    customSizeInput: '',
    stockStatus: 'in_stock',
    badge: '',
    isNew: false,
    isBestSeller: false,
    image: '/images/p1.jpg',
    images: ['/images/p1.jpg'],
    newImageUrl: '',
  });

  // Form states for Category
  const [catForm, setCatForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '/images/p1.jpg',
  });

  // Form states for Hero
  const [heroForm, setHeroForm] = useState({
    title: '',
    subtitle: '',
    ctaText: '',
    image: '',
  });
  const [heroFormDirty, setHeroFormDirty] = useState(false);

  useEffect(() => {
    if (!heroFormDirty) {
      setHeroForm({
        title: heroTitle || 'VELIME',
        subtitle: heroSubtitle || "L'élégance au quotidien",
        ctaText: heroCtaText || 'Découvrir',
        image: heroImage || '/images/hero-fabric.jpg',
      });
    }
  }, [heroTitle, heroSubtitle, heroCtaText, heroImage, heroFormDirty]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedAuth = localStorage.getItem('velime-admin-session');
        if (savedAuth === 'active') {
          setAuthed(true);
        }
      }
    } catch {}
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true);
      try {
        localStorage.setItem('velime-admin-session', 'active');
      } catch {}
      setPasswordError('');
      showNotification('Bienvenue dans votre espace administrateur !');
    } else {
      setPasswordError('Mot de passe incorrect.');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('velime-admin-session');
    } catch {}
    setAuthed(false);
    setPasswordInput('');
    showNotification('Déconnexion réussie.');
  };

  const showNotification = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 4000);
  };

  const [heroDragActive, setHeroDragActive] = useState(false);

  const processImageFile = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target?.result as string;
      if (!rawUrl) return;

      const img = document.createElement('img');
      img.onload = () => {
        const maxWidth = 1400;
        const maxHeight = 1400;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          callback(compressed);
        } else {
          callback(rawUrl);
        }
      };
      img.onerror = () => callback(rawUrl);
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleHeroFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setHeroFormDirty(true);
        setHeroForm((h) => ({ ...h, image: dataUrl }));
        showNotification('Photo de fond chargée ! Cliquez sur « Enregistrer la page d\'accueil » pour valider.');
      });
    }
  };

  const handleHeroDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHeroDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setHeroFormDirty(true);
        setHeroForm((h) => ({ ...h, image: dataUrl }));
        showNotification('Photo de fond chargée ! Cliquez sur « Enregistrer la page d\'accueil » pour valider.');
      });
    }
  };

  const handleProductFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      processImageFile(file, (dataUrl) => {
        setProdForm((prev) => ({
          ...prev,
          images: [...prev.images, dataUrl],
          image: prev.images.length === 0 ? dataUrl : prev.image,
        }));
      });
    });
  };

  const handleCategoryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setCatForm((c) => ({ ...c, image: dataUrl }));
      });
    }
  };

  // Form states for Lookbook
  const [lookbookList, setLookbookList] = useState<string[]>([]);
  const [newLookbookUrl, setNewLookbookUrl] = useState('');
  const [lookbookDragActive, setLookbookDragActive] = useState(false);

  useEffect(() => {
    if (lookbookPhotos && lookbookPhotos.length > 0) {
      setLookbookList(lookbookPhotos);
    }
  }, [lookbookPhotos]);

  const handleAddLookbookPhotoFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      processImageFile(file, (dataUrl) => {
        setLookbookList((prev) => [...prev, dataUrl]);
      });
    });
    showNotification('Photos ajoutées ! Pensez à enregistrer.');
  };

  const handleLookbookDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setLookbookDragActive(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      processImageFile(file, (dataUrl) => {
        setLookbookList((prev) => [...prev, dataUrl]);
      });
    });
    showNotification('Photos ajoutées ! Pensez à enregistrer.');
  };

  const handleAddLookbookUrl = () => {
    if (!newLookbookUrl.trim()) return;
    setLookbookList((prev) => [...prev, newLookbookUrl.trim()]);
    setNewLookbookUrl('');
    showNotification('Photo ajoutée ! Pensez à enregistrer.');
  };

  const handleRemoveLookbookPhoto = (index: number) => {
    setLookbookList((prev) => prev.filter((_, i) => i !== index));
    showNotification('Photo retirée. Pensez à enregistrer.');
  };

  const handleSaveLookbook = () => {
    saveData({
      heroTitle,
      heroSubtitle,
      heroCtaText,
      heroImage: heroForm.image || heroImage,
      products,
      categories,
      brands,
      lookbookPhotos: lookbookList,
    });
    showNotification('Galerie Lookbook enregistrée avec succès !');
  };

  const handleSaveHero = () => {
    const updatedHeroImage = heroForm.image || heroImage || '/images/hero-fabric.jpg';
    saveData({
      heroTitle: heroForm.title,
      heroSubtitle: heroForm.subtitle,
      heroCtaText: heroForm.ctaText,
      heroImage: updatedHeroImage,
      products,
      categories,
      brands,
      lookbookPhotos: lookbookList,
    });
    if (updatedHeroImage) {
      try {
        localStorage.setItem(HERO_IMAGE_KEY, updatedHeroImage);
      } catch {}
    }
    setHeroFormDirty(false);
    showNotification('Photo de fond et configuration de l\'accueil enregistrées avec succès !');
  };

  const handleResetDefaults = () => {
    if (confirm('Voulez-vous réinitialiser toutes les données aux valeurs par défaut ?')) {
      saveData(defaultSiteData);
      showNotification('Données réinitialisées aux valeurs par défaut.');
    }
  };

  /* ============================================================
     CATEGORY CRUD
     ============================================================ */
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCatForm({ name: '', slug: '', description: '', image: '' });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '/images/p1.jpg',
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    const generatedSlug = catForm.slug.trim() || catForm.name.trim().toLowerCase().replace(/\s+/g, '-');
    const catImage = catForm.image.trim() || '/images/p1.jpg';

    if (editingCategory) {
      const oldName = editingCategory.name;
      const updatedCategories = categories.map((c) =>
        c.id === editingCategory.id
          ? { ...c, name: catForm.name.trim(), slug: generatedSlug, description: catForm.description.trim(), image: catImage }
          : c
      );
      const updatedProducts = products.map((p) =>
        p.category === oldName ? { ...p, category: catForm.name.trim() } : p
      );
      saveData({
        heroTitle, heroSubtitle, heroCtaText, heroImage,
        categories: updatedCategories,
        products: updatedProducts,
        brands,
        lookbookPhotos: lookbookList,
      });
      showNotification(`Catégorie « ${catForm.name} » modifiée.`);
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: catForm.name.trim(),
        slug: generatedSlug,
        description: catForm.description.trim(),
        image: catImage,
      };
      saveData({
        heroTitle, heroSubtitle, heroCtaText, heroImage,
        categories: [...categories, newCat],
        products,
        brands,
        lookbookPhotos: lookbookList,
      });
      showNotification(`Catégorie « ${catForm.name} » ajoutée.`);
    }

    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    const updatedCategories = categories.filter((c) => c.id !== catId);
    deleteCategoryFromSupabase(catId).catch((err) => console.warn('Supabase deleteCategory error:', err));
    saveData({
      heroTitle, heroSubtitle, heroCtaText, heroImage,
      categories: updatedCategories,
      products,
      brands,
      lookbookPhotos: lookbookList,
    });
    setConfirmDeleteCategoryId(null);
    showNotification(`Catégorie « ${catName} » supprimée.`);
  };

  /* Helper to synchronize matrix combinations whenever sizes or colors change */
  const syncMatrix = (sizes: string[], colors: string[], prevMatrix: StockVariant[]): StockVariant[] => {
    const effectiveColors = colors.length > 0 ? colors : ['Unique'];
    const effectiveSizes = sizes.length > 0 ? sizes : ['Taille Unique'];
    const newMatrix: StockVariant[] = [];

    for (const color of effectiveColors) {
      for (const size of effectiveSizes) {
        const existing = prevMatrix.find((v) => v.size === size && v.color === color);
        newMatrix.push({
          size,
          color,
          inStock: existing !== undefined ? existing.inStock : true,
        });
      }
    }
    return newMatrix;
  };

  /* Matrix interactive modifiers */
  const toggleMatrixCell = (size: string, color: string) => {
    setProdForm((prev) => {
      const updated = prev.stockMatrix.map((item) => {
        if (item.size === size && item.color === color) {
          return { ...item, inStock: !item.inStock };
        }
        return item;
      });
      return { ...prev, stockMatrix: updated };
    });
  };

  const toggleColorRow = (color: string, setInStock: boolean) => {
    setProdForm((prev) => {
      const updated = prev.stockMatrix.map((item) => {
        if (item.color === color) {
          return { ...item, inStock: setInStock };
        }
        return item;
      });
      return { ...prev, stockMatrix: updated };
    });
  };

  const toggleSizeColumn = (size: string, setInStock: boolean) => {
    setProdForm((prev) => {
      const updated = prev.stockMatrix.map((item) => {
        if (item.size === size) {
          return { ...item, inStock: setInStock };
        }
        return item;
      });
      return { ...prev, stockMatrix: updated };
    });
  };

  const setAllMatrixStock = (setInStock: boolean) => {
    setProdForm((prev) => ({
      ...prev,
      stockMatrix: prev.stockMatrix.map((item) => ({ ...item, inStock: setInStock })),
    }));
  };

  /* ============================================================
     PRODUCT CRUD
     ============================================================ */
  const openNewProductModal = () => {
    setEditingProduct(null);
    const defaultCat = categories.length > 0 ? categories[0].name : '';
    const initSizes = ['S', 'M', 'L'];
    const initColors = ['Noir', 'Beige'];

    setProdForm({
      name: '',
      slug: '',
      category: defaultCat,
      price: 5000,
      originalPrice: '',
      description: '',
      sizes: initSizes,
      availableSizes: initSizes,
      colors: initColors,
      availableColors: initColors,
      stockMatrix: generateDefaultStockMatrix(initSizes, initColors, true),
      customColorInput: '',
      customSizeInput: '',
      stockStatus: 'in_stock',
      badge: '',
      isNew: true,
      isBestSeller: false,
      image: '',
      images: [],
      newImageUrl: '',
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    const pImages = p.images && p.images.length > 0 ? p.images : [p.image];
    const initialSizes = p.sizes || ['S', 'M', 'L'];
    const initialColors = p.colors || ['Noir'];
    const initialMatrix = p.stockMatrix && p.stockMatrix.length > 0
      ? p.stockMatrix
      : generateDefaultStockMatrix(initialSizes, initialColors, p.stockStatus !== 'total_out');

    setProdForm({
      name: p.name,
      slug: p.slug,
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice || '',
      description: p.description,
      sizes: initialSizes,
      availableSizes: p.availableSizes || initialSizes,
      colors: initialColors,
      availableColors: p.availableColors || initialColors,
      stockMatrix: initialMatrix,
      customColorInput: '',
      customSizeInput: '',
      stockStatus: p.stockStatus || (p.inStock ? 'in_stock' : 'total_out'),
      badge: p.badge || '',
      isNew: Boolean(p.isNew),
      isBestSeller: Boolean(p.isBestSeller),
      image: p.image || pImages[0],
      images: pImages,
      newImageUrl: '',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name.trim()) return;

    const generatedSlug = prodForm.slug.trim() || prodForm.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const cleanImages = prodForm.images.filter(img => img.trim().length > 0);
    const mainImage = cleanImages[0] || prodForm.image || '/images/p1.jpg';

    // Compute active matrix
    let finalMatrix = prodForm.stockMatrix;
    if (prodForm.stockStatus === 'in_stock') {
      finalMatrix = finalMatrix.map((m) => ({ ...m, inStock: true }));
    } else if (prodForm.stockStatus === 'total_out') {
      finalMatrix = finalMatrix.map((m) => ({ ...m, inStock: false }));
    }

    // Auto-derive overall stock status and available arrays from matrix
    const computedStatus = prodForm.stockStatus === 'partial_out'
      ? computeStockStatusFromMatrix(finalMatrix)
      : prodForm.stockStatus;

    const finalAvailableSizes = prodForm.sizes.filter((sz) =>
      finalMatrix.some((m) => m.size === sz && m.inStock)
    );

    const finalAvailableColors = prodForm.colors.filter((col) =>
      finalMatrix.some((m) => m.color === col && m.inStock)
    );

    const isInStock = computedStatus !== 'total_out';

    const productPayload: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: prodForm.name.trim(),
      slug: generatedSlug,
      category: prodForm.category,
      price: Number(prodForm.price),
      originalPrice: prodForm.originalPrice ? Number(prodForm.originalPrice) : undefined,
      description: prodForm.description.trim(),
      sizes: prodForm.sizes,
      availableSizes: computedStatus === 'total_out' ? [] : finalAvailableSizes,
      colors: prodForm.colors,
      availableColors: computedStatus === 'total_out' ? [] : finalAvailableColors,
      stockMatrix: finalMatrix,
      inStock: isInStock,
      stockStatus: computedStatus,
      badge: prodForm.badge.trim() || (computedStatus === 'total_out' ? 'Rupture de Stock' : computedStatus === 'partial_out' ? 'Stock Limité' : undefined),
      isNew: prodForm.isNew,
      isBestSeller: prodForm.isBestSeller,
      image: mainImage,
      images: cleanImages.length > 0 ? cleanImages : [mainImage],
    };

    if (editingProduct) {
      const updatedProducts = products.map((p) => (p.id === editingProduct.id ? productPayload : p));
      saveData({
        heroTitle, heroSubtitle, heroCtaText, heroImage,
        categories,
        products: updatedProducts,
        brands,
        lookbookPhotos: lookbookList,
      });
      showNotification(`Article « ${prodForm.name} » mis à jour.`);
    } else {
      saveData({
        heroTitle, heroSubtitle, heroCtaText, heroImage,
        categories,
        products: [productPayload, ...products],
        brands,
        lookbookPhotos: lookbookList,
      });
      showNotification(`Article « ${prodForm.name} » créé avec succès.`);
    }

    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    const updatedProducts = products.filter((p) => p.id !== productId);
    deleteProductFromSupabase(productId).catch((err) => console.warn('Supabase deleteProduct error:', err));
    saveData({
      heroTitle, heroSubtitle, heroCtaText, heroImage,
      categories,
      products: updatedProducts,
      brands,
      lookbookPhotos: lookbookList,
    });
    setConfirmDeleteProductId(null);
    showNotification(`Article « ${productName} » supprimé.`);
  };

  const handleToggleStockQuick = (productId: string, currentStatus: StockStatus) => {
    const nextStatus: StockStatus = currentStatus === 'in_stock' ? 'partial_out' : currentStatus === 'partial_out' ? 'total_out' : 'in_stock';
    const updatedProducts = products.map((p) => {
      if (p.id !== productId) return p;
      return {
        ...p,
        stockStatus: nextStatus,
        inStock: nextStatus !== 'total_out',
        badge: nextStatus === 'total_out' ? 'Rupture de Stock' : nextStatus === 'partial_out' ? 'Stock Limité' : undefined,
        availableSizes: nextStatus === 'total_out' ? [] : (nextStatus === 'partial_out' ? p.sizes.slice(0, 1) : p.sizes),
        availableColors: nextStatus === 'total_out' ? [] : (nextStatus === 'partial_out' ? (p.colors?.slice(0, 1) || []) : (p.colors || [])),
      };
    });
    saveData({
      heroTitle, heroSubtitle, heroCtaText, heroImage,
      categories,
      products: updatedProducts,
      brands,
      lookbookPhotos: lookbookList,
    });
    showNotification('Statut de stock mis à jour.');
  };

  /* Helper methods for custom sizes & colors in modal */
  const handleAddCustomColor = () => {
    const color = prodForm.customColorInput.trim();
    if (!color) return;
    if (!prodForm.colors.includes(color)) {
      const updatedColors = [...prodForm.colors, color];
      setProdForm((f) => ({
        ...f,
        colors: updatedColors,
        availableColors: [...f.availableColors, color],
        stockMatrix: syncMatrix(f.sizes, updatedColors, f.stockMatrix),
        customColorInput: '',
      }));
      showNotification(`Couleur « ${color} » ajoutée.`);
    } else {
      setProdForm(f => ({ ...f, customColorInput: '' }));
      showNotification(`La couleur « ${color} » est déjà sélectionnée.`);
    }
  };

  const handleAddCustomSize = () => {
    const size = prodForm.customSizeInput.trim().toUpperCase();
    if (!size) return;
    if (!prodForm.sizes.includes(size)) {
      const updatedSizes = [...prodForm.sizes, size];
      setProdForm((f) => ({
        ...f,
        sizes: updatedSizes,
        availableSizes: [...f.availableSizes, size],
        stockMatrix: syncMatrix(updatedSizes, f.colors, f.stockMatrix),
        customSizeInput: '',
      }));
      showNotification(`Taille « ${size} » ajoutée.`);
    } else {
      setProdForm(f => ({ ...f, customSizeInput: '' }));
      showNotification(`La taille « ${size} » est déjà sélectionnée.`);
    }
  };

  /* Image helpers for Product modal */
  const handleAddImageToGallery = () => {
    if (!prodForm.newImageUrl.trim()) return;
    setProdForm(prev => ({
      ...prev,
      images: [...prev.images, prev.newImageUrl.trim()],
      newImageUrl: '',
    }));
  };

  const handleRemoveImageFromGallery = (index: number) => {
    setProdForm(prev => {
      const updated = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: updated,
        image: updated[0] || prev.image,
      };
    });
  };

  const handleSetMainImage = (index: number) => {
    setProdForm(prev => {
      const selected = prev.images[index];
      const rest = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        image: selected,
        images: [selected, ...rest],
      };
    });
  };

  /* ============================================================
     BRANDS CRUD
     ============================================================ */
  const handleAddBrand = () => {
    const name = prompt('Nom de la marque :');
    if (name?.trim()) {
      const updated = [...brands, name.trim().toUpperCase()];
      saveData({
        heroTitle, heroSubtitle, heroCtaText, heroImage,
        categories,
        products,
        brands: updated,
        lookbookPhotos: lookbookList,
      });
      showNotification(`Marque « ${name.trim().toUpperCase()} » ajoutée.`);
    }
  };

  const handleRemoveBrand = (index: number) => {
    const updated = brands.filter((_, i) => i !== index);
    saveData({
      heroTitle, heroSubtitle, heroCtaText, heroImage,
      categories,
      products,
      brands: updated,
      lookbookPhotos: lookbookList,
    });
    showNotification('Marque supprimée du bandeau.');
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    const matchQuery = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  // Filtered orders list
  const pendingOrdersCount = orders.filter((o) => o.status === 'en_attente').length;
  const filteredOrders = orders.filter((o) => {
    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const matchQuery =
      !orderSearchQuery.trim() ||
      o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerPhone.includes(orderSearchQuery.trim()) ||
      o.wilayaName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.commune.toLowerCase().includes(orderSearchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  /* ============================================================
     LOGIN VIEW
     ============================================================ */
  if (!authed) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginBox}>
          <div className={styles.loginLogo}>
            <span className={styles.loginSub}>Espace Gestion</span>
            <span className={styles.loginMain}>Velime</span>
          </div>
          <h1 className={styles.loginTitle}>Administration</h1>
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <label htmlFor="admin-password" className={styles.loginLabel}>
              Code d&apos;accès
            </label>
            <input
              id="admin-password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className={styles.loginInput}
              placeholder="Entrez votre mot de passe"
              autoComplete="current-password"
              autoFocus
            />
            {passwordError && <p className={styles.loginError}>{passwordError}</p>}
            <button type="submit" className={styles.loginBtn} id="admin-login-btn">
              Accéder au Tableau de Bord
            </button>
          </form>
          <p className={styles.loginHint}>Mot de passe par défaut : <strong>velime2024</strong></p>
        </div>
      </div>
    );
  }

  /* ============================================================
     MAIN DASHBOARD
     ============================================================ */
  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={styles.sideLogoMain}>Velime</span>
          <span className={styles.sideLogoLabel}>Administration</span>
        </div>

        <nav className={styles.sideNav}>
          <button
            id="nav-tab-orders"
            className={`${styles.sideNavBtn} ${activeTab === 'orders' ? styles.sideNavActive : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingBagIcon />
            <span>Commandes ({orders.length})</span>
            {orders.filter(o => o.status === 'en_attente').length > 0 && (
              <span className={styles.tabBadgePending}>
                {orders.filter(o => o.status === 'en_attente').length}
              </span>
            )}
          </button>

          <button
            id="nav-tab-products"
            className={`${styles.sideNavBtn} ${activeTab === 'products' ? styles.sideNavActive : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <BoxIcon />
            <span>Articles ({products.length})</span>
          </button>

          <button
            id="nav-tab-categories"
            className={`${styles.sideNavBtn} ${activeTab === 'categories' ? styles.sideNavActive : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <FolderIcon />
            <span>Catégories ({categories.length})</span>
          </button>

          <button
            id="nav-tab-hero"
            className={`${styles.sideNavBtn} ${activeTab === 'hero' ? styles.sideNavActive : ''}`}
            onClick={() => setActiveTab('hero')}
          >
            <ImageIcon />
            <span>Page d&apos;accueil</span>
          </button>

          <button
            id="nav-tab-brands"
            className={`${styles.sideNavBtn} ${activeTab === 'brands' ? styles.sideNavActive : ''}`}
            onClick={() => setActiveTab('brands')}
          >
            <TagIcon />
            <span>Bandeau Marques ({brands.length})</span>
          </button>

          <button
            id="nav-tab-lookbook"
            className={`${styles.sideNavBtn} ${activeTab === 'lookbook' ? styles.sideNavActive : ''}`}
            onClick={() => setActiveTab('lookbook')}
          >
            <CameraIcon />
            <span>Galerie Lookbook ({lookbookList.length})</span>
          </button>
        </nav>

        <div className={styles.sidebarBottom}>
          <a href="/" className={styles.viewSite}>
            <span>🌐 Voir le site</span>
            <ExternalLinkIcon />
          </a>
          <button onClick={handleResetDefaults} className={styles.resetBtn}>
            <ResetIcon />
            <span>Réinitialiser</span>
          </button>
          <button onClick={handleLogout} className={styles.logoutSideBtn} title="Verrouiller l'accès administrateur">
            <span>🔒 Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.topBar}>
          {/* Mobile Tabs Switcher */}
          <div className={styles.mobileTabsNav}>
            <button
              className={`${styles.mobileTabChip} ${activeTab === 'orders' ? styles.mobileTabChipActive : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              📦 Commandes ({orders.length})
            </button>
            <button
              className={`${styles.mobileTabChip} ${activeTab === 'products' ? styles.mobileTabChipActive : ''}`}
              onClick={() => setActiveTab('products')}
            >
              Articles ({products.length})
            </button>
            <button
              className={`${styles.mobileTabChip} ${activeTab === 'categories' ? styles.mobileTabChipActive : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              Catégories ({categories.length})
            </button>
            <button
              className={`${styles.mobileTabChip} ${activeTab === 'hero' ? styles.mobileTabChipActive : ''}`}
              onClick={() => setActiveTab('hero')}
            >
              Accueil
            </button>
            <button
              className={`${styles.mobileTabChip} ${activeTab === 'brands' ? styles.mobileTabChipActive : ''}`}
              onClick={() => setActiveTab('brands')}
            >
              Marques ({brands.length})
            </button>
            <button
              className={`${styles.mobileTabChip} ${activeTab === 'lookbook' ? styles.mobileTabChipActive : ''}`}
              onClick={() => setActiveTab('lookbook')}
            >
              Lookbook ({lookbookList.length})
            </button>
            <a href="/" className={`${styles.mobileTabChip} ${styles.mobileSwitchSiteChip}`}>
              🌐 Voir le site
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className={`${styles.mobileTabChip} ${styles.mobileLogoutChip}`}
              title="Déconnexion"
            >
              🔒 Quitter
            </button>
          </div>

          <div>
            <h1 className={styles.pageTitle}>
              {activeTab === 'orders' && 'Gestion des Commandes Clients'}
              {activeTab === 'products' && 'Gestion des Articles, Tailles, Couleurs & Stock'}
              {activeTab === 'categories' && 'Gestion des Catégories'}
              {activeTab === 'hero' && 'Personnalisation de la Page d\'Accueil'}
              {activeTab === 'brands' && 'Bandeau des Marques Inspirantes'}
              {activeTab === 'lookbook' && 'Galerie Photos Défilantes (Lookbook Porté)'}
            </h1>
            <p className={styles.pageSubtitle}>
              {activeTab === 'orders' && `${orders.length} commande(s) au total • Suivez le statut, contactez vos clients et gérez les livraisons`}
              {activeTab === 'products' && 'Matrice dynamique Taille × Couleur, multi-photos et ruptures de stock'}
              {activeTab === 'categories' && 'Ajoutez, modifiez ou supprimez les catégories du catalogue'}
              {activeTab === 'hero' && 'Modifiez le grand titre, slogan et images principales'}
              {activeTab === 'brands' && 'Personnalisez les noms affichés dans le bandeau défilant'}
              {activeTab === 'lookbook' && 'Téléchargez vos propres photos de créations portées pour les faire défiler sur l\'accueil'}
            </p>
          </div>

          <div className={styles.topActions}>
            {savedMsg && <span className={styles.savedMsg}>{savedMsg}</span>}
            <a href="/" className={styles.switchSiteBtn} id="admin-switch-to-site-btn">
              <span>🌐 Voir le site</span>
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className={styles.logoutBtn}
              id="admin-logout-btn"
              title="Verrouiller l'accès administrateur"
            >
              <span>🔒 Déconnexion</span>
            </button>
            {activeTab === 'products' && (
              <button className={styles.addPrimaryBtn} onClick={openNewProductModal} id="add-product-main-btn">
                <PlusIcon />
                <span>Nouvel Article</span>
              </button>
            )}
            {activeTab === 'categories' && (
              <button className={styles.addPrimaryBtn} onClick={openNewCategoryModal} id="add-category-main-btn">
                <PlusIcon />
                <span>Nouvelle Catégorie</span>
              </button>
            )}
          </div>
        </header>

        <div className={styles.contentArea}>
          {/* ============================================================
              TAB: ORDERS (COMMANDES CLIENTS)
             ============================================================ */}
          {activeTab === 'orders' && (
            <div className={styles.tabSection}>
              {/* Summary Stats Grid */}
              <div className={styles.orderStatsGrid}>
                <div className={styles.orderStatCard}>
                  <span className={styles.statLabel}>Total Commandes</span>
                  <strong className={styles.statValue}>{orders.length}</strong>
                  <span className={styles.statSub}>Toutes les commandes</span>
                </div>
                <div className={`${styles.orderStatCard} ${styles.statPending}`}>
                  <span className={styles.statLabel}>En Attente</span>
                  <strong className={styles.statValue}>{pendingOrdersCount}</strong>
                  <span className={styles.statSub}>À confirmer par téléphone</span>
                </div>
                <div className={`${styles.orderStatCard} ${styles.statDelivered}`}>
                  <span className={styles.statLabel}>Confirmées</span>
                  <strong className={styles.statValue}>
                    {orders.filter((o) => o.status === 'confirmee').length}
                  </strong>
                  <span className={styles.statSub}>Commandes validées</span>
                </div>
                <div className={styles.orderStatCard}>
                  <span className={styles.statLabel}>Chiffre d&apos;Affaires</span>
                  <strong className={styles.statValue}>
                    {formatPrice(orders.filter((o) => o.status === 'confirmee').reduce((sum, o) => sum + o.totalAmount, 0))}
                  </strong>
                  <span className={styles.statSub}>Commandes confirmées</span>
                </div>
              </div>

              {/* Real-time Push Notification Status & Test (ntfy.sh) */}
              <div style={{
                margin: '1.25rem 0',
                padding: '1.25rem 1.5rem',
                background: '#ffffff',
                border: '1px solid #e7e2d8',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 2px 8px rgba(78, 64, 52, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#f4efe8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}>
                      🔔
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#2b221a' }}>
                        Alertes Push Téléphone Instantanées (ntfy.sh)
                      </h4>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#8c7864' }}>
                        Canal : <strong style={{ color: '#2b221a', background: '#f5f2eb', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>velime_orders_dz</strong> • Priorité Urgente 4 (Sonnerie forte même écran verrouillé)
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <a
                      href="https://ntfy.sh/velime_orders_dz"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '0.5rem 0.9rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d4ccbf',
                        borderRadius: '4px',
                        background: '#ffffff',
                        color: '#4e4034',
                        textDecoration: 'none',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span>Consulter sur ntfy.sh</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                    <button
                      type="button"
                      disabled={isTestingNotify}
                      onClick={handleTestNotification}
                      style={{
                        padding: '0.5rem 1.1rem',
                        fontSize: '0.8rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: '#2b221a',
                        color: '#ffffff',
                        cursor: isTestingNotify ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        opacity: isTestingNotify ? 0.7 : 1,
                        transition: 'background 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <span>{isTestingNotify ? 'Envoi du test...' : '🔊 Tester l\'alerte sur mon téléphone'}</span>
                    </button>
                  </div>
                </div>

                {notifyTestStatus && (
                  <div style={{
                    padding: '0.65rem 0.95rem',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    background: notifyTestStatus.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: notifyTestStatus.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${notifyTestStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.25rem'
                  }}>
                    <span>{notifyTestStatus.text}</span>
                    <button
                      type="button"
                      onClick={() => setNotifyTestStatus(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', padding: '0 4px' }}
                    >✕</button>
                  </div>
                )}
              </div>

              {/* Filter Controls */}
              <div className={styles.tableControls}>
                <div className={styles.searchBox}>
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Rechercher client, téléphone, N° commande, wilaya, commune..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                  {orderSearchQuery && (
                    <button
                      onClick={() => setOrderSearchQuery('')}
                      className={styles.clearSearchBtn}
                    >✕</button>
                  )}
                </div>

                <div className={styles.orderFilterPills}>
                  {[
                    { id: 'all', label: `Toutes (${orders.length})` },
                    { id: 'en_attente', label: `⏳ En attente (${orders.filter(o => o.status === 'en_attente').length})` },
                    { id: 'confirmee', label: `✅ Confirmées (${orders.filter(o => o.status === 'confirmee').length})` },
                    { id: 'annulee', label: `❌ Annulées (${orders.filter(o => o.status === 'annulee').length})` },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={`${styles.orderPillBtn} ${orderStatusFilter === filter.id ? styles.orderPillActive : ''}`}
                      onClick={() => setOrderStatusFilter(filter.id as OrderStatus | 'all')}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders List / Cards */}
              {filteredOrders.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>📦</span>
                  <p className={styles.emptyTitle}>Aucune commande trouvée</p>
                  <p className={styles.emptySub}>
                    {orderSearchQuery || orderStatusFilter !== 'all'
                      ? 'Aucune commande ne correspond à votre recherche.'
                      : 'Les commandes passées directement sur le site apparaîtront ici avec toutes les coordonnées.'}
                  </p>
                </div>
              ) : (
                <div className={styles.ordersListGrid}>
                  {filteredOrders.map((ord) => {
                    const formattedDate = new Date(ord.createdAt).toLocaleDateString('fr-DZ', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={ord.id} className={styles.orderCardItem} id={`order-card-${ord.id}`}>
                        {/* Card Header */}
                        <div className={styles.orderCardTop}>
                          <div className={styles.orderNumberGroup}>
                            <span className={styles.orderNumTag}>#{ord.orderNumber}</span>
                            <span className={styles.orderDate}>{formattedDate}</span>
                          </div>

                          <div className={styles.statusDropdownWrapper}>
                            <select
                              value={ord.status}
                              onChange={(e) => {
                                updateStatus(ord.id, e.target.value as OrderStatus);
                                showNotification(`Statut de la commande #${ord.orderNumber} mis à jour.`);
                              }}
                              className={`${styles.statusSelect} ${styles[`status_${ord.status}`]}`}
                            >
                              <option value="en_attente">⏳ En attente</option>
                              <option value="confirmee">✅ Confirmée</option>
                              <option value="annulee">❌ Annulée</option>
                            </select>
                          </div>
                        </div>

                        {/* Customer Information */}
                        <div className={styles.orderCustomerBox}>
                          <div className={styles.custMainInfo}>
                            <strong className={styles.custName}>{ord.customerName}</strong>
                            <div className={styles.custPhoneRow}>
                              <a href={`tel:${ord.customerPhone}`} className={styles.phoneCallLink}>
                                📞 {ord.customerPhone}
                              </a>
                              <a
                                href={`https://wa.me/213${ord.customerPhone.replace(/^0/, '')}?text=Bonjour%20${encodeURIComponent(ord.customerName)},%20je%20vous%20contacte%20concernant%20votre%20commande%20${ord.orderNumber}%20sur%20Velime.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.whatsAppLink}
                                title="Envoyer message WhatsApp"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          </div>

                          <div className={styles.custAddressInfo}>
                            <span className={styles.destBadge}>
                              📍 <strong>{ord.wilayaName} ({ord.wilayaCode})</strong> — {ord.commune}
                            </span>
                            <span className={styles.deliveryTypeBadge}>
                              {ord.deliveryType === 'domicile' ? '🏠 À Domicile' : '🏢 Bureau (Stop-Desk)'}
                            </span>
                          </div>
                        </div>

                        {/* Items in this Order */}
                        <div className={styles.orderItemsList}>
                          {ord.items.map((item, idx) => (
                            <div
                              key={idx}
                              className={styles.orderItemRow}
                              onClick={() => setInspectingOrder(ord)}
                              title="Cliquer pour voir l'article exactement en grand format"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className={styles.orderItemThumb}
                              />
                              <div className={styles.orderItemDetails}>
                                <div className={styles.orderItemTitleRow}>
                                  <span className={styles.orderItemTitle}>{item.productName}</span>
                                  <span className={styles.inspectBadge}>👁️ Voir l&apos;article</span>
                                </div>
                                <span className={styles.orderItemMeta}>
                                  Taille : <strong>{item.size}</strong> {item.color ? `• Couleur : ${item.color}` : ''} • Qté : <strong>{item.quantity}</strong>
                                </span>
                              </div>
                              <span className={styles.orderItemPrice}>{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Card Bottom: Fees & Total */}
                        <div className={styles.orderCardBottom}>
                          <div className={styles.orderFeeRow}>
                            <span className={styles.subtleFee}>Livraison : {formatPrice(ord.deliveryCost)}</span>
                            <span className={styles.orderTotalAmount}>
                              Total à encaisser : <strong>{formatPrice(ord.totalAmount)}</strong>
                            </span>
                          </div>

                          <div className={styles.orderCardActions}>
                            <button
                              type="button"
                              onClick={() => setInspectingOrder(ord)}
                              className={styles.inspectOrderActionBtn}
                            >
                              👁️ Voir l&apos;article & Détails
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyBordereau(ord)}
                              className={styles.copyBordereauBtn}
                              title="Copier les coordonnées pour le livreur"
                            >
                              📋 Copier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Supprimer définitivement la commande #${ord.orderNumber} ?`)) {
                                  removeOrder(ord.id);
                                  showNotification(`Commande #${ord.orderNumber} supprimée.`);
                                }
                              }}
                              className={styles.deleteOrderBtn}
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ============================================================
                  MODAL: INSPECT ORDER & EXACT ARTICLE DETAILS
                 ============================================================ */}
              {inspectingOrder && (
                <div
                  className={styles.inspectorOverlay}
                  onClick={() => setInspectingOrder(null)}
                >
                  <div
                    className={styles.inspectorModal}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className={styles.inspectorHeader}>
                      <div className={styles.inspectorHeaderLeft}>
                        <span className={styles.inspectorOrderNum}>Commande #{inspectingOrder.orderNumber}</span>
                        <span className={styles.inspectorDate}>
                          {new Date(inspectingOrder.createdAt).toLocaleDateString('fr-DZ', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className={styles.inspectorHeaderRight}>
                        <select
                          value={inspectingOrder.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as OrderStatus;
                            updateStatus(inspectingOrder.id, newStatus);
                            setInspectingOrder({ ...inspectingOrder, status: newStatus });
                            showNotification(`Statut #${inspectingOrder.orderNumber} : ${newStatus}`);
                          }}
                          className={`${styles.statusSelect} ${styles[`status_${inspectingOrder.status}`]}`}
                        >
                          <option value="en_attente">⏳ En attente</option>
                          <option value="confirmee">✅ Confirmée</option>
                          <option value="annulee">❌ Annulée</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setInspectingOrder(null)}
                          className={styles.modalCloseBtn}
                          aria-label="Fermer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Modal Content */}
                    <div className={styles.inspectorBody}>
                      {/* 1. ARTICLES COMMANDÉS */}
                      <div className={styles.inspectorSection}>
                        <h3 className={styles.inspectorSectionTitle}>
                          👗 Article{inspectingOrder.items.length > 1 ? 's' : ''} commandé{inspectingOrder.items.length > 1 ? 's' : ''} ({inspectingOrder.items.length})
                        </h3>

                        <div className={styles.inspectorArticlesList}>
                          {inspectingOrder.items.map((item: OrderItem, idx: number) => {
                            const matchedProduct = products.find(
                              (p) =>
                                p.id === item.productId ||
                                (item.productSlug && p.slug === item.productSlug) ||
                                p.name.toLowerCase() === item.productName.toLowerCase()
                            );
                            const productUrl = matchedProduct?.slug
                              ? `/produit/${matchedProduct.slug}`
                              : (item.productSlug ? `/produit/${item.productSlug}` : `/boutique`);

                            return (
                              <div key={idx} className={styles.inspectorArticleCard}>
                                <div
                                  className={styles.inspectorImgCol}
                                  onClick={() => setPreviewImageModal(item.productImage)}
                                  title="Cliquer pour voir la photo en grand format"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className={styles.inspectorBigImg}
                                  />
                                  <span className={styles.zoomHoverBadge}>🔍 Agrandir</span>
                                </div>

                                <div className={styles.inspectorArticleDetails}>
                                  <div className={styles.artHeadRow}>
                                    <div>
                                      <h4 className={styles.inspectorArtName}>{item.productName}</h4>
                                      {matchedProduct?.category && (
                                        <span className={styles.artCategoryBadge}>{matchedProduct.category}</span>
                                      )}
                                    </div>
                                    <span className={styles.inspectorArtPrice}>
                                      {formatPrice(item.price * item.quantity)}
                                    </span>
                                  </div>

                                  {/* Ordered Attributes */}
                                  <div className={styles.inspectorAttributesGrid}>
                                    <div className={styles.attributeItem}>
                                      <span className={styles.attributeLabel}>Taille :</span>
                                      <span className={styles.attributeValueHighlight}>{item.size}</span>
                                    </div>

                                    <div className={styles.attributeItem}>
                                      <span className={styles.attributeLabel}>Couleur :</span>
                                      <div className={styles.attributeColorVal}>
                                        {item.color && (
                                          <span
                                            className={styles.attrColorDot}
                                            style={{ backgroundColor: getColorHex(item.color) }}
                                          />
                                        )}
                                        <span>{item.color || 'Standard'}</span>
                                      </div>
                                    </div>

                                    <div className={styles.attributeItem}>
                                      <span className={styles.attributeLabel}>Quantité :</span>
                                      <span className={styles.attributeValueHighlight}>{item.quantity}</span>
                                    </div>

                                    <div className={styles.attributeItem}>
                                      <span className={styles.attributeLabel}>Prix unitaire :</span>
                                      <span>{formatPrice(item.price)}</span>
                                    </div>
                                  </div>

                                  {/* Direct Live Link Button */}
                                  <div className={styles.artActionRow}>
                                    <a
                                      href={productUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.btnOpenProductPage}
                                    >
                                      🔗 Voir la fiche de cet article sur le site ↗
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. CLIENT & DESTINATION */}
                      <div className={styles.inspectorSection}>
                        <h3 className={styles.inspectorSectionTitle}>👤 Coordonnées du Client & Livraison</h3>
                        <div className={styles.inspectorClientGrid}>
                          <div className={styles.clientDetailBlock}>
                            <span className={styles.clientBlockLabel}>Nom du Client :</span>
                            <strong className={styles.clientNameText}>{inspectingOrder.customerName}</strong>
                          </div>

                          <div className={styles.clientDetailBlock}>
                            <span className={styles.clientBlockLabel}>Numéro de Téléphone :</span>
                            <div className={styles.clientPhoneActions}>
                              <a href={`tel:${inspectingOrder.customerPhone}`} className={styles.modalPhoneCallBtn}>
                                📞 {inspectingOrder.customerPhone}
                              </a>
                              <a
                                href={`https://wa.me/213${inspectingOrder.customerPhone.replace(/^0/, '')}?text=Bonjour%20${encodeURIComponent(inspectingOrder.customerName)},%20je%20vous%20contacte%20concernant%20votre%20commande%20${inspectingOrder.orderNumber}%20sur%20Velime.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.modalWhatsAppBtn}
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          </div>

                          <div className={styles.clientDetailBlock}>
                            <span className={styles.clientBlockLabel}>Destination :</span>
                            <span className={styles.clientDestText}>
                              📍 <strong>{inspectingOrder.wilayaName} ({inspectingOrder.wilayaCode})</strong> — {inspectingOrder.commune}
                            </span>
                          </div>

                          <div className={styles.clientDetailBlock}>
                            <span className={styles.clientBlockLabel}>Mode d&apos;expédition :</span>
                            <span className={styles.clientDeliveryModeBadge}>
                              {inspectingOrder.deliveryType === 'domicile' ? '🏠 À Domicile (remise en main propre)' : '🏢 Bureau / Stop-Desk (retrait en agence)'}
                            </span>
                          </div>

                          {inspectingOrder.notes && (
                            <div className={`${styles.clientDetailBlock} ${styles.clientNotesFull}`}>
                              <span className={styles.clientBlockLabel}>Remarques / Adresse détaillée :</span>
                              <p className={styles.clientNotesText}>{inspectingOrder.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. TOTAL FINANCIER */}
                      <div className={styles.inspectorSection}>
                        <h3 className={styles.inspectorSectionTitle}>💵 Détail Financier à Encaisser</h3>
                        <div className={styles.inspectorFinancialBox}>
                          <div className={styles.finRow}>
                            <span>Sous-total articles :</span>
                            <span>{formatPrice(inspectingOrder.itemsSubtotal)}</span>
                          </div>
                          <div className={styles.finRow}>
                            <span>Frais de livraison ({inspectingOrder.wilayaName}) :</span>
                            <span>{formatPrice(inspectingOrder.deliveryCost)}</span>
                          </div>
                          <div className={styles.finTotalRow}>
                            <div>
                              <strong>TOTAL À ENCAISSER</strong>
                              <span className={styles.finSub}>Paiement à la livraison</span>
                            </div>
                            <span className={styles.finTotalValue}>
                              {formatPrice(inspectingOrder.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer Actions */}
                    <div className={styles.inspectorFooter}>
                      <button
                        type="button"
                        onClick={() => handleCopyBordereau(inspectingOrder)}
                        className={styles.btnCopyBordereauModal}
                      >
                        {copiedBordereau ? '✅ Bordereau Copié !' : '📋 Copier la fiche pour le livreur'}
                      </button>

                      <div className={styles.inspectorFooterRight}>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Supprimer définitivement la commande #${inspectingOrder.orderNumber} ?`)) {
                              removeOrder(inspectingOrder.id);
                              setInspectingOrder(null);
                              showNotification(`Commande supprimée.`);
                            }
                          }}
                          className={styles.btnDeleteOrderModal}
                        >
                          🗑️ Supprimer
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectingOrder(null)}
                          className={styles.btnCloseModalPrimary}
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  LIGHTBOX: IMAGE ZOOM MODAL
                 ============================================================ */}
              {previewImageModal && (
                <div
                  className={styles.lightboxOverlay}
                  onClick={() => setPreviewImageModal(null)}
                  title="Cliquer n'importe où pour fermer"
                >
                  <div className={styles.lightboxContainer} onClick={(e) => e.stopPropagation()}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewImageModal}
                      alt="Article Velime agrandi"
                      className={styles.lightboxImg}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImageModal(null)}
                      className={styles.lightboxCloseBtn}
                    >
                      ✕ Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: PRODUCTS
             ============================================================ */}
          {activeTab === 'products' && (
            <div className={styles.tabSection}>
              {/* Filter bar */}
              <div className={styles.tableControls}>
                <div className={styles.searchBox}>
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Rechercher un article..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.catFilterGroup}>
                  <span className={styles.filterLabel}>Filtrer :</span>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="all">Toutes les catégories ({products.length})</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name} ({products.filter((p) => p.category === cat.name).length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Table */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <span>Article</span>
                  <span>Catégorie</span>
                  <span>Prix</span>
                  <span>Couleurs & Tailles</span>
                  <span>État du Stock</span>
                  <span className={styles.textRight}>Actions</span>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>Aucun article trouvé.</p>
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const status = p.stockStatus || (p.inStock ? 'in_stock' : 'total_out');
                    return (
                      <div key={p.id} className={styles.tableRow} id={`product-row-${p.id}`}>
                        {/* Name & Thumb */}
                        <div className={styles.prodCol}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image || '/images/p1.jpg'} alt={p.name} className={styles.prodThumb} />
                          <div>
                            <p className={styles.prodName}>{p.name}</p>
                            <p className={styles.prodSlug}>/{p.slug}</p>
                          </div>
                        </div>

                        {/* Category */}
                        <div>
                          <span className={styles.catBadge}>{p.category}</span>
                        </div>

                        {/* Price */}
                        <div>
                          <p className={styles.priceText}>{formatPrice(p.price)}</p>
                          {p.originalPrice && (
                            <span className={styles.oldPriceText}>{formatPrice(p.originalPrice)}</span>
                          )}
                        </div>

                        {/* Colors & Sizes display */}
                        <div className={styles.variantsCol}>
                          {p.colors && p.colors.length > 0 && (
                            <div className={styles.colorDotsRow}>
                              {p.colors.map((c) => (
                                <span
                                  key={c}
                                  className={styles.colorDotBadge}
                                  style={{ backgroundColor: getColorHex(c) }}
                                  title={c}
                                />
                              ))}
                            </div>
                          )}
                          <div className={styles.sizesRowText}>
                            {p.sizes.join(', ')}
                          </div>
                        </div>

                        {/* Stock status - Opens dedicated Stock Management Modal */}
                        <div>
                          <button
                            type="button"
                            className={`${styles.stockStatusBadge} ${
                              status === 'in_stock'
                                ? styles.statusInStock
                                : status === 'partial_out'
                                ? styles.statusPartialOut
                                : styles.statusTotalOut
                            }`}
                            onClick={() => openStockModal(p)}
                            title="Gérer le stock et les disponibilités de cet article"
                          >
                            <span className={styles.statusDot} />
                            <span>
                              {status === 'in_stock' && 'En Stock'}
                              {status === 'partial_out' && 'Rupture Partielle'}
                              {status === 'total_out' && 'Rupture Totale'}
                            </span>
                            <span className={styles.stockManageIcon}>⚙️</span>
                          </button>
                        </div>

                        {/* Actions */}
                        <div className={styles.actionsCol}>
                          <button
                            onClick={() => openEditProductModal(p)}
                            className={styles.actionBtnEdit}
                            title="Modifier"
                          >
                            Modifier
                          </button>

                          {confirmDeleteProductId === p.id ? (
                            <div className={styles.inlineConfirmRow}>
                              <span className={styles.inlineConfirmText}>Confirmer ?</span>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className={styles.inlineConfirmYes}
                              >
                                ✓ Oui
                              </button>
                              <button
                                onClick={() => setConfirmDeleteProductId(null)}
                                className={styles.inlineConfirmNo}
                              >
                                ✕ Non
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteProductId(p.id)}
                              className={styles.actionBtnDelete}
                              title="Supprimer"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              TAB: CATEGORIES
             ============================================================ */}
          {activeTab === 'categories' && (
            <div className={styles.tabSection}>
              <div className={styles.categoriesGrid}>
                {categories.map((cat) => {
                  const count = products.filter((p) => p.category === cat.name).length;
                  const catImage = cat.image || '/images/p1.jpg';
                  return (
                    <div key={cat.id} className={styles.categoryCard} id={`cat-card-${cat.id}`}>
                      <div className={styles.catCardPhotoWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={catImage} alt={cat.name} className={styles.catCardPhoto} />
                        <span className={styles.catCountBadge}>{count} article{count !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className={styles.catCardBody}>
                        <div className={styles.catCardHeader}>
                          <h3 className={styles.catCardTitle}>{cat.name}</h3>
                        </div>
                        <p className={styles.catCardSlug}>Slug : /{cat.slug}</p>
                        {cat.description && (
                          <p className={styles.catCardDesc}>{cat.description}</p>
                        )}
                        <div className={styles.catCardActions}>
                          <button
                            onClick={() => openEditCategoryModal(cat)}
                            className={styles.btnSecondary}
                          >
                            Modifier
                          </button>

                          {confirmDeleteCategoryId === cat.id ? (
                            <div className={styles.inlineConfirmRow}>
                              <span className={styles.inlineConfirmText}>Confirmer ?</span>
                              <button
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className={styles.inlineConfirmYes}
                              >
                                ✓ Oui
                              </button>
                              <button
                                onClick={() => setConfirmDeleteCategoryId(null)}
                                className={styles.inlineConfirmNo}
                              >
                                ✕ Non
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteCategoryId(cat.id)}
                              className={styles.btnDanger}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================
              TAB: HERO & HOME
             ============================================================ */}
          {activeTab === 'hero' && (
            <div className={styles.tabSection}>
              <div className={styles.twoColLayout}>
                <div className={styles.card}>
                  <h2 className={styles.cardSectionTitle}>Textes de la Bannière Principale</h2>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="hero-name-input">Grand Titre (Nom de Marque)</label>
                    <input
                      id="hero-name-input"
                      className={styles.formInput}
                      value={heroForm.title}
                      onChange={(e) => setHeroForm(h => ({ ...h, title: e.target.value }))}
                      placeholder="Ex: VELIME"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="hero-sub-input">Sous-titre / Slogan</label>
                    <input
                      id="hero-sub-input"
                      className={styles.formInput}
                      value={heroForm.subtitle}
                      onChange={(e) => setHeroForm(h => ({ ...h, subtitle: e.target.value }))}
                      placeholder="Ex: L'élégance au quotidien"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="hero-cta-input">Texte du bouton CTA</label>
                    <input
                      id="hero-cta-input"
                      className={styles.formInput}
                      value={heroForm.ctaText}
                      onChange={(e) => setHeroForm(h => ({ ...h, ctaText: e.target.value }))}
                      placeholder="Ex: Découvrir"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Photo de Fond Principale *</label>
                    <div
                      className={`${styles.photoUploadDropzone} ${heroDragActive ? styles.dropzoneActive : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setHeroDragActive(true); }}
                      onDragLeave={() => setHeroDragActive(false)}
                      onDrop={handleHeroDrop}
                    >
                      {heroForm.image ? (
                        <div className={styles.uploadedPreviewContainer}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={heroForm.image} alt="Aperçu Bannière" className={styles.uploadedHeroImg} />
                          <div className={styles.uploadedOverlayActions}>
                            <label className={styles.uploadBtnOverlay}>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleHeroFileUpload}
                                style={{ display: 'none' }}
                              />
                              <span>📷 Changer la photo</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setHeroForm(h => ({ ...h, image: '/images/hero-fabric.jpg' }))}
                              className={styles.resetPhotoBtn}
                            >
                              Réinitialiser
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className={styles.dropzoneLabel}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHeroFileUpload}
                            style={{ display: 'none' }}
                          />
                          <div className={styles.dropzoneContent}>
                            <UploadIcon />
                            <p className={styles.dropzoneMainText}>
                              Cliquez pour choisir une photo ou glissez-déposez ici
                            </p>
                            <span className={styles.dropzoneSubText}>JPG, PNG, WEBP acceptés</span>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <button className={styles.saveHeroBtn} onClick={handleSaveHero}>
                    Enregistrer la page d&apos;accueil
                  </button>
                </div>

                {/* Preview */}
                <div className={styles.card}>
                  <h2 className={styles.cardSectionTitle}>Aperçu du Rendu</h2>
                  <div
                    className={styles.heroLivePreview}
                    style={{
                      backgroundImage: `url(${heroForm.image || heroImage || '/images/hero-fabric.jpg'})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className={styles.previewContent}>
                      <h2 className={styles.previewBrandTitle}>{heroForm.title || 'VELIME'}</h2>
                      <div className={styles.previewLine} />
                      <p className={styles.previewTagline}>{heroForm.subtitle}</p>
                      <span className={styles.previewButton}>{heroForm.ctaText}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB: BRANDS
             ============================================================ */}
          {activeTab === 'brands' && (
            <div className={styles.tabSection}>
              <div className={styles.card}>
                <div className={styles.brandsHeaderRow}>
                  <div>
                    <h2 className={styles.cardSectionTitle}>Marques du Bandeau Défilant</h2>
                    <p className={styles.cardDesc}>Ces marques défilent en continu sous la bannière principale.</p>
                  </div>
                  <button onClick={handleAddBrand} className={styles.addPrimaryBtn}>
                    <PlusIcon />
                    <span>Ajouter une marque</span>
                  </button>
                </div>

                <div className={styles.brandsTagsList}>
                  {brands.map((brand, i) => (
                    <div key={i} className={styles.brandTag}>
                      <span>{brand}</span>
                      <button
                        onClick={() => handleRemoveBrand(i)}
                        className={styles.brandTagRemove}
                        title={`Supprimer ${brand}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB: LOOKBOOK & SHOWCASE GALLERY
             ============================================================ */}
          {activeTab === 'lookbook' && (
            <div className={styles.tabSection}>
              <div className={styles.card}>
                <div className={styles.lookbookHeaderRow}>
                  <div>
                    <h2 className={styles.cardSectionTitle}>Photos Défilantes du Lookbook ({lookbookList.length} photos)</h2>
                    <p className={styles.cardDesc}>
                      Ces photos s&apos;affichent avec une animation horizontale continue sur la page d&apos;accueil. Téléchargez vos propres photos de tenues portées ci-dessous.
                    </p>
                  </div>
                </div>

                {/* Direct Upload & Dropzone */}
                <div
                  className={`${styles.photoUploadDropzone} ${lookbookDragActive ? styles.dropzoneActive : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setLookbookDragActive(true); }}
                  onDragLeave={() => setLookbookDragActive(false)}
                  onDrop={handleLookbookDrop}
                >
                  <label className={styles.dropzoneLabel}>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleAddLookbookPhotoFiles}
                      style={{ display: 'none' }}
                    />
                    <div className={styles.dropzoneContent}>
                      <UploadIcon />
                      <p className={styles.dropzoneMainText}>
                        📁 Télécharger vos photos depuis votre téléphone / ordinateur
                      </p>
                      <span className={styles.dropzoneSubText}>
                        Sélectionnez une ou plusieurs photos (JPG, PNG, WEBP) ou glissez-les ici
                      </span>
                    </div>
                  </label>
                </div>

                {/* Grid of current Lookbook photos */}
                <div className={styles.lookbookGrid}>
                  {lookbookList.map((photoSrc, idx) => (
                    <div key={idx} className={styles.lookbookCardItem}>
                      <span className={styles.lookbookCardIndex}>#{idx + 1}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoSrc} alt={`Lookbook ${idx + 1}`} className={styles.lookbookCardImg} />
                      <button
                        type="button"
                        onClick={() => handleRemoveLookbookPhoto(idx)}
                        className={styles.lookbookCardRemoveBtn}
                        title="Supprimer cette photo"
                      >
                        ✕ Supprimer
                      </button>
                    </div>
                  ))}
                </div>

                <div className={styles.lookbookSaveRow}>
                  <button onClick={handleSaveLookbook} className={styles.saveHeroBtn} id="save-lookbook-btn">
                    Enregistrer la Galerie Lookbook ({lookbookList.length} photos)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================
          MODAL: DEDICATED QUICK STOCK MANAGEMENT
         ============================================================ */}
      {stockModalProduct && (
        <div
          className={styles.modalOverlay}
          onClick={() => setStockModalProduct(null)}
        >
          <div
            className={styles.stockModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.stockModalHeader}>
              <div className={styles.stockModalProdHeader}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stockModalProduct.image || (stockModalProduct.images && stockModalProduct.images[0]) || '/images/p1.jpg'}
                  alt={stockModalProduct.name}
                  className={styles.stockModalThumb}
                />
                <div>
                  <span className={styles.stockModalTag}>Gestion du Stock</span>
                  <h3 className={styles.stockModalTitle}>{stockModalProduct.name}</h3>
                  <span className={styles.stockModalPrice}>
                    {formatPrice(stockModalProduct.price)} • {stockModalProduct.category}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className={styles.modalCloseBtn}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className={styles.stockModalBody}>
              {/* Radio Options */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Choisir la disponibilité de cet article :</label>
                <div className={styles.stockRadioGroup}>
                  <label
                    className={`${styles.radioLabel} ${
                      quickStockStatus === 'in_stock' ? styles.radioSelected : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="quickStockStatus"
                      value="in_stock"
                      checked={quickStockStatus === 'in_stock'}
                      onChange={() => {
                        setQuickStockStatus('in_stock');
                        setQuickStockMatrix((prev) => prev.map((m) => ({ ...m, inStock: true })));
                      }}
                    />
                    <div>
                      <strong className={styles.stockGreenText}>🟢 En Stock (Total)</strong>
                      <p className={styles.stockSubText}>
                        Toutes les tailles ({stockModalProduct.sizes?.join(', ') || 'toutes'}) et couleurs sont disponibles à la vente.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`${styles.radioLabel} ${
                      quickStockStatus === 'partial_out' ? styles.radioSelected : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="quickStockStatus"
                      value="partial_out"
                      checked={quickStockStatus === 'partial_out'}
                      onChange={() => setQuickStockStatus('partial_out')}
                    />
                    <div>
                      <strong className={styles.stockOrangeText}>🟡 Rupture Partielle (Par Taille & Couleur)</strong>
                      <p className={styles.stockSubText}>
                        Définissez ci-dessous précisément quelles tailles ou couleurs sont en stock ou épuisées.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`${styles.radioLabel} ${
                      quickStockStatus === 'total_out' ? styles.radioSelected : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="quickStockStatus"
                      value="total_out"
                      checked={quickStockStatus === 'total_out'}
                      onChange={() => {
                        setQuickStockStatus('total_out');
                        setQuickStockMatrix((prev) => prev.map((m) => ({ ...m, inStock: false })));
                      }}
                    />
                    <div>
                      <strong className={styles.stockRedText}>🔴 Rupture Totale (Épuisé)</strong>
                      <p className={styles.stockSubText}>
                        L&apos;article est entièrement en rupture. Le bouton de commande sera bloqué sur le site.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Matrice Taille x Couleur si Rupture Partielle */}
              {quickStockStatus === 'partial_out' && (
                <div className={styles.matrixBox}>
                  <div className={styles.matrixHeaderRow}>
                    <div>
                      <h4 className={styles.matrixTitle}>Matrice de Disponibilité Croisée</h4>
                      <p className={styles.matrixSub}>
                        Cliquez directement sur une case pour basculer entre <strong style={{ color: '#166534' }}>✓ En stock</strong> et <strong style={{ color: '#991B1B' }}>✕ Épuisé</strong>.
                      </p>
                    </div>

                    <div className={styles.matrixToolbar}>
                      <button
                        type="button"
                        onClick={() => setAllQuickMatrixStock(true)}
                        className={styles.matrixToolBtn}
                      >
                        ✓ Tout en stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllQuickMatrixStock(false)}
                        className={styles.matrixToolBtn}
                      >
                        ✕ Tout épuisé
                      </button>
                    </div>
                  </div>

                  <div className={styles.matrixTableWrapper}>
                    <table className={styles.matrixTable}>
                      <thead>
                        <tr>
                          <th className={styles.matrixThCorner}>Couleur \ Taille</th>
                          {(stockModalProduct.sizes || ['S', 'M', 'L']).map((sz) => (
                            <th key={sz} className={styles.matrixThSize}>
                              <div className={styles.sizeThHeader}>
                                <span>{sz}</span>
                                <div className={styles.thQuickBtns}>
                                  <button
                                    type="button"
                                    onClick={() => toggleQuickSizeColumn(sz, true)}
                                    title={`Tout en stock pour ${sz}`}
                                    className={styles.miniColBtn}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleQuickSizeColumn(sz, false)}
                                    title={`Tout épuisé pour ${sz}`}
                                    className={styles.miniColBtn}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(stockModalProduct.colors && stockModalProduct.colors.length > 0 ? stockModalProduct.colors : ['Standard']).map((col) => (
                          <tr key={col}>
                            <td className={styles.matrixTdColor}>
                              <div className={styles.colorTdContent}>
                                <span
                                  className={styles.matrixColorDot}
                                  style={{ backgroundColor: getColorHex(col) }}
                                />
                                <span>{col}</span>
                              </div>
                            </td>
                            {(stockModalProduct.sizes || ['S', 'M', 'L']).map((sz) => {
                              const match = quickStockMatrix.find(
                                (m) => m.size === sz && (m.color || 'Standard') === col
                              );
                              const inStock = match ? match.inStock : true;

                              return (
                                <td key={`${sz}-${col}`} className={styles.matrixTdCell}>
                                  <button
                                    type="button"
                                    onClick={() => toggleQuickMatrixCell(sz, col)}
                                    className={`${styles.matrixCellBtn} ${
                                      inStock ? styles.cellInStock : styles.cellOutOfStock
                                    }`}
                                  >
                                    {inStock ? (
                                      <>
                                        <span className={styles.cellIcon}>✓</span>
                                        <span>En stock</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className={styles.cellIcon}>✕</span>
                                        <span>Épuisé</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.stockModalFooter}>
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className={styles.stockModalCancelBtn}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveQuickStock}
                className={styles.stockModalSaveBtn}
              >
                💾 Enregistrer le Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: PRODUCT (ADD / EDIT)
         ============================================================ */}
      {isProductModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsProductModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingProduct ? `Modifier l'article « ${editingProduct.name} »` : 'Ajouter un nouvel article'}
              </h2>
              <button onClick={() => setIsProductModalOpen(false)} className={styles.modalCloseBtn}>✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className={styles.modalForm}>
              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nom de l&apos;article *</label>
                  <input
                    required
                    className={styles.formInput}
                    value={prodForm.name}
                    onChange={(e) => setProdForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Robe Satin Champagne"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Catégorie *</label>
                  <select
                    className={styles.formInput}
                    value={prodForm.category}
                    onChange={(e) => setProdForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Prix de vente (DZD) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    className={styles.formInput}
                    value={prodForm.price}
                    onChange={(e) => setProdForm(f => ({ ...f, price: Number(e.target.value) }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Prix d&apos;origine / Barré (Optionnel)</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.formInput}
                    value={prodForm.originalPrice}
                    onChange={(e) => setProdForm(f => ({ ...f, originalPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="Ex: 8500"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description de l&apos;article</label>
                <textarea
                  rows={3}
                  className={styles.formTextarea}
                  value={prodForm.description}
                  onChange={(e) => setProdForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Coupe, matière, finitions, entretien..."
                />
              </div>

              {/* ============================================================
                  COULEURS DU PRODUIT
                 ============================================================ */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Couleurs disponibles pour cet article ({prodForm.colors.length} sélectionnée(s))
                </label>
                
                <div className={styles.colorPillsPalette}>
                  {COLOR_PALETTE.map((pal) => {
                    const isSelected = prodForm.colors.includes(pal.name);
                    return (
                      <button
                        key={pal.name}
                        type="button"
                        className={`${styles.colorPaletteBtn} ${isSelected ? styles.colorPaletteBtnActive : ''}`}
                        onClick={() => {
                          let updated: string[];
                          if (isSelected) {
                            updated = prodForm.colors.filter(c => c !== pal.name);
                          } else {
                            updated = [...prodForm.colors, pal.name];
                          }
                          setProdForm(f => ({
                            ...f,
                            colors: updated,
                            availableColors: updated,
                            stockMatrix: syncMatrix(f.sizes, updated, f.stockMatrix),
                          }));
                        }}
                      >
                        <span className={styles.colorPaletteDot} style={{ backgroundColor: pal.hex }} />
                        <span>{pal.name}</span>
                        {isSelected && <span className={styles.colorCheckMark}>✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Display any custom colors that aren't in the default palette */}
                {prodForm.colors.filter((c) => !COLOR_PALETTE.some((p) => p.name.toLowerCase() === c.toLowerCase())).length > 0 && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8c7864', fontWeight: 600 }}>Couleurs personnalisées :</span>
                    {prodForm.colors
                      .filter((c) => !COLOR_PALETTE.some((p) => p.name.toLowerCase() === c.toLowerCase()))
                      .map((customCol) => (
                        <span
                          key={customCol}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.3rem 0.75rem',
                            backgroundColor: '#2b221a',
                            color: '#ffffff',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          <span>{customCol}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = prodForm.colors.filter((c) => c !== customCol);
                              setProdForm((f) => ({
                                ...f,
                                colors: updated,
                                availableColors: updated,
                                stockMatrix: syncMatrix(f.sizes, updated, f.stockMatrix),
                              }));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ffaaaa',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              lineHeight: 1,
                              padding: 0,
                            }}
                            title={`Supprimer ${customCol}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* Custom Color Adder */}
                <div className={styles.customAdderRow}>
                  <input
                    type="text"
                    placeholder="Autre couleur (ex: Lilas, Doré, Émeraude)..."
                    value={prodForm.customColorInput}
                    onChange={(e) => setProdForm(f => ({ ...f, customColorInput: e.target.value }))}
                    className={styles.formInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomColor();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomColor}
                    className={styles.addImageBtn}
                  >
                    + Ajouter couleur
                  </button>
                </div>
              </div>

              {/* ============================================================
                  TAILLES DU PRODUIT
                 ============================================================ */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Tailles disponibles pour cet article ({prodForm.sizes.length} sélectionnée(s))
                </label>
                
                <div className={styles.sizePillsRow}>
                  {DEFAULT_SIZES.map((sz) => {
                    const isSelected = prodForm.sizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        className={`${styles.sizePillBtn} ${isSelected ? styles.sizePillBtnActive : ''}`}
                        onClick={() => {
                          let updatedSizes: string[];
                          if (isSelected) {
                            updatedSizes = prodForm.sizes.filter(s => s !== sz);
                          } else {
                            updatedSizes = [...prodForm.sizes, sz];
                          }
                          setProdForm(f => ({
                            ...f,
                            sizes: updatedSizes,
                            availableSizes: updatedSizes,
                            stockMatrix: syncMatrix(updatedSizes, f.colors, f.stockMatrix),
                          }));
                        }}
                      >
                        <span>{sz}</span>
                        {isSelected && <span className={styles.colorCheckMark}>✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Display any custom sizes that aren't in DEFAULT_SIZES */}
                {prodForm.sizes.filter((s) => !DEFAULT_SIZES.includes(s)).length > 0 && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8c7864', fontWeight: 600 }}>Tailles personnalisées :</span>
                    {prodForm.sizes
                      .filter((s) => !DEFAULT_SIZES.includes(s))
                      .map((customSz) => (
                        <span
                          key={customSz}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.3rem 0.75rem',
                            backgroundColor: '#2b221a',
                            color: '#ffffff',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          <span>{customSz}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedSizes = prodForm.sizes.filter((s) => s !== customSz);
                              setProdForm((f) => ({
                                ...f,
                                sizes: updatedSizes,
                                availableSizes: updatedSizes,
                                stockMatrix: syncMatrix(updatedSizes, f.colors, f.stockMatrix),
                              }));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ffaaaa',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              lineHeight: 1,
                              padding: 0,
                            }}
                            title={`Supprimer ${customSz}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* Custom Size Adder */}
                <div className={styles.customAdderRow}>
                  <input
                    type="text"
                    placeholder="Autre taille (ex: 38, 40, 42, 3XL)..."
                    value={prodForm.customSizeInput}
                    onChange={(e) => setProdForm(f => ({ ...f, customSizeInput: e.target.value }))}
                    className={styles.formInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSize();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSize}
                    className={styles.addImageBtn}
                  >
                    + Ajouter taille
                  </button>
                </div>
              </div>

              {/* ============================================================
                  GESTION DE L'ÉTAT DU STOCK & RUPTURE PARTIELLE
                 ============================================================ */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>État du Stock & Disponibilité *</label>
                <div className={styles.stockRadioGroup}>
                  <label className={`${styles.radioLabel} ${prodForm.stockStatus === 'in_stock' ? styles.radioSelected : ''}`}>
                    <input
                      type="radio"
                      name="stockStatus"
                      value="in_stock"
                      checked={prodForm.stockStatus === 'in_stock'}
                      onChange={() => setProdForm(f => ({
                        ...f,
                        stockStatus: 'in_stock',
                        badge: '',
                        stockMatrix: f.stockMatrix.map(m => ({ ...m, inStock: true })),
                      }))}
                    />
                    <div>
                      <strong className={styles.stockGreenText}>🟢 En Stock (Total)</strong>
                      <p className={styles.stockSubText}>Toutes les tailles et toutes les couleurs sélectionnées sont disponibles</p>
                    </div>
                  </label>

                  <label className={`${styles.radioLabel} ${prodForm.stockStatus === 'partial_out' ? styles.radioSelected : ''}`}>
                    <input
                      type="radio"
                      name="stockStatus"
                      value="partial_out"
                      checked={prodForm.stockStatus === 'partial_out'}
                      onChange={() => setProdForm(f => ({ ...f, stockStatus: 'partial_out', badge: 'Stock Limité' }))}
                    />
                    <div>
                      <strong className={styles.stockOrangeText}>🟡 Rupture Partielle (Matrice Taille × Couleur)</strong>
                      <p className={styles.stockSubText}>Définissez la disponibilité exacte pour chaque croisement Taille / Couleur ci-dessous</p>
                    </div>
                  </label>

                  <label className={`${styles.radioLabel} ${prodForm.stockStatus === 'total_out' ? styles.radioSelected : ''}`}>
                    <input
                      type="radio"
                      name="stockStatus"
                      value="total_out"
                      checked={prodForm.stockStatus === 'total_out'}
                      onChange={() => setProdForm(f => ({
                        ...f,
                        stockStatus: 'total_out',
                        badge: 'Rupture de Stock',
                        stockMatrix: f.stockMatrix.map(m => ({ ...m, inStock: false })),
                      }))}
                    />
                    <div>
                      <strong className={styles.stockRedText}>🔴 Rupture Totale</strong>
                      <p className={styles.stockSubText}>Article entièrement indisponible, bouton d&apos;achat bloqué</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ============================================================
                  MATRICE CROISÉE TAILLE × COULEUR (RUPTURE PARTIELLE)
                 ============================================================ */}
              {prodForm.stockStatus === 'partial_out' && (
                <div className={styles.matrixBox}>
                  <div className={styles.matrixHeaderRow}>
                    <div>
                      <h4 className={styles.matrixTitle}>Matrice de Disponibilité Croisée</h4>
                      <p className={styles.matrixSub}>
                        Cliquez sur une case pour basculer entre <strong>En stock (vert)</strong> et <strong>Épuisé (rouge)</strong>.
                      </p>
                    </div>

                    <div className={styles.matrixToolbar}>
                      <button
                        type="button"
                        onClick={() => setAllMatrixStock(true)}
                        className={styles.matrixToolBtn}
                      >
                        ✓ Tout en stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllMatrixStock(false)}
                        className={styles.matrixToolBtn}
                      >
                        ✕ Tout épuisé
                      </button>
                    </div>
                  </div>

                  <div className={styles.matrixTableWrapper}>
                    <table className={styles.matrixTable}>
                      <thead>
                        <tr>
                          <th className={styles.matrixThCorner}>Couleur \ Taille</th>
                          {prodForm.sizes.map((sz) => (
                            <th key={sz} className={styles.matrixThSize}>
                              <div className={styles.sizeThHeader}>
                                <span>{sz}</span>
                                <div className={styles.thQuickBtns}>
                                  <button
                                    type="button"
                                    onClick={() => toggleSizeColumn(sz, true)}
                                    title={`Tout en stock pour ${sz}`}
                                    className={styles.miniColBtn}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleSizeColumn(sz, false)}
                                    title={`Tout épuisé pour ${sz}`}
                                    className={styles.miniColBtn}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </th>
                          ))}
                          <th className={styles.matrixThActions}>Actions Ligne</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prodForm.colors.map((col) => (
                          <tr key={col} className={styles.matrixRow}>
                            <td className={styles.matrixTdColor}>
                              <div className={styles.matrixColorInfo}>
                                <span
                                  className={styles.matrixColorDot}
                                  style={{ backgroundColor: getColorHex(col) }}
                                />
                                <span className={styles.matrixColorName}>{col}</span>
                              </div>
                            </td>

                            {prodForm.sizes.map((sz) => {
                              const variant = prodForm.stockMatrix.find(
                                (v) => v.size === sz && v.color === col
                              );
                              const isCellInStock = variant ? variant.inStock : true;

                              return (
                                <td key={`${col}-${sz}`} className={styles.matrixTdCell}>
                                  <button
                                    type="button"
                                    className={`${styles.matrixCellBtn} ${
                                      isCellInStock ? styles.cellInStock : styles.cellOutOfStock
                                    }`}
                                    onClick={() => toggleMatrixCell(sz, col)}
                                    title={`${col} / ${sz} : ${isCellInStock ? 'En stock (cliquez pour épuiser)' : 'Épuisé (cliquez pour remettre en stock)'}`}
                                  >
                                    <span className={styles.cellStatusDot} />
                                    <span className={styles.cellStatusText}>
                                      {isCellInStock ? 'En stock' : 'Épuisé'}
                                    </span>
                                  </button>
                                </td>
                              );
                            })}

                            <td className={styles.matrixTdActions}>
                              <div className={styles.rowQuickActions}>
                                <button
                                  type="button"
                                  onClick={() => toggleColorRow(col, true)}
                                  className={styles.rowActionBtn}
                                  title={`Mettre toutes les tailles en stock pour ${col}`}
                                >
                                  Tout ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleColorRow(col, false)}
                                  className={styles.rowActionBtn}
                                  title={`Marquer toutes les tailles épuisées pour ${col}`}
                                >
                                  Tout ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Multiple Photos Gallery Management */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Galerie Photos de l&apos;Article ({prodForm.images.length} photo(s))
                </label>
                
                {prodForm.images.length > 0 ? (
                  <div className={styles.photosThumbList}>
                    {prodForm.images.map((imgUrl, idx) => (
                      <div key={idx} className={styles.photoThumbItem}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt={`Photo ${idx + 1}`} className={styles.galleryThumbImg} />
                        <div className={styles.photoThumbActions}>
                          {idx === 0 ? (
                            <span className={styles.primaryBadge}>Principale</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(idx)}
                              className={styles.setMainBtn}
                            >
                              Définir principale
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImageFromGallery(idx)}
                            className={styles.deletePhotoBtn}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyGalleryNotice}>
                    <span>📷 Aucune photo importée pour le moment. Cliquez ci-dessous pour choisir vos photos.</span>
                  </div>
                )}

                <div className={styles.addImageRow}>
                  <label className={styles.directUploadBtn}>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleProductFilesUpload}
                      style={{ display: 'none' }}
                    />
                    <UploadIcon />
                    <span>📁 Télécharger des photos depuis l&apos;appareil (Téléphone / Ordinateur)</span>
                  </label>
                </div>
              </div>

              {/* Flags */}
              <div className={styles.formGridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Badge Spécial (Optionnel)</label>
                  <input
                    className={styles.formInput}
                    value={prodForm.badge}
                    onChange={(e) => setProdForm(f => ({ ...f, badge: e.target.value }))}
                    placeholder="Ex: Nouveau / Promo -20% / Exclusif"
                  />
                </div>

                <div className={styles.flagsRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={prodForm.isBestSeller}
                      onChange={(e) => setProdForm(f => ({ ...f, isBestSeller: e.target.checked }))}
                    />
                    <span>Afficher en « Meilleure Vente » sur l&apos;accueil</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={prodForm.isNew}
                      onChange={(e) => setProdForm(f => ({ ...f, isNew: e.target.checked }))}
                    />
                    <span>Marquer comme « Nouveau »</span>
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsProductModalOpen(false)} className={styles.btnSecondary}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingProduct ? 'Enregistrer les modifications' : 'Créer l\'article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: CATEGORY (ADD / EDIT)
         ============================================================ */}
      {isCategoryModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCategoryModalOpen(false)}>
          <div className={styles.modalSmallContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingCategory ? `Modifier la catégorie « ${editingCategory.name} »` : 'Ajouter une nouvelle catégorie'}
              </h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className={styles.modalCloseBtn}>✕</button>
            </div>

            <form onSubmit={handleSaveCategory} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nom de la Catégorie *</label>
                <input
                  required
                  className={styles.formInput}
                  value={catForm.name}
                  onChange={(e) => setCatForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Abayas, Accessoires, Jupes..."
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Slug URL (Optionnel)</label>
                <input
                  className={styles.formInput}
                  value={catForm.slug}
                  onChange={(e) => setCatForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="Ex: abayas-orientales"
                />
              </div>

              {/* Photo de la Catégorie */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Photo de la Catégorie</label>
                <div className={styles.catPhotoInputRow}>
                  {catForm.image ? (
                    <div className={styles.catThumbWrapper}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={catForm.image} alt="Aperçu" className={styles.catFormThumb} />
                      <button
                        type="button"
                        onClick={() => setCatForm(f => ({ ...f, image: '' }))}
                        className={styles.catRemovePhotoBtn}
                        title="Supprimer la photo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className={styles.catNoPhotoBadge}>
                      <span>📷 Aucune photo sélectionnée</span>
                    </div>
                  )}
                  <label className={styles.directUploadBtn}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCategoryFileUpload}
                      style={{ display: 'none' }}
                    />
                    <UploadIcon />
                    <span>📁 {catForm.image ? 'Changer la photo' : 'Télécharger une photo depuis l\'appareil'}</span>
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description (Optionnelle)</label>
                <textarea
                  rows={2}
                  className={styles.formTextarea}
                  value={catForm.description}
                  onChange={(e) => setCatForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Courte description de la collection..."
                />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className={styles.btnSecondary}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingCategory ? 'Enregistrer' : 'Créer la catégorie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CLEAN LUXURY SVG ICONS (NO EMOJIS)
   ============================================================ */
function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShoppingBagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
