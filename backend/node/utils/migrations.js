const { DataTypes } = require('sequelize');
const { sequelize } = require('../models/index');

const getTableDesc = async (queryInterface, targetTable) => {
    try {
        const tables = await queryInterface.showAllTables();
        const match = tables.find(t => typeof t === 'string' && t.toLowerCase() === targetTable.toLowerCase());
        if (match) {
            const desc = await queryInterface.describeTable(match);
            return { realName: match, desc };
        }
        const directDesc = await queryInterface.describeTable(targetTable.toLowerCase());
        return { realName: targetTable.toLowerCase(), desc: directDesc };
    } catch (e) {
        return null;
    }
};

const ensureSpecificationsTable = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const tables = await queryInterface.showAllTables();
        const actualFeaturesTable = tables.find(t => typeof t === 'string' && t.toLowerCase() === 'productfeatures');
        const hasSpecsTable = tables.some(t => typeof t === 'string' && t.toLowerCase() === 'productspecifications');
        if (actualFeaturesTable && !hasSpecsTable) {
            await queryInterface.renameTable(actualFeaturesTable, 'ProductSpecifications');
            console.log(`Renamed table ${actualFeaturesTable} to ProductSpecifications`);
        }
    } catch (err) {
        console.error('Error migrating ProductFeatures table:', err.message);
    }
};

const ensureVariantImageSpecAndVideoColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const prod = await getTableDesc(queryInterface, 'Products');
        if (prod) {
            if (!prod.desc.thumbVideo) {
                await queryInterface.addColumn(prod.realName, 'thumbVideo', {
                    type: DataTypes.STRING,
                    allowNull: true
                });
                console.log(`Added ${prod.realName}.thumbVideo column`);
            }
        }

        const varTab = await getTableDesc(queryInterface, 'ProductVariants');
        if (varTab) {
            if (!varTab.desc.mainImage) {
                await queryInterface.addColumn(varTab.realName, 'mainImage', {
                    type: DataTypes.STRING,
                    allowNull: true
                });
                console.log(`Added ${varTab.realName}.mainImage column`);
            }
            if (!varTab.desc.thumbnails) {
                await queryInterface.addColumn(varTab.realName, 'thumbnails', {
                    type: DataTypes.TEXT,
                    allowNull: true
                });
                console.log(`Added ${varTab.realName}.thumbnails column`);
            }
            if (!varTab.desc.specifications) {
                await queryInterface.addColumn(varTab.realName, 'specifications', {
                    type: DataTypes.TEXT,
                    allowNull: true
                });
                console.log(`Added ${varTab.realName}.specifications column`);
            }
        }
    } catch (err) {
        console.error('Error ensuring variant image and spec columns:', err.message);
    }
};

const ensureSoftDeleteColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    const tables = ['Categories', 'Customers', 'Products'];
    for (const tableName of tables) {
        try {
            const tab = await getTableDesc(queryInterface, tableName);
            if (tab) {
                if (!tab.desc.createdAt) {
                    await queryInterface.addColumn(tab.realName, 'createdAt', {
                        type: DataTypes.DATE,
                        allowNull: true
                    });
                    console.log(`Added createdAt column to ${tab.realName}`);
                }
                if (!tab.desc.updatedAt) {
                    await queryInterface.addColumn(tab.realName, 'updatedAt', {
                        type: DataTypes.DATE,
                        allowNull: true
                    });
                    console.log(`Added updatedAt column to ${tab.realName}`);
                }
                if (!tab.desc.deletedAt) {
                    await queryInterface.addColumn(tab.realName, 'deletedAt', {
                        type: DataTypes.DATE,
                        allowNull: true,
                        defaultValue: null
                    });
                    console.log(`Added deletedAt column to ${tab.realName}`);
                }
            }
        } catch (err) {
            console.error(`Error ensuring soft delete columns for ${tableName}:`, err.message);
        }
    }
};

const ensureReviewIndexes = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        await queryInterface.removeIndex('Reviews', 'unique_review_per_order_per_customer').catch(() => {});
        console.log('Removed old unique review index from Reviews if existed');
    } catch (err) {
        console.error('Error removing old review index:', err.message);
    }
};

const ensureStockColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const prod = await getTableDesc(queryInterface, 'Products');
        if (prod && !prod.desc.salesStock) {
            await queryInterface.addColumn(prod.realName, 'salesStock', {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0
            });
            console.log(`Added ${prod.realName}.salesStock column`);
        }
        
        const varTab = await getTableDesc(queryInterface, 'ProductVariants');
        if (varTab && !varTab.desc.salesStock) {
            await queryInterface.addColumn(varTab.realName, 'salesStock', {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0
            });
            console.log(`Added ${varTab.realName}.salesStock column`);
        }
    } catch (err) {
        console.error('Error ensuring stock columns:', err.message);
    }
};

const ensureBrandColumn = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const prod = await getTableDesc(queryInterface, 'Products');
        const brandTab = await getTableDesc(queryInterface, 'Brands');
        const brandRealName = brandTab ? brandTab.realName : 'brands';
        if (prod && !prod.desc.brandId) {
            await queryInterface.addColumn(prod.realName, 'brandId', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: brandRealName,
                    key: 'id'
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            });
            console.log(`Added ${prod.realName}.brandId column`);
        }
    } catch (err) {
        console.error('Error ensuring brand column:', err.message);
    }
};

const ensureDiscountAndOfferColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const dealsTab = await getTableDesc(queryInterface, 'deals');
        if (dealsTab) {
            if (!dealsTab.desc.discountPercentage) {
                await queryInterface.addColumn(dealsTab.realName, 'discountPercentage', { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 });
                console.log(`Added ${dealsTab.realName}.discountPercentage column`);
            }
            if (!dealsTab.desc.startDate) {
                await queryInterface.addColumn(dealsTab.realName, 'startDate', { type: DataTypes.DATE, allowNull: true });
                console.log(`Added ${dealsTab.realName}.startDate column`);
            }
        }

        const offerBannersTab = await getTableDesc(queryInterface, 'OfferBanners');
        const prodTab = await getTableDesc(queryInterface, 'Products');
        const prodRealName = prodTab ? prodTab.realName : 'products';

        if (offerBannersTab) {
            if (!offerBannersTab.desc.productId) {
                await queryInterface.addColumn(offerBannersTab.realName, 'productId', { type: DataTypes.INTEGER, allowNull: true, references: { model: prodRealName, key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
                console.log(`Added ${offerBannersTab.realName}.productId column`);
            }
            if (!offerBannersTab.desc.discountPercentage) {
                await queryInterface.addColumn(offerBannersTab.realName, 'discountPercentage', { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 });
                console.log(`Added ${offerBannersTab.realName}.discountPercentage column`);
            }
            if (!offerBannersTab.desc.expiryDate) {
                await queryInterface.addColumn(offerBannersTab.realName, 'expiryDate', { type: DataTypes.DATE, allowNull: true });
                console.log(`Added ${offerBannersTab.realName}.expiryDate column`);
            }
            if (!offerBannersTab.desc.startDate) {
                await queryInterface.addColumn(offerBannersTab.realName, 'startDate', { type: DataTypes.DATE, allowNull: true });
                console.log(`Added ${offerBannersTab.realName}.startDate column`);
            }
            if (!offerBannersTab.desc.discountType) {
                await queryInterface.addColumn(offerBannersTab.realName, 'discountType', { type: DataTypes.ENUM('PERCENTAGE', 'FLAT'), allowNull: false, defaultValue: 'PERCENTAGE' });
                console.log(`Added ${offerBannersTab.realName}.discountType column`);
            }
            if (!offerBannersTab.desc.discountValue) {
                await queryInterface.addColumn(offerBannersTab.realName, 'discountValue', { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 });
                console.log(`Added ${offerBannersTab.realName}.discountValue column`);
            }
            if (!offerBannersTab.desc.targetAudience) {
                await queryInterface.addColumn(offerBannersTab.realName, 'targetAudience', { type: DataTypes.ENUM('ALL', 'NEW_CUSTOMER', 'REGULAR_CUSTOMER'), allowNull: false, defaultValue: 'ALL' });
                console.log(`Added ${offerBannersTab.realName}.targetAudience column`);
            }
        }
    } catch (err) {
        console.error('Error ensuring discount and offer columns:', err.message);
    }
};

const ensureDealExtraColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const dealsTab = await getTableDesc(queryInterface, 'deals');
        if (dealsTab) {
            if (!dealsTab.desc.discountType) {
                await queryInterface.addColumn(dealsTab.realName, 'discountType', { type: DataTypes.ENUM('PERCENTAGE', 'FLAT'), allowNull: false, defaultValue: 'PERCENTAGE' });
                console.log(`Added ${dealsTab.realName}.discountType column`);
            }
            if (!dealsTab.desc.discountValue) {
                await queryInterface.addColumn(dealsTab.realName, 'discountValue', { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 });
                console.log(`Added ${dealsTab.realName}.discountValue column`);
            }
            if (!dealsTab.desc.targetAudience) {
                await queryInterface.addColumn(dealsTab.realName, 'targetAudience', { type: DataTypes.ENUM('ALL', 'NEW_CUSTOMER', 'REGULAR_CUSTOMER'), allowNull: false, defaultValue: 'ALL' });
                console.log(`Added ${dealsTab.realName}.targetAudience column`);
            }
        }
    } catch (err) {
        console.error('Error ensuring deal extra columns:', err.message);
    }
};

const ensureDealTargetColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const dealsTab = await getTableDesc(queryInterface, 'deals');
        const prodTab = await getTableDesc(queryInterface, 'Products');
        const prodRealName = prodTab ? prodTab.realName : 'products';
        if (dealsTab) {
            if (!dealsTab.desc.targetType) {
                await queryInterface.addColumn(dealsTab.realName, 'targetType', { type: DataTypes.ENUM('SHOP', 'PRODUCT'), allowNull: false, defaultValue: 'SHOP' });
                console.log(`Added ${dealsTab.realName}.targetType column`);
            }
            if (!dealsTab.desc.targetProductId) {
                await queryInterface.addColumn(dealsTab.realName, 'targetProductId', { type: DataTypes.INTEGER, allowNull: true, references: { model: prodRealName, key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' });
                console.log(`Added ${dealsTab.realName}.targetProductId column`);
            }
        }
    } catch (err) {
        console.error('Error ensuring deal target columns:', err.message);
    }
};

const ensureOrderSlotMrpColumn = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const slotTab = await getTableDesc(queryInterface, 'OrderSlots');
        if (slotTab && !slotTab.desc.mrpPrice) {
            await queryInterface.addColumn(slotTab.realName, 'mrpPrice', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
            console.log(`Added ${slotTab.realName}.mrpPrice column`);
        }
    } catch (err) {
        console.error('Error ensuring OrderSlot mrpPrice column:', err.message);
    }
};

const ensureShiprocketColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const ordTab = await getTableDesc(queryInterface, 'Orders');
        if (ordTab) {
            const table = ordTab.desc;
            const rName = ordTab.realName;
            if (!table.shiprocket_order_id) {
                await queryInterface.addColumn(rName, 'shiprocket_order_id', { type: DataTypes.STRING, allowNull: true });
                console.log(`Added ${rName}.shiprocket_order_id column`);
            }
            if (!table.shiprocket_shipment_id) {
                await queryInterface.addColumn(rName, 'shiprocket_shipment_id', { type: DataTypes.STRING, allowNull: true });
                console.log(`Added ${rName}.shiprocket_shipment_id column`);
            }
            if (!table.awb_code) {
                await queryInterface.addColumn(rName, 'awb_code', { type: DataTypes.STRING, allowNull: true });
                console.log(`Added ${rName}.awb_code column`);
            }
            if (!table.tracking_url) {
                await queryInterface.addColumn(rName, 'tracking_url', { type: DataTypes.STRING, allowNull: true });
                console.log(`Added ${rName}.tracking_url column`);
            }
            const snapFields = ['snapName', 'snapPhone', 'snapAddressLine', 'snapCity', 'snapDistrict', 'snapState', 'snapPincode'];
            for (const field of snapFields) {
                if (!table[field]) {
                    await queryInterface.addColumn(rName, field, { type: DataTypes.STRING, allowNull: true });
                    console.log(`Added ${rName}.${field} column`);
                }
            }
            if (!table.shippingAmount) {
                await queryInterface.addColumn(rName, 'shippingAmount', { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 });
                console.log(`Added ${rName}.shippingAmount column`);
            }
            if (!table.isPreorder) {
                await queryInterface.addColumn(rName, 'isPreorder', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
                console.log(`Added ${rName}.isPreorder column`);
            }
            if (!table.shippingAddressId) {
                await queryInterface.addColumn(rName, 'shippingAddressId', { type: DataTypes.INTEGER, allowNull: true });
                console.log(`Added ${rName}.shippingAddressId column`);
            }

            try {
                await queryInterface.changeColumn(rName, 'courierPartner', {
                    type: DataTypes.ENUM('Shiprocket', 'DTDC', 'Manual'),
                    allowNull: true
                });
                console.log(`Ensured ${rName}.courierPartner supports Manual`);
            } catch (enumErr) {
                console.error('Error ensuring courierPartner enum:', enumErr.message);
            }
        }
    } catch (err) {
        console.error('Error ensuring Shiprocket columns:', err.message);
    }
};

