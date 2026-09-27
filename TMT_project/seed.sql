-- Seed Data for Tax & Milestone Tracker (TMT)
-- Note: All sample data is mock / synthetic.
-- Default password for seeded users is: Password123!
-- Hashed using bcrypt (cost factor 10): $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW

-- Insert Initial Users (Admin & Staff)
INSERT INTO users (id, email, password_hash, role, is_active, email_verified_at) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@tmtfirm.ph', '$2a$10$LTIse/cbyODWpH7E6mdM0uQ4B7YYUMrYDnW/3ZC2N7UZjQUm2qtAu', 'ADMIN', TRUE, NOW()),
('22222222-2222-2222-2222-222222222222', 'staff@tmtfirm.ph', '$2a$10$LTIse/cbyODWpH7E6mdM0uQ4B7YYUMrYDnW/3ZC2N7UZjQUm2qtAu', 'STAFF', TRUE, NOW());

-- Insert Sample Philippine Clients
INSERT INTO clients (id, name, tin, business_type, is_archived) VALUES
('a1111111-1111-1111-1111-111111111111', 'Acme Business Solutions Inc.', '008-123-456-0000', 'Corporation', FALSE),
('a2222222-2222-2222-2222-222222222222', 'Luzon Retail & Logistics Co.', '123-456-789-0001', 'Partnership', FALSE),
('a3333333-3333-3333-3333-333333333333', 'Maharlika Tech Systems', '987-654-321-0000', 'Sole Proprietorship', FALSE),
('a4444444-4444-4444-4444-444444444444', 'Legacy Trading Enterprises', '555-444-333-0002', 'Corporation', TRUE);

-- Insert Sample Tax Obligations
INSERT INTO tax_obligations (id, client_id, tax_type, due_date, amount, status) VALUES
('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'BIR Form 2551Q (Quarterly Percentage Tax)', '2026-04-25', 12500.00, 'PENDING'),
('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'BIR Form 1701Q (Quarterly Income Tax)', '2026-09-27', 34000.00, 'UNDER_REVIEW'),
('b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'BIR Form 0605 (Annual Registration Fee)', '2026-01-31', 500.00, 'VERIFIED'),
('b4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333', 'BIR Form 1601-EQ (Withholding Tax)', '2026-03-31', 8200.00, 'REJECTED');

-- Insert Sample Payment Milestones
INSERT INTO payment_milestones (id, client_id, title, due_date, amount, status) VALUES
('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Q1 Financial Audit Retainer', '2026-04-15', 25000.00, 'PENDING'),
('c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Monthly Bookkeeping Retainer', '2026-04-05', 8500.00, 'VERIFIED'),
('c3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'Corporate Tax Filing Assistance', '2026-04-30', 15000.00, 'PENDING');

-- Insert Sample Audit Log Events
INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, metadata) VALUES
('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'SYSTEM_INITIALIZATION', 'SYSTEM', '11111111-1111-1111-1111-111111111111', '{"description": "Database seeded successfully"}'::jsonb);

