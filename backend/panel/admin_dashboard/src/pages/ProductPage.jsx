import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './ProductPage.css';
import { API, IMG } from '../config';
import { RiDeleteBin6Line } from 'react-icons/ri';

const PER_PAGE = 10;

// ── 10 Product Variant Types ──
const VARIANT_TYPES = [
  'Color',
  'Size',
  'Material',
  'Capacity',
  'Pack Size',
  'Shape',
  'Finish',
  'Weight',
  'Brand',
  'Model'
];

// A single value inside a variant group
const emptyValue = () => ({
  variantValue: '',
  name: '',
  description: '',
  video: null,
  videoFile: null,
  videoPrev: null,
  stock: '',
  mrpPrice: '',
  salesPrice: '',
  status: true,
  mainImage: null,
  mainImageFile: null,
  mainImagePrev: null,
  thumbnails: [],
  thumbnailFiles: [],
  thumbnailPrevs: [],
  specifications: [{ key: '', value: '' }]
});

// A variant group: one type with multiple values
const emptyGroup = () => ({
  variantType: '',
  isCustomType: false,
  customVariantType: '',
  values: [emptyValue()]
});
const emptyFeature  = () => ({ heading: '', description: '' });
const emptyCapacity = () => ({ value: '', image: null, imageFile: null, imagePreview: null });
const capacityValue = (capacity) => typeof capacity === 'object' && capacity !== null
  ? String(capacity.value || '')
  : String(capacity || '');
const normaliseCapacities = (capacities) => {
  const list = Array.isArray(capacities) ? capacities : [];
  return list.length
    ? list.map(capacity => typeof capacity === 'object' && capacity !== null
      ? {
          value: capacity.value || '',
          image: capacity.image || null,
          imageFile: capacity.imageFile || null,
          imagePreview: capacity.imagePreview || null
        }
      : { value: capacity || '', image: null, imageFile: null, imagePreview: null })
    : [emptyCapacity()];
};

/* ─── Custom Confirm Dialog ─── */
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="pp-confirm-overlay">
    <div className="pp-confirm-box">
      <div className="pp-confirm-icon"><RiDeleteBin6Line style={{ fontSize: '32px', color: '#ef4444' }} /></div>
      <p className="pp-confirm-msg">{message}</p>
      <div className="pp-confirm-actions">
        <button className="pp-confirm-cancel" onClick={onCancel}>Cancel</button>
        <button className="pp-confirm-ok"     onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