const ensureVariantStatusColumn = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const vTab = await getTableDesc(queryInterface, 'ProductVariants');
        if (vTab && !vTab.desc.status) {
            await queryInterface.addColumn(vTab.realName, 'status', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
            console.log(`Added ${vTab.realName}.status column`);
        }
    } catch (err) {
        console.error('Error ensuring variant status column:', err.message);
    }
};

const ensureVariantGroupIdColumn = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const vTab = await getTableDesc(queryInterface, 'ProductVariants');
        if (vTab && !vTab.desc.groupId) {
            await queryInterface.addColumn(vTab.realName, 'groupId', { type: DataTypes.INTEGER, allowNull: true, defaultValue: null });
            console.log(`Added ${vTab.realName}.groupId column`);
        }
    } catch (err) {
        console.error('Error ensuring variant groupId column:', err.message);
    }
};

const ensureVariantExtraColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const vTab = await getTableDesc(queryInterface, 'ProductVariants');
        if (vTab) {
            if (!vTab.desc.name) {
                await queryInterface.addColumn(vTab.realName, 'name', { type: DataTypes.STRING(255), allowNull: true, defaultValue: null });
                console.log(`Added ${vTab.realName}.name column`);
            }
            if (!vTab.desc.description) {
                await queryInterface.addColumn(vTab.realName, 'description', { type: DataTypes.TEXT, allowNull: true, defaultValue: null });
                console.log(`Added ${vTab.realName}.description column`);
            }
            if (!vTab.desc.video) {
                await queryInterface.addColumn(vTab.realName, 'video', { type: DataTypes.STRING, allowNull: true, defaultValue: null });
                console.log(`Added ${vTab.realName}.video column`);
            }
        }
    } catch (err) {
        console.error('Error ensuring variant extra columns:', err.message);
    }
};

const ensureCartWishlistOrderColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const cartTab = await getTableDesc(queryInterface, 'Carts');
        if (cartTab) {
            if (!cartTab.desc.selectedSubOption) {
                await queryInterface.addColumn(cartTab.realName, 'selectedSubOption', { type: DataTypes.STRING, allowNull: true });
                console.log(`Added ${cartTab.realName}.selectedSubOption column`);
            }
            if (!cartTab.desc.isPreorder) {
                await queryInterface.addColumn(cartTab.realName, 'isPreorder', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
                console.log(`Added ${cartTab.realName}.isPreorder column`);
            }
        }

        const wishTab = await getTableDesc(queryInterface, 'Wishlists');
        if (wishTab) {
            if (!wishTab.desc.variantId) {
                await queryInterface.addColumn(wishTab.realName, 'variantId', { type: DataTypes.INTEGER, allowNull: true });
                console.log(`Added ${wishTab.realName}.variantId column`);
            }
            if (!wishTab.desc.selectedSubOption) {
                await queryInterface.addColumn(wishTab.realName, 'selectedSubOption', { type: DataTypes.STRING, allowNull: true });
                console.log(`Added ${wishTab.realName}.selectedSubOption column`);
            }
        }

        const slotTab = await getTableDesc(queryInterface, 'OrderSlots');
        if (slotTab) {
            if (!slotTab.desc.selectedSubOption) {
                await queryInterface.addColumn(slotTab.realName, 'selectedSubOption', { type: DataTypes.STRING, allowNull: true });
                console.log(`Added ${slotTab.realName}.selectedSubOption column`);
            }
            if (!slotTab.desc.isPreorder) {
                await queryInterface.addColumn(slotTab.realName, 'isPreorder', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
                console.log(`Added ${slotTab.realName}.isPreorder column`);
            }
        }
    } catch (err) {
        console.error('Error ensuring cart/wishlist/order variant columns:', err.message);
    }
};

