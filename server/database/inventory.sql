
-- Inventory Management Tables
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    threshold INTEGER DEFAULT 10,
    unit VARCHAR(50),
    supplier VARCHAR(255),
    cost_per_unit DECIMAL(10,2),
    last_restocked DATE,
    usage_rate DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory transactions for tracking usage
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER,
    transaction_type VARCHAR(20), -- 'usage', 'restock', 'adjustment'
    quantity INTEGER,
    reason TEXT,
    staff_id INTEGER,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Sample inventory data
INSERT OR IGNORE INTO inventory (name, category, quantity, threshold, unit, supplier, cost_per_unit, usage_rate) VALUES
('Uniforms - Small', 'uniforms', 45, 20, 'pieces', 'Military Supply Co', 89.99, 2.5),
('Uniforms - Medium', 'uniforms', 65, 25, 'pieces', 'Military Supply Co', 89.99, 3.2),
('Uniforms - Large', 'uniforms', 55, 20, 'pieces', 'Military Supply Co', 89.99, 2.8),
('HiSET Math Workbooks', 'textbooks', 35, 15, 'books', 'Educational Publishers', 45.50, 1.8),
('HiSET English Workbooks', 'textbooks', 28, 15, 'books', 'Educational Publishers', 45.50, 1.5),
('HiSET Science Workbooks', 'textbooks', 32, 15, 'books', 'Educational Publishers', 45.50, 1.6),
('PT Equipment - Kettlebells', 'equipment', 12, 8, 'pieces', 'Fitness Depot', 125.00, 0.1),
('First Aid Kits', 'medical', 8, 5, 'kits', 'Medical Supply Inc', 75.00, 0.2),
('Office Supplies', 'office', 150, 50, 'units', 'Office Depot', 2.50, 5.0),
('Cleaning Supplies', 'maintenance', 25, 10, 'units', 'Janitorial Supply', 15.00, 2.0);
