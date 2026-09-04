import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  RiSearchLine, RiAddLine, RiSubtractLine, 
  RiAlertFill, RiCheckboxCircleFill, RiFileList3Line, RiArrowLeftSLine, RiArrowRightSLine
} from "react-icons/ri";
import { API, IMG } from '../config';
import './StockPage.css';
import AdminPagination from '../components/AdminPagination';

const StockPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState(null); // 'prod-ID' or 'var-ID'
  const [currentPage, setCurrentPage] = useState(1);

  // Initialize statusFilter from URL query parameter
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['All', 'In Stock', 'Low Stock', 'Out of Stock'].includes(filterParam)) {
      setStatusFilter(filterParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/products/all`, {
        headers: { 'x-admin-request': 'true' }
      });
      setProducts(res.data);
    } catch (err) {
      toast.error('Failed to load stock data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Flatten products and variants into a single list of rows for the stock table
  const getStockRows = () => {
    const rows = [];
    products.forEach((p) => {
      const selectableVariants = (p.variants || []).filter(v =>
        String(v.variantType || '').trim() && String(v.variantValue || '').trim()
      );
      if (selectableVariants.length > 0) {
        selectableVariants.forEach((v) => {
          const variantName = [v.size, v.color, v.variantType && v.variantValue ? `${v.variantType}: ${v.variantValue}` : null]
            .filter(Boolean)
            .join(' / ') || `Variant ID: ${v.id}`;
            
          rows.push({
            rowId: `var-${v.id}`,
            productId: p.id,
            variantId: v.id,
            name: p.name,
            variantLabel: variantName,
            isVariant: true,
            image: p.mainImage,
            availableStock: Number(v.stock || 0),
            salesStock: Number(v.salesStock || 0),
            unitPrice: Number(v.salesPrice ?? p.salesPrice ?? 0),
          });
        });
      } else {
        rows.push({
          rowId: `prod-${p.id}`,
          productId: p.id,
          variantId: null,
          name: p.name,
          variantLabel: '',
          isVariant: false,
          image: p.mainImage,
          availableStock: Number(p.stock || 0),
          salesStock: Number(p.salesStock || 0),
          unitPrice: Number(p.salesPrice || 0),
        });
      }
    });
    return rows;
  };

  const handleStockUpdate = async (row, delta) => {
    const newStock = Math.max(0, row.availableStock + delta);
    if (newStock === row.availableStock) return;

    setUpdatingId(row.rowId);
    try {
      await axios.put(`${API}/products/update-stock`, {
        productId: row.productId,
        variantId: row.variantId,
        stock: newStock
      });

      // Update local state directly
      setProducts(prevProducts => 
        prevProducts.map(p => {
          if (row.isVariant && p.id === row.productId) {
            return {
              ...p,
              variants: p.variants.map(v => 
                v.id === row.variantId ? { ...v, stock: newStock } : v
              )
            };
          } else if (!row.isVariant && p.id === row.productId) {
            return { ...p, stock: newStock };
          }
          return p;
        })
      );
      
      window.dispatchEvent(new Event('stock-updated'));
      if (newStock === 0) {
        toast.error(`${row.name}${row.variantLabel ? ` — ${row.variantLabel}` : ''} is now Out of Stock`);
      } else if (newStock <= 10) {
        toast.warn(`${row.name}${row.variantLabel ? ` — ${row.variantLabel}` : ''} is Low Stock: ${newStock} left`);
      } else {
        toast.success('Stock updated successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update stock.');
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const allRows = getStockRows();
  const getStockStatus = (stock) => {
    const availableStock = Math.max(0, Number(stock) || 0);
    if (availableStock === 0) return 'Out of Stock';
    if (availableStock <= 10) return 'Low Stock';
    return 'In Stock';
  };

  // Apply filters
  const filteredRows = allRows.filter(row => {
    // Search filter
    const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          row.variantLabel.toLowerCase().includes(searchQuery.toLowerCase());
    
    // One status rule is used by the table, counts, and dashboard links.
    const matchesStatus = statusFilter === 'All' || getStockStatus(row.availableStock) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate quick stats
  const stockCounts = allRows.reduce((counts, row) => {
    counts[getStockStatus(row.availableStock)] += 1;
    return counts;
  }, { 'In Stock': 0, 'Low Stock': 0, 'Out of Stock': 0 });
  const totalItems = allRows.length;
  const lowStockItems = stockCounts['Low Stock'];
  const inStockItems = stockCounts['In Stock'];
  const outOfStockItems = stockCounts['Out of Stock'];
  const stockTotals = allRows.reduce((totals, row) => ({
    availableValue: totals.availableValue + (row.availableStock * row.unitPrice),
    salesValue: totals.salesValue + (row.salesStock * row.unitPrice)
  }), { availableValue: 0, salesValue: 0 });
  const money = (amount) => '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const itemsPerPage = 10;
  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const pageNumbers = () => {
    const pages = [];
    let start = Math.max(1, safePage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let page = start; page <= end; page += 1) pages.push(page);
    return pages;
  };

  return (

    <div className="stock-page-container cp-wrap">
      {/* Top Header */}
      <div className="cp-list-topbar">
        <div className="cp-list-title">
          <h2>Stock Management</h2>
          <span className="cp-count-pill">{filteredRows.length} Items Listed</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stock-summary-grid">
        <button type="button" className={'stock-summary-card total' + (statusFilter === 'All' ? ' is-active-filter' : '')} onClick={() => { setStatusFilter('All'); setCurrentPage(1); }}>
          <div className="card-icon"><RiFileList3Line /></div>
          <div className="card-info">
            <h3>Total Products/Variants</h3>
            <p className="card-value">{totalItems}</p>
            <small>{money(stockTotals.availableValue)} available value</small>
          </div>
        </button>
        <button type="button" className={'stock-summary-card in-stock' + (statusFilter === 'In Stock' ? ' is-active-filter' : '')} onClick={() => { setStatusFilter('In Stock'); setCurrentPage(1); }}>
          <div className="card-icon"><RiCheckboxCircleFill /></div>
          <div className="card-info">
            <h3>In Stock</h3>
            <p className="card-value value-success">{inStockItems}</p>
            <small>{money(stockTotals.availableValue)} stock value</small>
          </div>
        </button>
        <button type="button" className={'stock-summary-card low-stock' + (statusFilter === 'Low Stock' ? ' is-active-filter' : '')} onClick={() => { setStatusFilter('Low Stock'); setCurrentPage(1); }}>
          <div className="card-icon"><RiAlertFill className="icon-warning" /></div>
          <div className="card-info">
            <h3>Low Stock Alerts</h3>
            <p className="card-value value-warning">{lowStockItems}</p>
          </div>
        </button>
        <button type="button" className={'stock-summary-card out-of-stock' + (statusFilter === 'Out of Stock' ? ' is-active-filter' : '')} onClick={() => { setStatusFilter('Out of Stock'); setCurrentPage(1); }}>
          <div className="card-icon"><RiAlertFill className="icon-danger" /></div>
          <div className="card-info">
            <h3>Out of Stock</h3>
            <p className="card-value value-danger">{outOfStockItems}</p>
          </div>
        </button>
      </div>

      {/* Filter and Search Actions */}
      <div className="stock-actions-bar">
        <div className="cp-search-box">
          <RiSearchLine className="cp-search-icon" />
          <input 
            type="text" 
            placeholder="Search by product name..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="stock-filter-buttons">
          {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map((status) => (
            <button
              key={status}
              className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
            >
              {status} <span className="stock-filter-count">{status === 'All' ? totalItems : stockCounts[status]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table */}
      <div className="cp-table-card">
        {loading ? (
          <div className="stock-loading">
            <div className="spinner"></div>
            <p>Loading inventory stock details...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="stock-empty-state">
            <p>No products or variants found matching search / filters.</p>
          </div>
        ) : (
          <div className="cp-table-scroll">
            <table className="cp-table stock-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Image</th>
                  <th style={{ width: '32%' }}>Product / Variant Name</th>
                  <th style={{ width: '120px' }}>Type</th>
                  <th style={{ width: '180px', textAlign: 'center' }}>Available Stock / Value</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Sales Stock / Value</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Status Alert</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => {
                  const isOutOfStock = row.availableStock === 0;
                  const isLowStock = row.availableStock > 0 && row.availableStock <= 10;
                  const isUpdating = updatingId === row.rowId;

                  return (
                    <tr key={row.rowId}>
                      <td className="cp-td-img" style={{ textAlign: 'center' }}>
                        {row.image ? (
                          <img 
                            className="cp-tbl-img stock-img" 
                            src={`${IMG}/${row.image}`} 
                            alt={row.name} 
                          />
                        ) : (
                          <div className="cp-tbl-no-img">No Img</div>
                        )}
                      </td>
                      <td className="stock-td-info">
                        <div className="stock-prod-name">{row.name}</div>
                        {row.isVariant && (
                          <span className="stock-var-badge">
                            {row.variantLabel}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`type-badge ${row.isVariant ? 'variant' : 'base'}`}>
                          {row.isVariant ? 'Variant' : 'Base'}
                        </span>
                      </td>
                      <td>
                        <div className="stock-counter-wrapper">
                          <button
                            className="stock-counter-btn decrement"
                            disabled={isUpdating || row.availableStock <= 0}
                            onClick={() => handleStockUpdate(row, -1)}
                            title="Decrease Stock"
                          >
                            <RiSubtractLine />
                          </button>
                          
                          <span className={`stock-counter-value ${isUpdating ? 'updating' : ''} ${isOutOfStock ? 'zero' : isLowStock ? 'low' : ''}`}>
                            {row.availableStock}
                          </span>

                          <button
                            className="stock-counter-btn increment"
                            disabled={isUpdating}
                            onClick={() => handleStockUpdate(row, 1)}
                            title="Increase Stock"
                          >
                            <RiAddLine />
                          </button>
                        </div>
                        <div style={{ marginTop: 5, textAlign: 'center', color: '#64748b', fontSize: 12, fontWeight: 700 }}>
                          {money(row.availableStock * row.unitPrice)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="sales-stock-display">
                          {row.salesStock}
                        </span>
                        <div style={{ marginTop: 5, color: '#64748b', fontSize: 12, fontWeight: 700 }}>
                          {money(row.salesStock * row.unitPrice)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isOutOfStock ? (
                          <span className="stock-status-alert out">
                            <RiAlertFill className="icon" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="stock-status-alert low">
                            <RiAlertFill className="icon" /> Low Stock ({row.availableStock} left)
                          </span>
                        ) : (
                          <span className="stock-status-alert healthy">
                            <RiCheckboxCircleFill className="icon" /> In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination
          page={safePage}
          totalItems={totalCount}
          pageSize={itemsPerPage}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          label="stock items"
        />
        {/* Pagination */}
        <div className="pagination-footer" style={{ marginTop: '20px' }}>
          <span className="page-info">
            Showing {products.length === 0 ? 0 : (currentPage - 1) * 10 + 1}
            –{Math.min(currentPage * 10, totalCount)} of {totalCount} items
          </span>

          <div className="p-btns">
            <button disabled={currentPage === 1} onClick={() => goToPage(1)} title="First page">«</button>
            <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
              <RiArrowLeftSLine /> Prev
            </button>
            {pageNumbers().map(n => (
              <button key={n} className={n === currentPage ? 'p-btn-active' : ''} onClick={() => goToPage(n)}>
                {n}
              </button>
            ))}
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => goToPage(currentPage + 1)}>
              Next <RiArrowRightSLine />
            </button>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => goToPage(totalPages)} title="Last page">»</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockPage;