// Anonymous carts/wishlists and guest Buy Now orders must survive browser refreshes.
// These columns are additive and keep every existing registered-customer record intact.
const ensureGuestCheckoutColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        for (const tableName of ['Carts', 'Wishlists']) {
            const tab = await getTableDesc(queryInterface, tableName);
            if (!tab) continue;
            if (!tab.desc.guestSessionId) {
                await queryInterface.addColumn(tab.realName, 'guestSessionId', { type: DataTypes.STRING(80), allowNull: true });
                console.log(`Added ${tab.realName}.guestSessionId`);
            }
            if (tab.desc.customerId && !tab.desc.customerId.allowNull) {
                await queryInterface.changeColumn(tab.realName, 'customerId', { type: DataTypes.INTEGER, allowNull: true });
            }
        }

        const orderTab = await getTableDesc(queryInterface, 'Orders');
        if (!orderTab) return;
        const table = orderTab.desc;
        const name = orderTab.realName;
        if (table.customerId && !table.customerId.allowNull) {
            await queryInterface.changeColumn(name, 'customerId', { type: DataTypes.INTEGER, allowNull: true });
        }
        if (!table.customerType) await queryInterface.addColumn(name, 'customerType', { type: DataTypes.ENUM('REGISTERED', 'GUEST'), allowNull: false, defaultValue: 'REGISTERED' });
        if (!table.guestSessionId) await queryInterface.addColumn(name, 'guestSessionId', { type: DataTypes.STRING(80), allowNull: true });
        if (!table.guestEmail) await queryInterface.addColumn(name, 'guestEmail', { type: DataTypes.STRING, allowNull: true });
        if (table.shippingAddressId && !table.shippingAddressId.allowNull) {
            await queryInterface.changeColumn(name, 'shippingAddressId', { type: DataTypes.INTEGER, allowNull: true });
        }
    } catch (err) {
        console.error('Error ensuring guest checkout columns:', err.message);
    }
};

const ensureGstColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const prodTab = await getTableDesc(queryInterface, 'Products');
        if (prodTab) {
            const productTable = prodTab.desc;
            const rName = prodTab.realName;
            const productColumns = {
                basePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
                gstPercent: { type: DataTypes.INTEGER, allowNull: true },
                gstAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
                finalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
                gstType: { type: DataTypes.ENUM('include', 'exclude'), allowNull: true },
            };
            for (const [column, definition] of Object.entries(productColumns)) {
                if (!productTable[column]) await queryInterface.addColumn(rName, column, definition);
            }

            await sequelize.query(`
                UPDATE ${rName}
                SET finalPrice = COALESCE(mrpPrice, salesPrice),
                    gstPercent = 18,
                    gstType = 'include',
                    basePrice = ROUND(COALESCE(mrpPrice, salesPrice) / 1.18, 2),
                    gstAmount = ROUND(COALESCE(mrpPrice, salesPrice) - (COALESCE(mrpPrice, salesPrice) / 1.18), 2)
                WHERE finalPrice IS NULL AND COALESCE(mrpPrice, salesPrice) IS NOT NULL
            `).catch(() => {});
        }

        const slotTab = await getTableDesc(queryInterface, 'OrderSlots');
        if (slotTab) {
            const slotTable = slotTab.desc;
            const rName = slotTab.realName;
            const slotColumns = {
                basePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
                gstPercent: { type: DataTypes.INTEGER, allowNull: true },
                gstAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
                finalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
                gstType: { type: DataTypes.STRING(10), allowNull: true },
            };
            for (const [column, definition] of Object.entries(slotColumns)) {
                if (!slotTable[column]) await queryInterface.addColumn(rName, column, definition);
            }
        }
        console.log('GST columns checked');
    } catch (err) {
        console.error('Error ensuring GST columns:', err.message);
    }
};