const ProductPage = () => {
  const location    = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const stockFilter  = searchParams.get('filter') || 'all';

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [brands,      setBrands]      = useState([]);
  const [panel,       setPanel]       = useState('list');
  const [editId,      setEditId]      = useState(null);
  const [viewProd,    setViewProd]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);

  // ── Confirm dialog ──
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [confirmMsg,    setConfirmMsg]    = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Form fields ──
  const [name,      setName]      = useState('');
  const [desc,      setDesc]      = useState('');
  const [catId,     setCatId]     = useState('');
  const [brandId,   setBrandId]   = useState('');
  const [mrp,       setMrp]       = useState('');
  const [sales,     setSales]     = useState('');
  const [gstType,   setGstType]   = useState('include');
  const [gstPercent,setGstPercent]= useState('18');
  const [stock,     setStock]     = useState('');
  const gstPreview = (() => {
    const price = Number(sales);
    const rate = Number(gstPercent);
    if (!Number.isFinite(price) || price <= 0) return null;
    const finalPrice = gstType === 'exclude' ? price * (1 + rate / 100) : price;
    const basePrice = gstType === 'exclude' ? price : finalPrice / (1 + rate / 100);
    return { basePrice, gstAmount: finalPrice - basePrice, finalPrice };
  })();
  const [status,    setStatus]    = useState(true);
  const [mainFile,  setMainFile]  = useState(null);
  const [mainPrev,  setMainPrev]  = useState(null);

  // ── Video ──
  const [videoFile,     setVideoFile]     = useState(null);
  const [videoPrev,     setVideoPrev]     = useState(null);
  const [existingVideo, setExistingVideo] = useState(null);
  const [removeVideo,   setRemoveVideo]   = useState(false);
  const videoInput = useRef();

  // ── Thumbnails ──
  const [existingThumbs,  setExistingThumbs]  = useState([]);
  const [newThumbFiles,   setNewThumbFiles]   = useState([]);
  const [newThumbPrevs,   setNewThumbPrevs]   = useState([]);
  const [removedThumbIds, setRemovedThumbIds] = useState([]);

  // ── Collections ──
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isTrending,   setIsTrending]   = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isTopRated,   setIsTopRated]   = useState(false);

  // ── Features (min 3, max 20) ──
  const [features,  setFeatures]  = useState([emptyFeature(), emptyFeature(), emptyFeature()]);

  // ── Variant Groups (additional, optional) ──
  const [extraDimensions, setExtraDimensions] = useState([]);
  // Default Variant (Variant 1) — mandatory
  const [defaultVariantType, setDefaultVariantType] = useState('');
  const [defaultVariantValue, setDefaultVariantValue] = useState('');
  const [isCustomDefaultType, setIsCustomDefaultType] = useState(false);
  const [customDefaultVariantType, setCustomDefaultVariantType] = useState('');
  const [showVariants, setShowVariants] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const thumbInput = useRef();

  // ── Default Variant Options (Multiple dimensions, e.g. Weight, Material) ──
  const [defaultVariants, setDefaultVariants] = useState([{ variantType: 'Dimension', variantValue: '', subOptions: [emptyCapacity()], isCustomType: false, customVariantType: '', mrpPrice: '', salesPrice: '', stock: '' }]);

  // ── Dedicated Variant Management State ──
  const [addVariantsProduct, setAddVariantsProduct] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setPage(1); }, [location.search]);

  const fetchAll = async () => {
    try {
      const [pRes, cRes, bRes] = await Promise.all([
        axios.get(`${API}/products/all`),
        axios.get(`${API}/categories/all`),
        axios.get(`${API}/brands/all`)
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
      setBrands(bRes.data);
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setEditId(null); setName(''); setDesc(''); setCatId(''); setBrandId('');
    setMrp(''); setSales(''); setGstType('include'); setGstPercent('18'); setStock('');
    setStatus(true);
    setMainFile(null); setMainPrev(null);
    setVideoFile(null); setVideoPrev(null); setExistingVideo(null); setRemoveVideo(false);
    setExistingThumbs([]); setNewThumbFiles([]); setNewThumbPrevs([]);
    setRemovedThumbIds([]);
    setIsBestSeller(false); setIsTrending(false); setIsNewArrival(false); setIsTopRated(false);
    setFeatures([emptyFeature(), emptyFeature(), emptyFeature()]);
    setExtraDimensions([]); setShowVariants(false);
    setDefaultVariantType(''); setDefaultVariantValue('');
    setIsCustomDefaultType(false); setCustomDefaultVariantType('');
    setDefaultVariants([{ variantType: 'Dimension', variantValue: '', subOptions: [emptyCapacity()], isCustomType: false, customVariantType: '', mrpPrice: '', salesPrice: '', stock: '' }]);
    setAddVariantsProduct(null);
    setErrors({});
    setPanel('list');
  };

  const getProductStock = (p) => {
    if (typeof p.totalStock === 'number') return p.totalStock;
    if (Array.isArray(p.variants) && p.variants.length > 0) {
      return p.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    }
    return p.stock || 0;
  };

  // ── Custom confirm ──
  const showConfirm = (message, action) => {
    setConfirmMsg(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };
  const handleConfirmYes = () => { setConfirmOpen(false); confirmAction && confirmAction(); };
  const handleConfirmNo  = () => { setConfirmOpen(false); setConfirmAction(null); };

  const openAdd  = () => { resetForm(); setPanel('form'); };
  const openEdit = (p) => {
    setEditId(p.id); setName(p.name || ''); setDesc(p.description || '');
    setCatId(p.categoryId || ''); setBrandId(p.brandId || '');
    setGstType(p.gstType || 'include'); setGstPercent(String(p.gstPercent || 18));
    setMrp(p.mrpPrice || ''); setSales(p.salesPrice || '');
    setStock(p.stock !== undefined && p.stock !== null ? p.stock : '');
    setStatus(p.status !== false);
    setMainPrev(p.mainImage ? IMG + p.mainImage : null); setMainFile(null);
    setExistingVideo(p.thumbVideo || null); setVideoFile(null); setVideoPrev(p.thumbVideo ? IMG + p.thumbVideo : null); setRemoveVideo(false);
    const uniqueThumbs = [];
    const seenImages = new Set();
    (p.thumbnails || []).forEach(t => {
      if (!seenImages.has(t.image)) {
        seenImages.add(t.image);
        uniqueThumbs.push(t);
      }
    });
    setExistingThumbs(uniqueThumbs);
    setNewThumbFiles([]); setNewThumbPrevs([]); setRemovedThumbIds([]);
    setIsBestSeller(!!p.isBestSeller);
    setIsTrending(!!p.isTrending);
    setIsNewArrival(!!p.isNewArrival);
    setIsTopRated(!!p.isTopRated);

    // Specifications
    const existingFeatures = (p.specifications || []).map(f => ({ heading: f.heading || '', description: f.description || '' }));
    // Ensure minimum 3 rows
    while (existingFeatures.length < 3) existingFeatures.push(emptyFeature());
    setFeatures(existingFeatures);

    // Variants — reconstruct groups from flat DB list
    if (p.variants?.length) {
      // Find all default variants where groupId is 1 (or first group)
      const defaultRows = p.variants.filter(v => (v.groupId || 1) === 1);
      const defVarsMapped = defaultRows.map(v => {
        const isStd = VARIANT_TYPES.includes(v.variantType || '');
        let parsedSubOptions = [];
        try { parsedSubOptions = typeof v.subOptions === 'string' ? JSON.parse(v.subOptions) : (v.subOptions || []); } catch(e) {}
        if (!Array.isArray(parsedSubOptions) || parsedSubOptions.length === 0) parsedSubOptions = [emptyCapacity()];
        return {
          id: v.id,
          variantType: isStd ? (v.variantType || '') : 'Custom',
          isCustomType: v.variantType && !isStd,
          customVariantType: isStd ? '' : (v.variantType || ''),
          variantValue: v.variantValue || '',
          mrpPrice: v.mrpPrice !== null ? v.mrpPrice : '',
          salesPrice: v.salesPrice !== null ? v.salesPrice : '',
          stock: v.stock !== undefined && v.stock !== null ? v.stock : '',
          subOptions: normaliseCapacities(parsedSubOptions)
        };
      });
      setDefaultVariants(defVarsMapped.length ? defVarsMapped : [{ variantType: 'Dimension', variantValue: '', subOptions: [emptyCapacity()], isCustomType: false, customVariantType: '', mrpPrice: '', salesPrice: '', stock: '' }]);

      // Additional Variants — group by groupId
      const rest = p.variants.filter(v => (v.groupId || 1) !== 1);
      let parsedExtras = [];
      rest.forEach(v => {
        if (v.variantType === 'Dimension' || !v.variantType) {
           let parsedSub = [];
           try { parsedSub = typeof v.subOptions === 'string' ? JSON.parse(v.subOptions) : (v.subOptions || []); } catch(e) {}
           if (!Array.isArray(parsedSub) || parsedSub.length === 0) parsedSub = [emptyCapacity()];
           parsedExtras.push({
             variantValue: v.variantValue || '',
             mrpPrice: v.mrpPrice !== null ? v.mrpPrice : '',
             salesPrice: v.salesPrice !== null ? v.salesPrice : '',
             stock: v.stock !== undefined && v.stock !== null ? v.stock : '',
             mainImage: v.mainImage || null,
             mainImageFile: null,
             mainImagePrev: null,
             subOptions: normaliseCapacities(parsedSub)
           });
        }
      });
      setExtraDimensions(parsedExtras);
      setShowVariants(true);
    } else {
      setShowVariants(false);
      setExtraDimensions([]);
      setDefaultVariants([{ variantType: 'Dimension', variantValue: '', subOptions: [emptyCapacity()], isCustomType: false, customVariantType: '', mrpPrice: '', salesPrice: '', stock: '' }]);
    }
    setErrors({});
    setPanel('form');
  };

  const openView = (p) => { setViewProd(p); setPanel('view'); };

  const openAddVariants = (p) => {
    resetForm();
    setEditId(p.id);
    setAddVariantsProduct(p);
    
    // Auto populate main product fields for updates, but keep validation flags clear
    setName(p.name || '');
    setDesc(p.description || '');
    setCatId(p.categoryId || '');
    setBrandId(p.brandId || '');
    setMrp(p.mrpPrice || '');
    setSales(p.salesPrice || '');
    setStock(p.stock !== undefined && p.stock !== null ? p.stock : '');
    setStatus(p.status !== false);
    setFeatures((p.specifications || []).map(f => ({ heading: f.heading || '', description: f.description || '' })));
    setIsBestSeller(!!p.isBestSeller);
    setIsTrending(!!p.isTrending);
    setIsNewArrival(!!p.isNewArrival);
    setIsTopRated(!!p.isTopRated);
    if (p.mainImage) setMainPrev(IMG + p.mainImage);
    if (p.thumbVideo) setVideoPrev(IMG + p.thumbVideo);

    if (p.variants?.length) {
      // Find all default variants where groupId is 1
      const defaultRows = p.variants.filter(v => (v.groupId || 1) === 1);
      const defVarsMapped = defaultRows.map(v => {
        const isStd = VARIANT_TYPES.includes(v.variantType || '');
        let parsedSubOptions = [];
        try { parsedSubOptions = typeof v.subOptions === 'string' ? JSON.parse(v.subOptions) : (v.subOptions || []); } catch(e) {}
        if (!Array.isArray(parsedSubOptions) || parsedSubOptions.length === 0) parsedSubOptions = [emptyCapacity()];
        return {
          id: v.id,
          variantType: isStd ? (v.variantType || '') : 'Custom',
          isCustomType: v.variantType && !isStd,
          customVariantType: isStd ? '' : (v.variantType || ''),
          variantValue: v.variantValue || '',
          mrpPrice: v.mrpPrice !== null ? v.mrpPrice : '',
          salesPrice: v.salesPrice !== null ? v.salesPrice : '',
          stock: v.stock !== undefined && v.stock !== null ? v.stock : '',
          subOptions: normaliseCapacities(parsedSubOptions)
        };
      });
      setDefaultVariants(defVarsMapped.length ? defVarsMapped : [{ variantType: 'Dimension', variantValue: '', subOptions: [emptyCapacity()], isCustomType: false, customVariantType: '', mrpPrice: '', salesPrice: '', stock: '' }]);

      const rest = p.variants.filter(v => (v.groupId || 1) !== 1);
      let parsedExtras = [];
      rest.forEach(v => {
        if (v.variantType === 'Dimension' || !v.variantType) {
           let parsedSub = [];
           try { parsedSub = typeof v.subOptions === 'string' ? JSON.parse(v.subOptions) : (v.subOptions || []); } catch(e) {}
           if (!Array.isArray(parsedSub) || parsedSub.length === 0) parsedSub = [emptyCapacity()];
           parsedExtras.push({
             variantValue: v.variantValue || '',
             mrpPrice: v.mrpPrice !== null ? v.mrpPrice : '',
             salesPrice: v.salesPrice !== null ? v.salesPrice : '',
             stock: v.stock !== undefined && v.stock !== null ? v.stock : '',
             mainImage: v.mainImage || null,
             mainImageFile: null,
             mainImagePrev: null,
             subOptions: normaliseCapacities(parsedSub)
           });
        }
      });
      setExtraDimensions(parsedExtras);
      setShowVariants(true);
    } else {
      setShowVariants(true);
      setExtraDimensions([]);
      setDefaultVariants([{ variantType: 'Dimension', variantValue: '', subOptions: [emptyCapacity()], isCustomType: false, customVariantType: '', mrpPrice: '', salesPrice: '', stock: '' }]);
    }
    setPanel('add-variants');
  };

  // ── Main image ──
  const handleMainImg = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setMainFile(f); setMainPrev(URL.createObjectURL(f));
    if (errors.mainImage) setErrors(prev => ({ ...prev, mainImage: '' }));
  };

  // ── Thumbnails ──
  const activeExisting  = existingThumbs.filter(t => !removedThumbIds.includes(t.id));
  const totalThumbCount = activeExisting.length + newThumbPrevs.length;

  const handleThumbs = (e) => {
    const files     = Array.from(e.target.files);
    const remaining = 15 - totalThumbCount;
    if (remaining <= 0) { toast.error('Maximum 15 images allowed!'); return; }
    const toAdd = files.slice(0, remaining);
    setNewThumbFiles(prev => [...prev, ...toAdd]);
    setNewThumbPrevs(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    thumbInput.current.value = '';
  };

  const removeExistingThumb = (id)  => setRemovedThumbIds(prev => [...prev, id]);
  const removeNewThumb = (idx) => {
    setNewThumbFiles(prev => prev.filter((_, i) => i !== idx));
    setNewThumbPrevs(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Variant Group Helpers ──

  // Set a field on a group
  const setGroupField = (gIdx, key, val) =>
    setVariantGroups(prev => prev.map((g, i) => i === gIdx ? { ...g, [key]: val } : g));

  // Set a field on a value inside a group
  const setGroupValue = (gIdx, vIdx, key, val) =>
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => j === vIdx ? { ...v, [key]: val } : v) };
    }));

  // Add a new variant group
  const addGroup = () => setVariantGroups(prev => [...prev, emptyGroup()]);

  // Remove a variant group
  const removeGroup = (gIdx) => setVariantGroups(prev => prev.filter((_, i) => i !== gIdx));

  // Add a value inside a group
  const addValue = (gIdx) =>
    setVariantGroups(prev => prev.map((g, i) => i === gIdx ? { ...g, values: [...g.values, emptyValue()] } : g));

  // Remove a value inside a group
  const removeValue = (gIdx, vIdx) =>
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      const filtered = g.values.filter((_, j) => j !== vIdx);
      return { ...g, values: filtered.length ? filtered : [emptyValue()] };
    }));

  // Handle value main image upload
  const handleValueMainImg = (gIdx, vIdx, file) => {
    setGroupValue(gIdx, vIdx, 'mainImageFile', file);
    setGroupValue(gIdx, vIdx, 'mainImagePrev', URL.createObjectURL(file));
  };
  const removeValueMainImg = (gIdx, vIdx) => {
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => j !== vIdx ? v : { ...v, mainImage: null, mainImageFile: null, mainImagePrev: null }) };
    }));
  };

  // Handle value video upload
  const handleValueVideo = (gIdx, vIdx, file) => {
    setGroupValue(gIdx, vIdx, 'videoFile', file);
    setGroupValue(gIdx, vIdx, 'videoPrev', URL.createObjectURL(file));
  };
  const removeValueVideo = (gIdx, vIdx) => {
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => j !== vIdx ? v : { ...v, video: null, videoFile: null, videoPrev: null }) };
    }));
  };

  // Handle value thumbnails
  const handleValueThumbs = (gIdx, vIdx, files) => {
    const filesArr = Array.from(files);
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => {
        if (j !== vIdx) return v;
        const existingCount = (v.thumbnails || []).length;
        const remaining = Math.max(0, 15 - existingCount - (v.thumbnailFiles || []).length);
        const combined = [...(v.thumbnailFiles || []), ...filesArr.slice(0, remaining)];
        if (filesArr.length > remaining) toast.info('Only 15 gallery images are allowed for each variant.');
        return { ...v, thumbnailFiles: combined, thumbnailPrevs: combined.map(f => URL.createObjectURL(f)) };
      })};
    }));
  };
  const removeValueExistingThumb = (gIdx, vIdx, thumb) => {
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => j !== vIdx ? v : { ...v, thumbnails: (v.thumbnails||[]).filter(t => t !== thumb) }) };
    }));
  };
  const removeValueNewThumb = (gIdx, vIdx, tIdx) => {
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => {
        if (j !== vIdx) return v;
        const filtered = (v.thumbnailFiles||[]).filter((_, k) => k !== tIdx);
        return { ...v, thumbnailFiles: filtered, thumbnailPrevs: filtered.map(f => URL.createObjectURL(f)) };
      })};
    }));
  };

  // Spec helpers for values
  const addValueSpec = (gIdx, vIdx) => {
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => j !== vIdx ? v : { ...v, specifications: [...(v.specifications||[]), {key:'',value:''}] }) };
    }));
  };
  const removeValueSpec = (gIdx, vIdx, sIdx) => {
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => {
        if (j !== vIdx) return v;
        const filtered = (v.specifications||[]).filter((_,k) => k !== sIdx);
        return { ...v, specifications: filtered.length ? filtered : [{key:'',value:''}] };
      })};
    }));
  };
  const setValueSpecField = (gIdx, vIdx, sIdx, key, val) => {
    setVariantGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      return { ...g, values: g.values.map((v, j) => {
        if (j !== vIdx) return v;
        return { ...v, specifications: (v.specifications||[]).map((s,k) => k === sIdx ? {...s,[key]:val} : s) };
      })};
    }));
  };

  // ── Extra Dimensions Logic ──
  const addExtraDimension = () => setExtraDimensions(prev => [...prev, { variantValue: '', mrpPrice: '', salesPrice: '', stock: '', subOptions: [emptyCapacity()], mainImage: null, mainImageFile: null, mainImagePrev: null }]);
  const removeExtraDimension = (idx) => setExtraDimensions(prev => prev.filter((_, i) => i !== idx));
  const updateExtraDimension = (idx, field, val) => {
    const updated = [...extraDimensions];
    updated[idx] = { ...updated[idx], [field]: val };
    setExtraDimensions(updated);
  };

  // Helper functions for Default Variant (Variant 1) multi-dimension options
  const addDefaultVariantRow = () => {
    setDefaultVariants(prev => [...prev, { variantType: 'Dimension', variantValue: '', subOptions: [emptyCapacity()], isCustomType: false, customVariantType: '', mrpPrice: '', salesPrice: '', stock: '' }]);
  };
  const removeDefaultVariantRow = (idx) => {
    setDefaultVariants(prev => prev.filter((_, i) => i !== idx));
  };
  const updateDefaultVariantRow = (idx, fields) => {
    setDefaultVariants(prev => prev.map((item, i) => i === idx ? { ...item, ...fields } : item));
  };
  const handleExtraDimensionImage = (idx, file) => {
    if (!file) return;
    const updated = [...extraDimensions];
    updated[idx] = { ...updated[idx], mainImage: null, mainImageFile: file, mainImagePrev: URL.createObjectURL(file) };
    setExtraDimensions(updated);
    toast.success('Fallback image selected: ' + file.name);
  };
  const updateExtraCapacity = (dimensionIndex, capacityIndex, fields) => {
    const updated = [...extraDimensions];
    const capacities = normaliseCapacities(updated[dimensionIndex].subOptions);
    capacities[capacityIndex] = { ...capacities[capacityIndex], ...fields };
    updated[dimensionIndex] = { ...updated[dimensionIndex], subOptions: capacities };
    setExtraDimensions(updated);
  };
  const handleExtraCapacityImage = (dimensionIndex, capacityIndex, file) => {
    if (!file) return;
    updateExtraCapacity(dimensionIndex, capacityIndex, {
      image: null,
      imageFile: file,
      imagePreview: URL.createObjectURL(file)
    });
    toast.success('Capacity image selected: ' + file.name);
  };

  const updateDefaultCapacity = (capacityIndex, fields) => {
    setDefaultVariants(prev => prev.map((variant, variantIndex) => {
      if (variantIndex !== 0) return variant;
      const capacities = normaliseCapacities(variant.subOptions);
      capacities[capacityIndex] = { ...capacities[capacityIndex], ...fields };
      return { ...variant, subOptions: capacities };
    }));
  };

  const handleDefaultCapacityImage = (capacityIndex, file) => {
    if (!file) return;
    updateDefaultCapacity(capacityIndex, {
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      image: null
    });
    toast.success('Capacity image selected: ' + file.name);
  };

  const removeDefaultCapacityImage = (capacityIndex) => {
    updateDefaultCapacity(capacityIndex, { image: null, imageFile: null, imagePreview: null });
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // ── Features ──
  const setFeatureField = (i, key, val) => {
    setFeatures(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
    if (errors.features) setErrors(prev => ({ ...prev, features: '' }));
  };
  const addFeature    = () => { if (features.length < 30) setFeatures(prev => [...prev, emptyFeature()]); };
  const removeFeature = (i) => { if (features.length > 3) setFeatures(prev => prev.filter((_, idx) => idx !== i)); };

  const toggleVariants = () => {
    setShowVariants(prev => {
      if (prev) {
        setExtraDimensions([]);
        setDefaultVariantType('');
        setDefaultVariantValue('');
        setIsCustomDefaultType(false);
        setCustomDefaultVariantType('');
        return false;
      }
      return true;
    });
  };

  // ── SUBMIT ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Product Name is required.';
      toast.error('Product Name is required.');
    }
    if (!desc.trim()) {
      newErrors.desc = 'Product Description is required.';
      toast.error('Product Description is required.');
    }
    if (!catId) {
      newErrors.catId = 'Category Selection is required.';
      toast.error('Category Selection is required.');
    }

    // Features validation: minimum 3 features must be filled
    const filledFeatures = features.filter(f => (f.heading || '').trim() || (f.description || '').trim());
    if (filledFeatures.length < 3) {
      newErrors.features = 'Please fill in at least 3 product specifications.';
      toast.error('Please fill in at least 3 product specifications (either heading or description).');
    }

    // Main image is always required
    if (!mainFile && !mainPrev) {
      newErrors.mainImage = 'Main Image is required.';
      toast.error('Main Image is required.');
    }

    // Prices and Stock are always required at the top level
    if (mrp === '' || mrp === null || mrp === undefined) {
      newErrors.mrp = 'MRP Price is required.';
      toast.error('MRP Price is required.');
    } else {
      const mrpVal = parseFloat(mrp);
      if (mrpVal <= 0 || isNaN(mrpVal)) {
        newErrors.mrp = 'MRP Price must be a positive number.';
        toast.error('MRP Price must be a positive number.');
      }
    }
    if (sales === '' || sales === null || sales === undefined) {
      newErrors.sales = 'Sales Price is required.';
      toast.error('Sales Price is required.');
    } else {
      const mrpVal = Number(mrp);
      const salesVal = Number(sales);
      if (!Number.isFinite(salesVal) || salesVal <= 0) {
        newErrors.sales = 'Sales Price must be a positive number.';
        toast.error('Sales Price must be a positive number.');
      } else if (Number.isFinite(mrpVal) && salesVal >= mrpVal) {
        newErrors.sales = 'Sales Price must be lower than MRP.';
        toast.error('Sales Price must be lower than MRP.');
      }
    }
    if (stock === '' || stock === null || stock === undefined) {
      newErrors.stock = 'Stock Quantity is required.';
      toast.error('Stock Quantity is required.');
    } else {
      const stockVal = parseInt(stock);
      if (stockVal < 0 || isNaN(stockVal)) {
        newErrors.stock = 'Stock Quantity must be a valid non-negative integer.';
        toast.error('Stock Quantity must be a valid non-negative integer.');
      }
    }

    // Variants are fully optional as requested. Determine if any variant data is present.
    let finalShowVariants = defaultVariants.some(dv => 
      (dv.isCustomType ? dv.customVariantType : dv.variantType)?.trim() || 
      dv.variantValue?.trim() ||
      (dv.subOptions && dv.subOptions.some(so => capacityValue(so).trim()))
    ) || extraDimensions.some(ed => 
      ed.variantValue?.trim() ||
      (ed.subOptions && ed.subOptions.some(so => capacityValue(so).trim()))
    );

    const validateVariantPrice = (variant, label) => {
      const hasMrp = variant.mrpPrice !== '' && variant.mrpPrice !== null && variant.mrpPrice !== undefined;
      const hasSales = variant.salesPrice !== '' && variant.salesPrice !== null && variant.salesPrice !== undefined;
      if (!hasMrp && !hasSales) return;
      if (!hasMrp || !hasSales || Number(variant.mrpPrice) <= 0 || Number(variant.salesPrice) <= 0 || Number(variant.salesPrice) >= Number(variant.mrpPrice)) {
        newErrors.variants = `${label}: enter both MRP and Sales Price, with Sales Price lower than MRP.`;
      }
    };
    defaultVariants.forEach((variant, index) => validateVariantPrice(variant, `Variant ${index + 1}`));
    extraDimensions.forEach((variant, index) => validateVariantPrice(variant, `Additional Dimension ${index + 1}`));
    if (newErrors.variants) toast.error(newErrors.variants);

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name',        name);
      fd.append('description', desc);
      fd.append('categoryId',  catId);
      fd.append('brandId',     brandId || '');
      fd.append('mrpPrice',    mrp);
      fd.append('salesPrice',  sales);
      fd.append('enteredPrice', sales);
      fd.append('gstType', gstType);
      fd.append('gstPercent', gstPercent);
      fd.append('stock',       stock);
      fd.append('status',      status);
      if (mainFile) fd.append('mainImage', mainFile);
      if (videoFile) fd.append('thumbVideo', videoFile);
      if (removeVideo) fd.append('removeVideo', 'true');
      newThumbFiles.forEach(f => fd.append('thumbnails', f));
      fd.append('removedThumbIds', JSON.stringify(removedThumbIds));
      fd.append('specifications',  JSON.stringify(features));
      fd.append('isBestSeller', isBestSeller);
      fd.append('isTrending',   isTrending);
      fd.append('isNewArrival', isNewArrival);
      fd.append('isTopRated',   isTopRated);
      if (finalShowVariants) {
        fd.append('showVariants', 'true');
        const defToSend = defaultVariants.map(dv => ({
          variantType: dv.isCustomType ? dv.customVariantType : dv.variantType,
          variantValue: dv.variantValue,
          mrpPrice: dv.mrpPrice,
          salesPrice: dv.salesPrice,
          stock: dv.stock,
          subOptions: normaliseCapacities(dv.subOptions).map(capacity => ({
            value: capacityValue(capacity),
            image: capacity.image || null
          }))
        }));
        fd.append('defaultVariants', JSON.stringify(defToSend));
        defaultVariants.forEach((variant, variantIndex) => {
          normaliseCapacities(variant.subOptions).forEach((capacity, capacityIndex) => {
            if (capacity.imageFile) {
              fd.append('default_variant_capacityImage_' + variantIndex + '_' + capacityIndex, capacity.imageFile);
            }
          });
        });

        // Process and append additional variant groups
        if (extraDimensions.length > 0) {
          const extraValues = extraDimensions.filter(d =>
            (d.variantValue && d.variantValue.trim()) ||
            (d.subOptions && d.subOptions.some(so => capacityValue(so).trim()))
          );
          const groupsToSend = [
            {
              variantType: 'Dimension',
              values: extraValues.map(d => ({
                variantValue: d.variantValue,
                mrpPrice: d.mrpPrice,
                salesPrice: d.salesPrice,
                stock: d.stock,
                mainImage: d.mainImage || null,
                subOptions: normaliseCapacities(d.subOptions).map(capacity => ({
                  value: capacityValue(capacity),
                  image: capacity.image || null
                }))
              }))
            }
          ];
          fd.append('variants', JSON.stringify(groupsToSend));
          extraValues.forEach((variant, variantIndex) => {
            if (variant.mainImageFile) {
              fd.append('variant_mainImage_vg0_v' + variantIndex, variant.mainImageFile);
            }
            normaliseCapacities(variant.subOptions).forEach((capacity, capacityIndex) => {
              if (capacity.imageFile) {
                fd.append('variant_capacityImage_vg0_v' + variantIndex + '_' + capacityIndex, capacity.imageFile);
              }
            });
          });
        } else {
          fd.append('variants', JSON.stringify([]));
        }
      }

      if (editId) {
        await axios.put(`${API}/products/update/${editId}`, fd);
        toast.success('Product updated successfully!');
      } else {
        await axios.post(`${API}/products/add`, fd);
        toast.success('Product published successfully!');
      }

      await fetchAll(); resetForm(); setPage(1);
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.error || e.response?.data?.message || e.message));
    }
    setSaving(false);
  };

  // ── DELETE ──
  const handleDelete = (id, productName) => {
    showConfirm(
      `Delete "${productName || 'this product'}"? This cannot be undone.`,
      async () => {
        try {
          await axios.delete(`${API}/products/delete/${id}`);
          toast.success('Product deleted successfully!');
          fetchAll();
        } catch (e) {
          toast.error('Delete failed: ' + (e.response?.data?.error || e.response?.data?.message || e.message));
        }
      }
    );
  };

  // ── Filtering & pagination ──
  const filteredBySearch = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const filtered = filteredBySearch.filter((p) => {
    const stock = getProductStock(p);
    if (stockFilter === 'outofstock') return stock === 0;
    if (stockFilter === 'lowstock')   return stock > 0 && stock <= 10;
    if (stockFilter === 'instock')    return stock > 10;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const safePage   = page > totalPages ? 1 : page;
  const current    = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n); return acc;
    }, []);

  // ══════════════════════════════════════════
  // FORM VIEW
  // ══════════════════════════════════════════
  if (panel === 'form') return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="pp-form-title">{editId ? 'Edit Product' : 'New Product'}</h2>
      </div>

      <form className="pp-form-grid" onSubmit={handleSubmit} noValidate>

        {/* ══ LEFT COLUMN ══ */}
        <div className="pp-form-left">

          {/* Basic Info */}
          <div className="pp-section-card">
            <div className="pp-section-label">Basic Info</div>
            <input
              className={`pp-input ${errors.name ? 'invalid-input' : ''}`}
              placeholder="Product name *"
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
            />
            {errors.name && <span className="error-msg" style={{ marginBottom: '12px' }}>{errors.name}</span>}

            <textarea
              className={`pp-input pp-textarea ${errors.desc ? 'invalid-input' : ''}`}
              placeholder="Product description..."
              value={desc}
              onChange={e => {
                setDesc(e.target.value);
                if (errors.desc) setErrors(prev => ({ ...prev, desc: '' }));
              }}
              rows={3}
              style={{ marginTop: errors.name ? '0px' : '12px' }}
            />
            {errors.desc && <span className="error-msg" style={{ marginBottom: '12px' }}>{errors.desc}</span>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: errors.desc ? '0px' : '12px' }}>
              <div>
                <select
                  className={`pp-input pp-select ${errors.catId ? 'invalid-input' : ''}`}
                  value={catId}
                  onChange={e => {
                    setCatId(e.target.value);
                    if (errors.catId) setErrors(prev => ({ ...prev, catId: '' }));
                  }}
                >
                  <option value="">Select Category *</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.catId && <span className="error-msg">{errors.catId}</span>}
              </div>
              <div>
                <select className="pp-input pp-select" value={brandId} onChange={e => setBrandId(e.target.value)}>
                  <option value="">Select Brand (Optional)</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ marginTop: '12px' }}>
              <label className="pp-field-label" style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Product Status</label>
              <select
                className="pp-input pp-select"
                value={status ? 'true' : 'false'}
                onChange={e => setStatus(e.target.value === 'true')}
              >
                <option value="true">Active (Public)</option>
                <option value="false">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div className="pp-section-card">
            <div className="pp-section-label">
              <span>Product Features</span>
              <span className="pp-feature-count">{features.length}/30</span>
            </div>
            <p className="pp-section-hint">Min 3 – Max 30 features. must filled 3 specification </p>
            <div className="pp-features-list">
              {features.map((f, i) => (
                <div key={i} className="pp-feature-row">
                  <div className="pp-feature-num">{i + 1}</div>
                  <div className="pp-feature-fields">
                    <input
                      className="pp-input pp-feat-heading"
                      placeholder="specification"
                      value={f.heading}
                      onChange={e => setFeatureField(i, 'heading', e.target.value)}
                    />
                    <textarea
                      className="pp-input pp-feat-desc"
                      placeholder="description"
                      value={f.description}
                      onChange={e => setFeatureField(i, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                  {features.length > 3 && (
                    <button type="button" className="pp-feature-del" onClick={() => removeFeature(i)} title="Remove feature">✕</button>
                  )}
                </div>
              ))}
            </div>
            {errors.features && <span className="error-msg" style={{ marginBottom: '14px', display: 'block' }}>{errors.features}</span>}
            {features.length < 30 && (
              <button type="button" className="pp-add-feature-btn" onClick={addFeature}>
                + Add Feature
              </button>
            )}
          </div>

          {/* Collections */}
          <div className="pp-section-card">
            <div className="pp-section-label">Add to Collections</div>
            <div className="pp-collections-grid">
              <label className={`pp-collection-box ${isBestSeller ? 'active' : ''}`}>
                <input type="checkbox" checked={isBestSeller} onChange={e => setIsBestSeller(e.target.checked)} hidden />
                <span className="pp-col-icon">🏆</span>
                <span className="pp-col-name">Best Seller</span>
                <span className={`pp-col-check ${isBestSeller ? 'on' : ''}`}>{isBestSeller ? '✓' : '+'}</span>
              </label>
              <label className={`pp-collection-box ${isTopRated ? 'active toprated' : ''}`}>
                <input type="checkbox" checked={isTopRated} onChange={e => setIsTopRated(e.target.checked)} hidden />
                <span className="pp-col-icon">⭐</span>
                <span className="pp-col-name">Top Rated</span>
                <span className={`pp-col-check ${isTopRated ? 'on' : ''}`}>{isTopRated ? '✓' : '+'}</span>
              </label>
              <label className={`pp-collection-box ${isNewArrival ? 'active newarrival' : ''}`}>
                <input type="checkbox" checked={isNewArrival} onChange={e => setIsNewArrival(e.target.checked)} hidden />
                <span className="pp-col-icon">🆕</span>
                <span className="pp-col-name">New Arrival</span>
                <span className={`pp-col-check ${isNewArrival ? 'on' : ''}`}>{isNewArrival ? '✓' : '+'}</span>
              </label>
            </div>
            {(isBestSeller || isTopRated || isNewArrival) && (
              <div className="pp-col-selected">
                {isBestSeller && <span className="pp-col-tag best">🏆 Best Seller</span>}
                {isTopRated   && <span className="pp-col-tag toprated">⭐ Top Rated</span>}
                {isNewArrival && <span className="pp-col-tag newarrival">🆕 New Arrival</span>}
              </div>
            )}
          </div>

          {/* Main Image & Price */}
          <div className="pp-section-card">
            <div className="pp-section-label">Main Image</div>
            <div
              className={`pp-main-upload-area ${errors.mainImage ? 'invalid-input' : ''}`}
              onClick={() => document.getElementById('mainImgInput').click()}
            >
              {mainPrev
                ? <img src={mainPrev} alt="main" className="pp-main-preview" />
                : <div className="pp-upload-placeholder"><span className="pp-upload-icon">⬆</span><span>Click to upload main image</span></div>
              }
            </div>
            {errors.mainImage && <span className="error-msg" style={{ marginBottom: '14px' }}>{errors.mainImage}</span>}
            <input id="mainImgInput" type="file" accept="image/*" hidden onChange={handleMainImg} />
            
{/* Product Dimensions & Capacities (Default) */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div className="pp-section-label">Default Dimension & Capacity</div>
              <p className="pp-section-hint">This dimension uses the Base Price and Stock defined below. Fully optional.</p>
              
              <div className="pp-price-row" style={{ gridTemplateColumns: '1fr', gap: '12px', marginTop: '14px', alignItems: 'flex-start', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="pp-price-group" style={{ flex: 1, minWidth: '150px' }}>
                    <label className="pp-price-label">Dimension Name (e.g. 21 cm)</label>
                    <input
                      className={`pp-input ${errors['def_val_0'] ? 'invalid-input' : ''}`}
                      placeholder="e.g. 21 cm"
                      value={defaultVariants[0]?.variantValue || ''}
                      onChange={e => {
                        const updated = [...defaultVariants];
                        updated[0] = { ...updated[0], variantValue: e.target.value, variantType: 'Dimension' };
                        setDefaultVariants(updated);
                        if (errors['def_val_0']) setErrors(prev => ({ ...prev, ['def_val_0']: '' }));
                      }}
                    />
                  </div>
                </div>

                <div style={{ width: '100%', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                  <label className="pp-price-label" style={{ marginBottom: '8px', display: 'block' }}>Capacities & Their Images</label>
                  <p className="pp-section-hint" style={{ marginBottom: '10px' }}>Upload a different image for each capacity. It will show automatically when the customer selects that capacity.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {normaliseCapacities(defaultVariants[0]?.subOptions).map((capacity, sIdx) => {
                      const preview = capacity.imagePreview || (capacity.image ? (capacity.image.startsWith('http') ? capacity.image : IMG + capacity.image) : null);
                      const imageInputId = 'default-capacity-image-' + sIdx;
                      return (
                        <div key={sIdx} style={{ width: '154px', padding: '9px', border: '1px solid #dbe4ee', borderRadius: '7px', background: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                            <input className="pp-input" style={{ minWidth: 0, padding: '4px 7px', height: '32px' }} placeholder="e.g. 750 ml" value={capacityValue(capacity)} onChange={e => updateDefaultCapacity(sIdx, { value: e.target.value })} />
                            {normaliseCapacities(defaultVariants[0]?.subOptions).length > 1 && (
                              <button type="button" title="Remove capacity" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }} onClick={() => {
                                const updated = [...defaultVariants];
                                updated[0] = { ...updated[0], subOptions: normaliseCapacities(updated[0].subOptions).filter((_, i) => i !== sIdx) };
                                setDefaultVariants(updated);
                              }}>✕</button>
                            )}
                          </div>
                          <input id={imageInputId} type="file" accept="image/*" hidden onChange={e => {
                            handleDefaultCapacityImage(sIdx, e.target.files[0]);
                            e.target.value = '';
                          }} />
                          {preview ? (
                            <div style={{ position: 'relative', height: '82px', borderRadius: '5px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <img src={preview} alt={capacityValue(capacity) + ' variant'} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fafafa' }} />
                              <button type="button" title="Remove image" onClick={() => removeDefaultCapacityImage(sIdx)} style={{ position: 'absolute', top: '3px', right: '3px', width: '20px', height: '20px', padding: 0, border: 0, borderRadius: '50%', color: '#fff', background: '#dc2626', cursor: 'pointer' }}>×</button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => document.getElementById(imageInputId).click()} style={{ width: '100%', height: '82px', border: '1px dashed #94a3b8', borderRadius: '5px', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>+ Variant Image</button>
                          )}
                          {preview && <button type="button" onClick={() => document.getElementById(imageInputId).click()} style={{ width: '100%', marginTop: '6px', border: 0, background: 'none', color: '#2d5a1b', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Replace image</button>}
                        </div>
                      );
                    })}
                    <button type="button" className="pp-add-feature-btn" style={{ padding: '4px 10px', fontSize: '12px', height: '38px', margin: 0, alignSelf: 'center' }} onClick={() => {
                      const updated = [...defaultVariants];
                      updated[0] = { ...updated[0], subOptions: [...normaliseCapacities(updated[0]?.subOptions), emptyCapacity()] };
                      setDefaultVariants(updated);
                    }}>+ Add Capacity</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pp-section-label" style={{marginTop: "24px"}}>Price, GST & Stock</div>
            <p className="pp-section-hint">GST is calculated by the server; customers always see the final payable price.</p>
            <div className="pp-price-row" style={{ marginTop: errors.mainImage ? '0px' : '14px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="pp-price-group">
                <label className="pp-price-label">MRP (₹)</label>
                <input
                  className={`pp-input pp-price-input ${errors.mrp ? 'invalid-input' : ''}`}
                  type="number"
                  placeholder="0.00"
                  value={mrp}
                  onChange={e => {
                    setMrp(e.target.value);
                    if (errors.mrp) setErrors(prev => ({ ...prev, mrp: '' }));
                  }}
                />
                {errors.mrp && <span className="error-msg">{errors.mrp}</span>}
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">Sales Price (Offer) (₹)</label>
                <input
                  className={`pp-input pp-price-input ${errors.sales ? 'invalid-input' : ''}`}
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  required
                  value={sales}
                  onChange={e => {
                    setSales(e.target.value);
                    if (errors.sales) setErrors(prev => ({ ...prev, sales: '' }));
                  }}
                />
                {errors.sales && <span className="error-msg">{errors.sales}</span>}
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">GST Type</label>
                <select className="pp-input pp-price-input" value={gstType} onChange={e => setGstType(e.target.value)}>
                  <option value="include">Include GST</option>
                  <option value="exclude">Exclude GST</option>
                </select>
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">GST Percentage</label>
                <select className="pp-input pp-price-input" value={gstPercent} onChange={e => setGstPercent(e.target.value)}>
                  {[5, 12, 18, 28].map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">Customer Final Price (₹)</label>
                <input className="pp-input pp-price-input" value={gstPreview ? gstPreview.finalPrice.toFixed(2) : ''} readOnly placeholder="Calculated automatically" />
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">Taxable Value</label>
                <input className="pp-input pp-price-input" value={gstPreview ? gstPreview.basePrice.toFixed(2) : ''} readOnly placeholder="Calculated automatically" />
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">GST Amount</label>
                <input className="pp-input pp-price-input" value={gstPreview ? gstPreview.gstAmount.toFixed(2) : ''} readOnly placeholder="Calculated automatically" />
              </div>
              <div className="pp-price-group">
                <label className="pp-price-label">Stock Quantity</label>
                <input
                  className={`pp-input pp-price-input ${errors.stock ? 'invalid-input' : ''}`}
                  type="number"
                  placeholder="0"
                  value={stock}
                  onChange={e => {
                    setStock(e.target.value);
                    if (errors.stock) setErrors(prev => ({ ...prev, stock: '' }));
                  }}
                />
                {errors.stock && <span className="error-msg">{errors.stock}</span>}
              </div>
            </div>
            {mrp && sales && Number(mrp) > Number(sales) && (
              <div className="pp-discount-badge">{Math.round(((mrp - sales) / mrp) * 100)}% OFF</div>
            )}
          </div>

        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div className="pp-form-right">

          {/* Gallery Thumbnails */}
          <div className="pp-section-card">
            <div className="pp-section-label">
              Gallery Images
              <span className={`pp-thumb-count ${totalThumbCount > 15 ? 'warn' : ''}`}>{totalThumbCount}/15</span>
            </div>
            <p className="pp-section-hint">Add up to 15 thumbnail images (optional).</p>
            <div className="pp-thumb-grid">
              {activeExisting.map(t => (
                <div key={`ex-${t.id}`} className="pp-thumb-item">
                   <img src={IMG + t.image} alt="" />
                   <button type="button" className="pp-thumb-del" onClick={() => removeExistingThumb(t.id)}>✕</button>
                </div>
              ))}
              {newThumbPrevs.map((src, i) => (
                <div key={`new-${i}`} className="pp-thumb-item pp-thumb-new">
                   <img src={src} alt="" />
                   <button type="button" className="pp-thumb-del" onClick={() => removeNewThumb(i)}>✕</button>
                   <span className="pp-thumb-badge">New</span>
                </div>
              ))}
              {totalThumbCount < 15 && (
                <div className="pp-thumb-add" onClick={() => thumbInput.current.click()}>
                   <span>+</span>
                   <span className="pp-thumb-add-label">Add</span>
                </div>
              )}
            </div>
            <input ref={thumbInput} type="file" accept="image/*" multiple hidden onChange={handleThumbs} />
            <p className="pp-thumb-hint">{15 - totalThumbCount} slots remaining (optional)</p>
          </div>

          {/* Thumbnail Video */}
          <div className="pp-section-card">
            <div className="pp-section-label">
              <span>Thumbnail Video (Optional)</span>
              {videoPrev && (
                <button type="button" className="pp-variant-del" style={{fontSize: '13px', padding: '2px 8px'}} onClick={(e) => {
                  e.stopPropagation();
                  setVideoFile(null);
                  setVideoPrev(null);
                  if (existingVideo) setRemoveVideo(true);
                }}>Remove Video</button>
              )}
            </div>
            <div
              className="pp-main-upload-area"
              onClick={() => videoInput.current.click()}
              style={{ height: '140px' }}
            >
              {videoPrev
                ? <video src={videoPrev} controls className="pp-main-preview" style={{ maxHeight: '100%', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
                : <div className="pp-upload-placeholder"><span className="pp-upload-icon">🎥</span><span>Click to upload demo video</span></div>
              }
            </div>
            <input ref={videoInput} type="file" accept="video/*" hidden onChange={e => {
              const f = e.target.files[0]; if (!f) return;
              setVideoFile(f); setVideoPrev(URL.createObjectURL(f)); setRemoveVideo(false);
            }} />
          </div>

          {/* Additional Dimensions (Extra Variants) */}
          <div className="pp-section-card pp-variants-card" style={{ width: '100%', marginBottom: '20px' }}>
            <div className="pp-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Additional Dimensions</span>
              <button
                type="button"
                className="pp-add-feature-btn"
                style={{ padding: '4px 8px', fontSize: '12px', margin: 0 }}
                onClick={addExtraDimension}
              >
                + Add Dimension
              </button>
            </div>
            <p className="pp-section-hint">Add extra dimensions (e.g. 24 cm) with their own capacities, MRP, sales price, and stock.</p>

            <div className="pp-variants-list">
              {extraDimensions.map((dim, idx) => (
                <div key={idx} className="pp-price-row" style={{ gridTemplateColumns: '1fr', gap: '12px', marginTop: '14px', alignItems: 'flex-start', background: '#fafbfc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    
                    {/* Dimension Name */}
                    <div className="pp-price-group" style={{ flex: 1, minWidth: '130px' }}>
                      <label className="pp-price-label">Dimension (e.g. 24 cm)</label>
                      <input
                        className="pp-input"
                        placeholder="e.g. 24 cm"
                        value={dim.variantValue}
                        onChange={e => updateExtraDimension(idx, 'variantValue', e.target.value)}
                      />
                    </div>

                    {/* MRP */}
                    <div className="pp-price-group" style={{ width: '100px' }}>
                      <label className="pp-price-label">MRP (₹)</label>
                      <input
                        className="pp-input pp-price-input"
                        type="number"
                        placeholder="0.00"
                        value={dim.mrpPrice}
                        onChange={e => updateExtraDimension(idx, 'mrpPrice', e.target.value)}
                      />
                    </div>

                    {/* Sales */}
                    <div className="pp-price-group" style={{ width: '100px' }}>
                      <label className="pp-price-label">Sales (₹)</label>
                      <input
                        className="pp-input pp-price-input"
                        type="number"
                        placeholder="0.00"
                        value={dim.salesPrice}
                        onChange={e => updateExtraDimension(idx, 'salesPrice', e.target.value)}
                      />
                    </div>

                    {/* Stock */}
                    <div className="pp-price-group" style={{ width: '80px' }}>
                      <label className="pp-price-label">Stock</label>
                      <input
                        className="pp-input pp-price-input"
                        type="number"
                        placeholder="0"
                        value={dim.stock}
                        onChange={e => updateExtraDimension(idx, 'stock', e.target.value)}
                      />
                    </div>
                    <div className="pp-price-group" style={{ width: '84px' }}>
                      <label className="pp-price-label">Fallback Image</label>
                      <input id={'extra-dimension-image-' + idx} type="file" accept="image/*" hidden onChange={e => {
                        handleExtraDimensionImage(idx, e.target.files[0]);
                        e.target.value = '';
                      }} />
                      {(dim.mainImagePrev || dim.mainImage) ? (
                        <div style={{ position: 'relative', width: '50px', height: '38px', border: '1px solid #dbe4ee', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => document.getElementById('extra-dimension-image-' + idx).click()}>
                          <img src={dim.mainImagePrev || (dim.mainImage.startsWith('http') ? dim.mainImage : IMG + dim.mainImage)} alt="Variant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" title="Remove image" onClick={e => { e.stopPropagation(); updateExtraDimension(idx, 'mainImage', null); updateExtraDimension(idx, 'mainImageFile', null); updateExtraDimension(idx, 'mainImagePrev', null); }} style={{ position: 'absolute', top: '1px', right: '1px', width: '16px', height: '16px', padding: 0, border: 0, borderRadius: '50%', color: '#fff', background: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>×</button>
                        </div>
                      ) : <button type="button" onClick={() => document.getElementById('extra-dimension-image-' + idx).click()} style={{ height: '38px', padding: '0 7px', border: '1px dashed #94a3b8', borderRadius: '4px', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '11px' }}>Upload</button>}
                    </div>

                    <button type="button" className="pp-variant-del" style={{ height: '38px', width: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => removeExtraDimension(idx)}>✕</button>
                  </div>

                  {/* Capacities */}
                  <div style={{ width: '100%', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                    <label className="pp-price-label" style={{ marginBottom: '8px', display: 'block' }}>Capacities & Their Images</label>
                    <p className="pp-section-hint" style={{ marginBottom: '10px' }}>Example: 20 L and 3 L can each have a different customer-facing image.</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {normaliseCapacities(dim.subOptions).map((capacity, sIdx) => {
                        const preview = capacity.imagePreview || (capacity.image ? (capacity.image.startsWith('http') ? capacity.image : IMG + capacity.image) : null);
                        const imageInputId = 'extra-capacity-image-' + idx + '-' + sIdx;
                        return (
                          <div key={sIdx} style={{ width: '154px', padding: '9px', border: '1px solid #dbe4ee', borderRadius: '7px', background: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                              <input className="pp-input" style={{ minWidth: 0, padding: '4px 7px', height: '32px' }} placeholder="e.g. 20 L" value={capacityValue(capacity)} onChange={e => updateExtraCapacity(idx, sIdx, { value: e.target.value })} />
                              {normaliseCapacities(dim.subOptions).length > 1 && (
                                <button type="button" title="Remove capacity" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }} onClick={() => {
                                  updateExtraDimension(idx, 'subOptions', normaliseCapacities(dim.subOptions).filter((_, i) => i !== sIdx));
                                }}>✕</button>
                              )}
                            </div>
                            <input id={imageInputId} type="file" accept="image/*" hidden onChange={e => {
                              handleExtraCapacityImage(idx, sIdx, e.target.files[0]);
                              e.target.value = '';
                            }} />
                            {preview ? (
                              <div style={{ position: 'relative', height: '82px', borderRadius: '5px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <img src={preview} alt={capacityValue(capacity) + ' variant'} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fafafa' }} />
                                <button type="button" title="Remove image" onClick={() => updateExtraCapacity(idx, sIdx, { image: null, imageFile: null, imagePreview: null })} style={{ position: 'absolute', top: '3px', right: '3px', width: '20px', height: '20px', padding: 0, border: 0, borderRadius: '50%', color: '#fff', background: '#dc2626', cursor: 'pointer' }}>×</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => document.getElementById(imageInputId).click()} style={{ width: '100%', height: '82px', border: '1px dashed #94a3b8', borderRadius: '5px', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>+ Capacity Image</button>
                            )}
                            {preview && <button type="button" onClick={() => document.getElementById(imageInputId).click()} style={{ width: '100%', marginTop: '6px', border: 0, background: 'none', color: '#2d5a1b', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Replace image</button>}
                          </div>
                        );
                      })}
                      <button type="button" className="pp-add-feature-btn" style={{ padding: '4px 10px', fontSize: '12px', height: '38px', margin: 0, alignSelf: 'center' }} onClick={() => updateExtraDimension(idx, 'subOptions', [...normaliseCapacities(dim.subOptions), emptyCapacity()])}>+ Add Capacity</button>
                    </div>
                  </div>
                </div>
              ))}
              {extraDimensions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                  No extra dimensions added. Click "+ Add Dimension" above to add one.
                </div>
              )}
            </div>
          </div>

          {/* Save Actions */}
          <div className="pp-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', marginBottom: '20px' }}>
            <button type="button" className="pp-btn-cancel" onClick={resetForm}>Discard</button>
            <button type="submit" className="pp-btn-save" disabled={saving}>
              {saving ? 'Saving...' : (editId ? 'Update Product' : 'Publish Product')}
            </button>
          </div>

        </div>
      </form>
    </div>
  );

  // ══════════════════════════════════════════
  // VIEW PANEL
  // ══════════════════════════════════════════
  if (panel === 'view' && viewProd) return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={() => { setViewProd(null); setPanel('list'); }}>← Back</button>
        <h2 className="pp-form-title">Product Detail</h2>
        <button className="pp-btn-edit-top" onClick={() => openEdit(viewProd)}>✏ Edit</button>
      </div>

      <div className="pp-view-grid">
        {/* Media */}
        <div className="pp-view-media">
          {viewProd.mainImage && <img src={IMG + viewProd.mainImage} className="pp-view-main" alt={viewProd.name} />}
          {viewProd.thumbnails?.length > 0 && (
            <div className="pp-view-thumbs">
              {viewProd.thumbnails.map((t, i) => <img key={i} src={IMG + t.image} className="pp-view-thumb" alt="" />)}
            </div>
          )}
          {viewProd.thumbVideo && (
            <div className="pp-view-video-section" style={{ marginTop: '16px' }}>
              <div className="pp-view-price-label" style={{ marginBottom: '8px' }}>Product Demo Video</div>
              <video src={IMG + viewProd.thumbVideo} controls style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pp-view-info">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className="pp-view-cat">{viewProd.category?.name || 'Uncategorised'}</span>
            <span className="pp-view-cat" style={{ background: viewProd.status === false ? '#f1f5f9' : '#dcfce3', color: viewProd.status === false ? '#475569' : '#166534', borderColor: 'transparent' }}>
              {viewProd.status === false ? 'Inactive' : 'Active'}
            </span>
            {viewProd.brand?.name && (
              <span className="pp-view-cat" style={{ background: '#ecfdf5', color: '#047857', borderColor: 'rgba(4,120,87,0.15)' }}>
                🏷️ {viewProd.brand.name}
              </span>
            )}
          </div>
          <h2 className="pp-view-name">{viewProd.name}</h2>

          {/* Badges */}
          {(viewProd.isBestSeller || viewProd.isTopRated || viewProd.isNewArrival) && (
            <div className="pp-col-selected" style={{ marginBottom: '14px' }}>
              {viewProd.isBestSeller && <span className="pp-col-tag best">🏆 Best Seller</span>}
              {viewProd.isTopRated   && <span className="pp-col-tag toprated">⭐ Top Rated</span>}
              {viewProd.isNewArrival && <span className="pp-col-tag newarrival">🆕 New Arrival</span>}
            </div>
          )}

          <p className="pp-view-desc">{viewProd.description || 'No description.'}</p>

          {/* Pricing */}
          {(viewProd.mrpPrice || viewProd.salesPrice) && (
            <div className="pp-view-pricing">
              <div className="pp-view-price-label">Main Listing Price</div>
              <div className="pp-view-prices">
                {viewProd.mrpPrice   && <span className="pp-view-mrp">MRP ₹{Number(viewProd.mrpPrice).toLocaleString('en-IN')}</span>}
                {viewProd.salesPrice && <span className="pp-view-sales">₹{Number(viewProd.salesPrice).toLocaleString('en-IN')}</span>}
                {viewProd.mrpPrice && viewProd.salesPrice && Number(viewProd.mrpPrice) > Number(viewProd.salesPrice) && (
                  <span className="pp-view-off">{Math.round(((viewProd.mrpPrice - viewProd.salesPrice) / viewProd.mrpPrice) * 100)}% off</span>
                )}
              </div>
            </div>
          )}

          {/* Stock */}
          <div className="pp-view-stock-row">
            <span>Total Stock</span>
            <strong>{viewProd.totalStock || 0} units</strong>
          </div>
          {(viewProd.totalStock || 0) <= 10 && (
            <div className="pp-out-warn">&#9888; {(viewProd.totalStock || 0) === 0 ? 'Out of Stock' : `Low Stock (${viewProd.totalStock || 0} left)`}</div>
          )}

          {/* Specifications */}
          {viewProd.specifications?.length > 0 && (
            <div className="pp-view-features">
              <div className="pp-view-price-label" style={{ marginBottom: '12px' }}>Product Specifications</div>
              <div className="pp-view-features-list">
                {viewProd.specifications.map((f, i) => (
                  <div key={i} className="pp-view-feature-item">
                    <div className="pp-view-feat-num">{i + 1}</div>
                    <div className="pp-view-feat-body">
                      {f.heading    && <div className="pp-view-feat-heading">{f.heading}</div>}
                      {f.description && <div className="pp-view-feat-desc">{f.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variants */}
          {viewProd.variants?.length > 0 && (
            <div className="pp-view-variants">
              <div className="pp-view-price-label" style={{ marginBottom: '10px' }}>Product Variants</div>
              <table className="pp-var-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Stock</th>
                    <th>MRP</th>
                    <th>Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {viewProd.variants.map((v, i) => {
                    let varThumbs = [];
                    try {
                      varThumbs = typeof v.thumbnails === 'string' ? JSON.parse(v.thumbnails) : (v.thumbnails || []);
                    } catch(e) { varThumbs = []; }

                    let varSpecs = [];
                    try {
                      varSpecs = typeof v.specifications === 'string' ? JSON.parse(v.specifications) : (v.specifications || []);
                    } catch(e) { varSpecs = []; }
                    
                    let varCaps = [];
                    try {
                      varCaps = typeof v.subOptions === 'string' ? JSON.parse(v.subOptions) : (v.subOptions || []);
                    } catch(e) { varCaps = []; }
                    varCaps = varCaps.filter(c => c && (typeof c === 'string' ? c.trim() !== '' : true));

                    return (
                      <React.Fragment key={i}>
                        <tr style={{ opacity: v.status === false ? 0.6 : 1 }}>
                          <td>
                            <span className="pp-vtype-tag">{v.variantType || '—'}</span>
                            {v.status === false && <span style={{fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '1px 4px', borderRadius: '4px', marginLeft: '4px'}}>Inactive</span>}
                          </td>
                          <td><span className="pp-vvalue-tag">{v.variantValue || '—'}</span></td>
                          <td><span className={`pp-qty-tag ${Number(v.stock) <= 10 ? 'low' : ''}`}>{v.stock ?? '—'}</span></td>
                          <td className="pp-mrp-cell">{v.mrpPrice   ? `₹${Number(v.mrpPrice).toLocaleString('en-IN')}` : '—'}</td>
                          <td className="pp-sale-cell">{v.salesPrice ? `₹${Number(v.salesPrice).toLocaleString('en-IN')}` : '—'}</td>
                        </tr>
                        {(v.mainImage || varThumbs.length > 0 || varSpecs.length > 0 || varCaps.length > 0) && (
                          <tr style={{ opacity: v.status === false ? 0.6 : 1, background: '#f8fafc' }}>
                            <td colSpan="5" style={{ padding: '10px 14px', borderTop: 'none' }}>
                              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                {varCaps.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Capacities</div>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                      {varCaps.map((cap, capIdx) => (
                                        <span key={capIdx} style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{capacityValue(cap)}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {varCaps.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Capacities</div>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                      {varCaps.map((cap, capIdx) => (
                                        <span key={capIdx} style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{capacityValue(cap)}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {v.mainImage && (
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Variant Image</div>
                                    <img src={IMG + v.mainImage} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '4px', marginTop: '4px' }} />
                                  </div>
                                )}
                                {varThumbs.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Variant Gallery</div>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                      {varThumbs.map((img, imgIdx) => (
                                        <img key={imgIdx} src={IMG + img} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {varSpecs.length > 0 && (
                                  <div style={{ flex: '1', minWidth: '150px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Variant Specifications</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: '12px' }}>
                                      {varSpecs.map((spec, specIdx) => (
                                        <React.Fragment key={specIdx}>
                                          <span style={{ color: '#475569', fontWeight: '500' }}>{spec.key}:</span>
                                          <span style={{ color: '#1e293b' }}>{spec.value}</span>
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (false /* panel === 'add-variants' disabled */  && addVariantsProduct) return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />}

      <div className="pp-form-topbar">
        <button className="pp-back-btn" onClick={resetForm}>← Back</button>
        <h2 className="pp-form-title">Manage Variants — {addVariantsProduct.name}</h2>
      </div>

      <form className="pp-form-single" onSubmit={handleSubmit} noValidate style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Additional Variant Groups */}
        <div className="pp-section-card pp-variants-card" style={{ width: '100%' }}>
          <div className="pp-section-label">
            <span>Additional Variant Groups <span style={{fontWeight: 'normal', fontSize: '12px', color: '#64748b'}}>(Optional — e.g. Weight, Color, Material)</span></span>
          </div>

          <div className="pp-variants-list">
            {variantGroups.map((group, gIdx) => (
              <div key={gIdx} className="pp-variant-row" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>

                {/* Group Header */}
                <div className="pp-variant-header" style={{ background: '#f1f5f9', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap' }}>Group {gIdx + 1} Type:</span>
                    <select
                      className="pp-input"
                      style={{ padding: '4px 8px', height: 'auto', fontSize: '13px', width: 'auto', minWidth: '140px' }}
                      value={group.isCustomType ? 'Custom' : group.variantType}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'Custom') { setGroupField(gIdx, 'isCustomType', true); setGroupField(gIdx, 'variantType', ''); }
                        else { setGroupField(gIdx, 'isCustomType', false); setGroupField(gIdx, 'variantType', val); setGroupField(gIdx, 'customVariantType', ''); }
                      }}
                    >
                      <option value="">— Select Type —</option>
                      {VARIANT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="Custom">Custom</option>
                    </select>
                    {group.isCustomType && (
                      <input className="pp-input" style={{ padding: '4px 8px', height: 'auto', fontSize: '13px', minWidth: '140px' }} placeholder="Custom type" value={group.customVariantType || ''} onChange={e => setGroupField(gIdx, 'customVariantType', e.target.value)} />
                    )}
                    {errors[`g_type_${gIdx}`] && <span className="error-msg">{errors[`g_type_${gIdx}`]}</span>}
                  </div>
                  <button type="button" className="pp-variant-del" onClick={() => removeGroup(gIdx)}>✕ Remove Group</button>
                </div>

                {/* Values inside group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '8px' }}>
                  {group.values.map((v, vIdx) => (
                    <div key={vIdx} style={{ background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#64748b' }}>Value {vIdx + 1}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select className="pp-input" style={{ padding: '3px 6px', height: 'auto', fontSize: '12px', width: 'auto' }} value={v.status !== false ? 'true' : 'false'} onChange={e => setGroupValue(gIdx, vIdx, 'status', e.target.value === 'true')}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                          {group.values.length > 1 && (
                            <button type="button" className="pp-variant-del" style={{ fontSize: '11px', padding: '3px 8px' }} onClick={() => removeValue(gIdx, vIdx)}>✕</button>
                          )}
                        </div>
                      </div>

                      <div className="pp-variant-value-grid">
                        <div>
                          <label className="pp-vfield-label">Value * <span style={{ color: '#94a3b8', fontWeight: 400 }}>(e.g. 200kg / Red / Steel)</span></label>
                          <input className={`pp-input${errors[`g${gIdx}_v${vIdx}_val`] ? ' invalid-input' : ''}`} placeholder="Enter value" value={v.variantValue} onChange={e => setGroupValue(gIdx, vIdx, 'variantValue', e.target.value)} />
                          {errors[`g${gIdx}_v${vIdx}_val`] && <span className="error-msg">{errors[`g${gIdx}_v${vIdx}_val`]}</span>}
                        </div>
                        <div>
                          <label className="pp-vfield-label">Stock <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span></label>
                          <input className="pp-input" type="number" min="0" placeholder="0" value={v.stock} onChange={e => setGroupValue(gIdx, vIdx, 'stock', e.target.value)} />
                        </div>
                        <div>
                          <label className="pp-vfield-label">MRP ₹ <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Override)</span></label>
                          <input className="pp-input" type="number" min="0" placeholder="Optional" value={v.mrpPrice} onChange={e => setGroupValue(gIdx, vIdx, 'mrpPrice', e.target.value)} />
                        </div>
                        <div>
                          <label className="pp-vfield-label">Sale ₹ <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Override)</span></label>
                          <input className="pp-input" type="number" min="0" placeholder="Optional" value={v.salesPrice} onChange={e => setGroupValue(gIdx, vIdx, 'salesPrice', e.target.value)} />
                        </div>
                      </div>

                      {/* Optional Product Name Override */}
                      <div style={{ marginBottom: '10px' }}>
                        <label className="pp-vfield-label">Product Name Override <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span></label>
                        <input className="pp-input" placeholder="Optional Name Override (e.g. Nikita Steel 200kg)" value={v.name || ''} onChange={e => setGroupValue(gIdx, vIdx, 'name', e.target.value)} />
                      </div>

                      {/* Optional Description Override */}
                      <div style={{ marginBottom: '10px' }}>
                        <label className="pp-vfield-label">Description Override <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span></label>
                        <textarea className="pp-input pp-textarea" rows={2} placeholder="Optional Description Override" value={v.description || ''} onChange={e => setGroupValue(gIdx, vIdx, 'description', e.target.value)} />
                      </div>

                      {/* Optional Video Override */}
                      <div style={{ marginBottom: '10px' }}>
                        <label className="pp-vfield-label" style={{ display: 'block', marginBottom: '6px' }}>Video Override <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span></label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ minWidth: '100px', height: '60px', border: '1px dashed #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', padding: '0 10px' }} onClick={() => document.getElementById(`vg${gIdx}_v${vIdx}_video`).click()}>
                            {v.videoPrev ? <span style={{ fontSize: '11px', color: '#166534' }}>🎥 Video Selected</span> : <span style={{ fontSize: '22px', color: '#94a3b8' }}>+</span>}
                          </div>
                          {v.videoPrev && <button type="button" className="pp-variant-del" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => removeValueVideo(gIdx, vIdx)}>Remove Video</button>}
                          <input id={`vg${gIdx}_v${vIdx}_video`} type="file" accept="video/*" hidden onChange={e => { const f = e.target.files[0]; if (f) handleValueVideo(gIdx, vIdx, f); }} />
                        </div>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label className="pp-vfield-label" style={{ display: 'block', marginBottom: '6px' }}>Image Override <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span></label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ width: '70px', height: '70px', border: '1px dashed #cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc' }} onClick={() => document.getElementById(`vg${gIdx}_v${vIdx}_main`).click()}>
                            {v.mainImagePrev ? <img src={v.mainImagePrev} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '22px', color: '#94a3b8' }}>+</span>}
                          </div>
                          {v.mainImagePrev && <button type="button" className="pp-variant-del" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => removeValueMainImg(gIdx, vIdx)}>Remove</button>}
                          <input id={`vg${gIdx}_v${vIdx}_main`} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files[0]; if (f) handleValueMainImg(gIdx, vIdx, f); }} />
                        </div>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label className="pp-vfield-label" style={{ display: 'block', marginBottom: '6px' }}>Gallery <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional, Max 15)</span></label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(v.thumbnails || []).map((thumb, tIdx) => (
                            <div key={`ex-${tIdx}`} style={{ position: 'relative', width: '54px', height: '54px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <img src={IMG + thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button type="button" style={{ position: 'absolute', top: '1px', right: '1px', width: '14px', height: '14px', background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => removeValueExistingThumb(gIdx, vIdx, thumb)}>✕</button>
                            </div>
                          ))}
                          {(v.thumbnailPrevs || []).map((src, tIdx) => (
                            <div key={`nw-${tIdx}`} style={{ position: 'relative', width: '54px', height: '54px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button type="button" style={{ position: 'absolute', top: '1px', right: '1px', width: '14px', height: '14px', background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => removeValueNewThumb(gIdx, vIdx, tIdx)}>✕</button>
                            </div>
                          ))}
                          {((v.thumbnails||[]).length + (v.thumbnailPrevs||[]).length) < 15 && (
                            <div style={{ width: '54px', height: '54px', border: '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', fontSize: '18px', color: '#94a3b8' }} onClick={() => document.getElementById(`vg${gIdx}_v${vIdx}_thumbs`).click()}>+</div>
                          )}
                          <input id={`vg${gIdx}_v${vIdx}_thumbs`} type="file" accept="image/*" multiple hidden onChange={e => handleValueThumbs(gIdx, vIdx, e.target.files)} />
                        </div>
                      </div>

                      <div>
                        <label className="pp-vfield-label" style={{ display: 'block', marginBottom: '6px' }}>Specifications <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span></label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(v.specifications || []).map((spec, sIdx) => (
                            <div key={sIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input className="pp-input" style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }} placeholder="Key" value={spec.key} onChange={e => setValueSpecField(gIdx, vIdx, sIdx, 'key', e.target.value)} />
                              <input className="pp-input" style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }} placeholder="Value" value={spec.value} onChange={e => setValueSpecField(gIdx, vIdx, sIdx, 'value', e.target.value)} />
                              {v.specifications.length > 1 && (
                                <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }} onClick={() => removeValueSpec(gIdx, vIdx, sIdx)}>✕</button>
                              )}
                            </div>
                          ))}
                          <button type="button" className="pp-add-feature-btn" style={{ padding: '4px 10px', fontSize: '11px', width: 'fit-content' }} onClick={() => addValueSpec(gIdx, vIdx)}>+ Add Spec</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="pp-add-feature-btn" style={{ padding: '6px 14px', fontSize: '12px', width: 'fit-content', marginTop: '4px' }} onClick={() => addValue(gIdx)}>
                    + Add Another Value to this Group
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="pp-add-variant-btn" onClick={addGroup}>
            + Add Variant Group
          </button>
        </div>

        {/* Save Actions */}
        <div className="pp-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button type="button" className="pp-btn-cancel" onClick={resetForm}>Discard</button>
          <button type="submit" className="pp-btn-save" disabled={saving}>
            {saving ? 'Saving...' : 'Save Variants'}
          </button>
        </div>
      </form>
    </div>
  );

  // ══════════════════════════════════════════
  // TABLE LIST
  // ══════════════════════════════════════════
  return (
    <div className="pp-wrap">
      {confirmOpen && <ConfirmDialog message={confirmMsg} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />}

      <div className="pp-list-topbar">
        <div className="pp-list-title">
          <h2>Products</h2>
          <span className="pp-count-pill">{filtered.length} total</span>
        </div>
        {stockFilter !== 'all' && (
          <div className="pp-filter-pill">
            Showing <strong>{stockFilter === 'outofstock' ? 'Out of Stock' : stockFilter === 'lowstock' ? 'Low Stock' : 'In Stock'}</strong> products
          </div>
        )}
        <div className="pp-list-actions">
          <div className="pp-search-box">
            <span className="pp-search-icon">⌕</span>
            <input
              placeholder="Search by name or category..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="pp-btn-add" onClick={openAdd}>+ New Product</button>
        </div>
      </div>

      <div className="pp-table-card">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '18%' }} />
              {/* <col style={{ width: '10%' }} /> */}
              <col style={{ width: '12%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>#</th>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                {/* <th>Price</th> */}
                <th style={{ textAlign: 'center' }}>Stock</th>
                <th>Collections</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {current.length > 0 ? current.map((p, idx) => {
                const rowNum      = (safePage - 1) * PER_PAGE + idx + 1;
                const stock       = p.totalStock || 0;
                const stockStatus = stock > 10 ? 'in' : stock > 0 ? 'low' : 'out';
                const stockLabel  = stock > 10 ? 'In Stock' : stock > 0 ? `Low Stock (${stock} left)` : 'Out of Stock';
                const rowMrp   = p.mrpPrice   || p.variants?.find(v => v.mrpPrice   != null)?.mrpPrice;
                const rowSale  = p.salesPrice || p.variants?.find(v => v.salesPrice != null)?.salesPrice;
                return (
                  <tr key={p.id}>
                    <td className="pp-td-num">{rowNum}</td>
                    <td className="pp-td-img">
                      {p.mainImage
                        ? <img src={IMG + p.mainImage} className="pp-tbl-img" alt={p.name} />
                        : <div className="pp-tbl-no-img">—</div>
                      }
                    </td>
                    <td className="pp-td-name">
                      <div className="pp-name-main">{p.name}</div>
                      {p.description && (
                        <div className="pp-name-desc">{p.description.slice(0, 40)}{p.description.length > 40 ? '…' : ''}</div>
                      )}
                    </td>
                    <td><span className="pp-cat-badge">{p.category?.name || '—'}</span></td>
                    {/* <td className="pp-td-price">
                      {(!rowMrp && !rowSale) ? (
                        <span className="pp-price-empty">—</span>
                      ) : (
                        <div className="pp-price-stack">
                          {rowSale && <span className="pp-td-sale">₹{Number(rowSale).toLocaleString('en-IN')}</span>}
                          {rowMrp && Number(rowMrp) !== Number(rowSale) && (
                            <span className="pp-td-mrp">₹{Number(rowMrp).toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      )}
                    </td> */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span className="pp-stock-num" style={{ fontSize: '15px', fontWeight: '700' }}>{stock}</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', letterSpacing: '0.04em', textTransform: 'uppercase' }}>units</span>
                      </div>
                    </td>
                    <td>
                      <div className="pp-tbl-cols">
                        {p.isBestSeller && <span className="pp-tbl-col-tag best"> Best</span>}
                        {p.isTopRated   && <span className="pp-tbl-col-tag toprated"> Top</span>}
                        {p.isNewArrival && <span className="pp-tbl-col-tag newarrival"> New</span>}
                        {!p.isBestSeller && !p.isTopRated && !p.isNewArrival && (
                          <span style={{ color: '#b0c4da', fontSize: '12px' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'normal' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={`pp-status-badge ${stockStatus}`} style={{ whiteSpace: 'normal', lineHeight: '1.3', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {stockStatus === 'out' ? '🔴' : stockStatus === 'low' ? '🟡' : '🟢'}
                          {stockLabel}
                        </span>
                        <span style={{ fontSize: '11px', textAlign: 'center', padding: '2px 8px', borderRadius: '4px', background: p.status === false ? '#f1f5f9' : '#dcfce3', color: p.status === false ? '#475569' : '#166534', fontWeight: '600' }}>
                          {p.status === false ? 'Inactive' : 'Active'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="pp-action-btns">
                        
                        <button className="pp-act-btn view" onClick={() => openView(p)} title="View">👁</button>
                        <button className="pp-act-btn edit" onClick={() => openEdit(p)} title="Edit">✏</button>
                        <button className="pp-act-btn del"  onClick={() => handleDelete(p.id, p.name)} title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9">
                    <div className="pp-empty">
                      <div className="pp-empty-icon"></div>
                      <div>{search ? 'No products match your search.' : 'No products yet. Click "+ New Product" to add one.'}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pp-pagination">
            <span className="pp-page-info">
              Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length} products
            </span>
            <div className="pp-page-btns">
              <button disabled={safePage === 1} onClick={() => setPage(1)} title="First page">«</button>
              <button disabled={safePage === 1} onClick={() => setPage(p => p - 1)} title="Previous page">‹</button>
              {pageNumbers.map((n, i) =>
                n === '...'
                  ? <span key={`dot-${i}`} className="pp-dots">…</span>
                  : <button key={n} className={safePage === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
              )}
              <button disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)} title="Next page">›</button>
              <button disabled={safePage === totalPages} onClick={() => setPage(totalPages)} title="Last page">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;