const ensureAdminSeeded = async () => {
    const { Admin } = require('../models');
    const bcrypt = require('bcryptjs');
    try {
        const count = await Admin.count();
        if (count === 0) {
            const hashed = await bcrypt.hash('admin123', 10);
            await Admin.create({
                name: 'Super Admin',
                email: 'nikitha9320@gmail.com',
                password: hashed
            });
            console.log('Default admin seeded: nikitha9320@gmail.com / admin123');
        }
    } catch (err) {
        console.error('Error seeding default admin:', err.message);
    }
};

const ensureSettingsSeeded = async () => {
    const { Setting } = require('../models');
    try {
        await Setting.findOrCreate({ where: { key: 'FREE_SHIPPING_THRESHOLD' }, defaults: { value: '1000' } });
        await Setting.findOrCreate({ where: { key: 'DEFAULT_SHIPPING_FEE' }, defaults: { value: '150' } });
        await Setting.findOrCreate({ where: { key: 'COMPANY_STATE' }, defaults: { value: 'Tamil Nadu' } });
        console.log('Default settings seeded successfully');
    } catch (err) {
        console.error('Error seeding default settings:', err.message);
    }
};

const ensureShippingZoneTable = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const tables = await queryInterface.showAllTables();
        const exists = tables.some(t => typeof t === 'string' && t.toLowerCase() === 'shippingzones');
        if (!exists) {
            await queryInterface.createTable('ShippingZones', {
                id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
                zoneType: { type: DataTypes.ENUM('LOCAL', 'ZONAL', 'REGIONAL'), allowNull: false },
                stateName: { type: DataTypes.STRING, allowNull: false },
                amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
                isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
                createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
                updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
            });
            console.log('Created ShippingZones table');

            // Seed default data
            await queryInterface.bulkInsert('ShippingZones', [
                { zoneType: 'LOCAL', stateName: 'Karnataka', amount: 40, isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { zoneType: 'ZONAL', stateName: 'Tamil Nadu', amount: 60, isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { zoneType: 'ZONAL', stateName: 'Kerala', amount: 65, isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { zoneType: 'ZONAL', stateName: 'Andhra Pradesh', amount: 60, isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { zoneType: 'ZONAL', stateName: 'Telangana', amount: 60, isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { zoneType: 'ZONAL', stateName: 'Goa', amount: 70, isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { zoneType: 'ZONAL', stateName: 'Maharashtra', amount: 75, isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { zoneType: 'REGIONAL', stateName: 'DEFAULT', amount: 120, isActive: true, createdAt: new Date(), updatedAt: new Date() }
            ]);
            console.log('Seeded default ShippingZones data');
        }
    } catch (e) {
        console.error('ensureShippingZoneTable error:', e.message);
    }
};

const ensureOrderCancellationTable = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const tables = await queryInterface.showAllTables();
        const exists = tables.some(t => typeof t === 'string' && t.toLowerCase() === 'ordercancellations');
        if (!exists) {
            await queryInterface.createTable('OrderCancellations', {
                id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
                orderId: { type: DataTypes.STRING, allowNull: false },
                cancelType: { type: DataTypes.ENUM('PRE_DISPATCH', 'IN_TRANSIT', 'POST_DELIVERY'), allowNull: false },
                reasonCategory: { type: DataTypes.STRING, allowNull: true },
                reasonText: { type: DataTypes.TEXT, allowNull: true },
                images: { type: DataTypes.JSON, allowNull: true },
                video: { type: DataTypes.STRING, allowNull: true },
                customerUpiId: { type: DataTypes.STRING, allowNull: true },
                refundMethod: { type: DataTypes.ENUM('SAME_ACCOUNT', 'UPI'), defaultValue: 'UPI' },
                pickupDate: { type: DataTypes.DATEONLY, allowNull: true },
                pickupTimeSlot: { type: DataTypes.STRING, allowNull: true },
                refundAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
                refundStatus: { type: DataTypes.ENUM('NOT_APPLICABLE', 'PENDING', 'INITIATED', 'COMPLETED'), defaultValue: 'NOT_APPLICABLE' },
                adminApprovedBy: { type: DataTypes.INTEGER, allowNull: true },
                adminApprovedAt: { type: DataTypes.DATE, allowNull: true },
                courierCancelRef: { type: DataTypes.STRING, allowNull: true },
                productReceivedAt: { type: DataTypes.DATE, allowNull: true },
                status: { type: DataTypes.ENUM('REQUESTED','APPROVED','REJECTED','COURIER_NOTIFIED','RETURN_PICKUP','PRODUCT_RECEIVED','REFUND_INITIATED','REFUNDED'), defaultValue: 'REQUESTED' },
                createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
                updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
            });
            console.log('Created OrderCancellations table');
        } else {
            const desc = await queryInterface.describeTable('OrderCancellations').catch(() => null);
            if (desc) {
                if (!desc.video) await queryInterface.addColumn('OrderCancellations', 'video', { type: DataTypes.STRING, allowNull: true }).catch(() => {});
                if (!desc.refundMethod) await queryInterface.addColumn('OrderCancellations', 'refundMethod', { type: DataTypes.ENUM('SAME_ACCOUNT', 'UPI'), defaultValue: 'UPI' }).catch(() => {});
                if (!desc.pickupDate) await queryInterface.addColumn('OrderCancellations', 'pickupDate', { type: DataTypes.DATEONLY, allowNull: true }).catch(() => {});
                if (!desc.pickupTimeSlot) await queryInterface.addColumn('OrderCancellations', 'pickupTimeSlot', { type: DataTypes.STRING, allowNull: true }).catch(() => {});
            }
        }
    } catch (e) {
        console.error('ensureOrderCancellationTable error:', e.message);
    }
};

const ensureCodTrackerColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const ord = await getTableDesc(queryInterface, 'Orders');
        if (ord) {
            if (!ord.desc.codAmountStatus) {
                await queryInterface.addColumn(ord.realName, 'codAmountStatus', {
                    type: DataTypes.ENUM('pending', 'partial', 'paid'), allowNull: true
                });
                console.log('Added Orders.codAmountStatus');
            }
            if (!ord.desc.codReceivedAmount) {
                await queryInterface.addColumn(ord.realName, 'codReceivedAmount', {
                    type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0
                });
                console.log('Added Orders.codReceivedAmount');
            }
        }
    } catch (e) {
        console.error('ensureCodTrackerColumns error:', e.message);
    }
};

const ensureCouponAndBusinessInvoiceColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const couponTab = await getTableDesc(queryInterface, 'Coupons');
        if (couponTab) {
            if (!couponTab.desc.targetType) {
                await queryInterface.addColumn(couponTab.realName, 'targetType', {
                    type: DataTypes.ENUM('SHOP', 'PRODUCT'),
                    allowNull: false,
                    defaultValue: 'SHOP'
                });
                console.log('Added coupon targetType column');
            }
            if (!couponTab.desc.productId) {
                await queryInterface.addColumn(couponTab.realName, 'productId', {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: null
                });
                console.log('Added coupon productId column');
            }
        }

        const orderTab = await getTableDesc(queryInterface, 'Orders');
        if (orderTab) {
            const columns = {
                invoiceType: { type: DataTypes.ENUM('CUSTOMER', 'BUSINESS_GST'), allowNull: false, defaultValue: 'CUSTOMER' },
                businessName: { type: DataTypes.STRING, allowNull: true },
                businessGstin: { type: DataTypes.STRING(15), allowNull: true },
                billingAddress: { type: DataTypes.TEXT, allowNull: true },
                billingState: { type: DataTypes.STRING, allowNull: true },
                billingPincode: { type: DataTypes.STRING(6), allowNull: true }
            };
            for (const [column, definition] of Object.entries(columns)) {
                if (!orderTab.desc[column]) {
                    await queryInterface.addColumn(orderTab.realName, column, definition);
                    console.log('Added order invoice column: ' + column);
                }
            }
        }
    } catch (error) {
        console.error('ensureCouponAndBusinessInvoiceColumns error:', error.message);
    }
};

const ensureSettingTableSchema = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const tab = await getTableDesc(queryInterface, 'Settings');
        if (tab) {
            try {
                await sequelize.query(`ALTER TABLE ${tab.realName} MODIFY COLUMN value LONGTEXT NOT NULL;`);
                console.log(`Successfully altered ${tab.realName}.value to LONGTEXT`);
            } catch (e) {
                console.log('Notice: Could not alter Settings.value:', e.message);
            }
        }
    } catch (err) {
        console.error('Error ensuring Setting table schema:', err.message);
    }
};

const ensureSmsLogsTable = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const tables = await queryInterface.showAllTables();
        const exists = tables.some(t => typeof t === 'string' && t.toLowerCase() === 'smslogs');
        if (!exists) {
            await queryInterface.createTable('smslogs', {
                id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
                recipients: { type: DataTypes.TEXT, allowNull: false },
                messageType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'GENERAL' },
                status: { type: DataTypes.ENUM('QUEUED', 'ACCEPTED', 'PENDING', 'DELIVERED', 'FAILED', 'UNKNOWN'), allowNull: false, defaultValue: 'QUEUED' },
                providerMessageId: { type: DataTypes.STRING(255), allowNull: true },
                providerResponse: { type: DataTypes.TEXT, allowNull: true },
                error: { type: DataTypes.TEXT, allowNull: true },
                sentAt: { type: DataTypes.DATE, allowNull: true },
                deliveredAt: { type: DataTypes.DATE, allowNull: true },
                metadata: { type: DataTypes.JSON, allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            });
            console.log('Created SmsLogs table');
        }
    } catch (error) {
        console.error('ensureSmsLogsTable error:', error.message);
    }
};

const runAllMigrations = async () => {
    try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
        await sequelize.sync({ alter: false }).catch(() => {});
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
        console.log('Database tables synced successfully');
    } catch (e) {
        try { await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;'); } catch (_) {}
    }

    try {
        await ensureSpecificationsTable();
        await ensureVariantImageSpecAndVideoColumns();
        await ensureSoftDeleteColumns();
        await ensureReviewIndexes();
        await ensureStockColumns();
        await ensureBrandColumn();
        await ensureDiscountAndOfferColumns();
        await ensureDealExtraColumns();
        await ensureDealTargetColumns();
        await ensureOrderSlotMrpColumn();
        await ensureShiprocketColumns();
        await ensureShippingSettlementColumns();
        await ensureVariantStatusColumn();
        await ensureVariantGroupIdColumn();
        await ensureVariantExtraColumns();
        await ensureCartWishlistOrderColumns();
        await ensureGuestCheckoutColumns();
        await ensureGstColumns();
        await ensureCouponAndBusinessInvoiceColumns();
        await ensureSmsLogsTable();
        await ensureSettingTableSchema();
        await ensureSettingsSeeded();
        await ensureAdminSeeded();

        // ShippingZone table
        await ensureShippingZoneTable();

        // OrderCancellation table
        await ensureOrderCancellationTable();

        // Order table: COD tracker columns
        await ensureCodTrackerColumns();
    } catch (e) {
        // Post-sync migrations complete
    }
};

const ensureShippingSettlementColumns = async () => {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const ordTab = await getTableDesc(queryInterface, 'Orders');
        if (ordTab) {
            const table = ordTab.desc;
            const rName = ordTab.realName;
            
            // 1. courierShippingCost
            if (!table.courierShippingCost) {
                await queryInterface.addColumn(rName, 'courierShippingCost', {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                    defaultValue: 0.00
                });
                console.log(`Added ${rName}.courierShippingCost column`);
            }
            
            // 2. courierPaymentStatus
            if (!table.courierPaymentStatus) {
                await queryInterface.addColumn(rName, 'courierPaymentStatus', {
                    type: DataTypes.ENUM('Unpaid', 'Paid'),
                    allowNull: false,
                    defaultValue: 'Unpaid'
                });
                console.log(`Added ${rName}.courierPaymentStatus column`);
            }
            
            // 3. courierSettlementDate
            if (!table.courierSettlementDate) {
                await queryInterface.addColumn(rName, 'courierSettlementDate', {
                    type: DataTypes.DATE,
                    allowNull: true
                });
                console.log(`Added ${rName}.courierSettlementDate column`);
            }
        }
    } catch (err) {
        console.error('Error ensuring shipping settlement columns:', err.message);
    }
};

module.exports = { runAllMigrations };
