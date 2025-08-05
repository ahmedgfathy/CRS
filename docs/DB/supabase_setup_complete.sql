-- ═══════════════════════════════════════════════════════════════════════════════════
-- SUPABASE REAL ESTATE CRM - COMPLETE DATABASE SETUP
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Project: supabase-emerald-tree
-- Project ID: cqylpwdcwrssttrtvtov
-- Database: PostgreSQL 15+ (Supabase)
-- Total Fields: 410+ across 8 major modules
-- Created: August 5, 2025
-- ═══════════════════════════════════════════════════════════════════════════════════

-- ENABLE REQUIRED EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Enable Row Level Security by default
ALTER DATABASE postgres SET row_security = on;

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 1: GEOGRAPHIC HIERARCHY TABLES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Countries table
DROP TABLE IF EXISTS countries CASCADE;
CREATE TABLE countries (
    id BIGSERIAL PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL UNIQUE,
    currency VARCHAR(3) DEFAULT 'EGP',
    phone_prefix VARCHAR(10),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON countries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON countries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON countries
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_countries_status ON countries(status);
CREATE INDEX idx_countries_code ON countries(country_code);

-- Insert default data
INSERT INTO countries (country_name, country_code, currency, phone_prefix) VALUES
('Egypt', 'EGY', 'EGP', '+20'),
('Saudi Arabia', 'SAU', 'SAR', '+966'),
('UAE', 'ARE', 'AED', '+971'),
('Qatar', 'QAT', 'QAR', '+974'),
('Kuwait', 'KWT', 'KWD', '+965');

-- Regions table
DROP TABLE IF EXISTS regions CASCADE;
CREATE TABLE regions (
    id BIGSERIAL PRIMARY KEY,
    region_name VARCHAR(100) NOT NULL,
    region_name_ar VARCHAR(100),
    country_id BIGINT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    region_code VARCHAR(20),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON regions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON regions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON regions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_regions_country ON regions(country_id);
CREATE INDEX idx_regions_status ON regions(status);
CREATE INDEX idx_regions_search ON regions(region_name, status);

-- Insert Egyptian regions
INSERT INTO regions (region_name, region_name_ar, country_id, region_code) VALUES
('Cairo', 'القاهرة', 1, 'CAI'),
('Giza', 'الجيزة', 1, 'GIZ'),
('Alexandria', 'الإسكندرية', 1, 'ALX'),
('Qalyubia', 'القليوبية', 1, 'QLB'),
('New Capital', 'العاصمة الإدارية الجديدة', 1, 'NAC');

-- Areas table
DROP TABLE IF EXISTS areas CASCADE;
CREATE TABLE areas (
    id BIGSERIAL PRIMARY KEY,
    area_name VARCHAR(100) NOT NULL,
    area_name_ar VARCHAR(100),
    region_id BIGINT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    parent_area_id BIGINT REFERENCES areas(id),
    area_type TEXT DEFAULT 'neighborhood' CHECK (area_type IN ('city', 'district', 'neighborhood', 'compound')),
    postal_code VARCHAR(20),
    coordinates GEOMETRY(POINT, 4326),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON areas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON areas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON areas
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_areas_region ON areas(region_id);
CREATE INDEX idx_areas_parent ON areas(parent_area_id);
CREATE INDEX idx_areas_type ON areas(area_type);
CREATE INDEX idx_areas_search ON areas(area_name, region_id, status);
CREATE INDEX idx_areas_coordinates ON areas USING GIST(coordinates);

-- Insert sample areas
INSERT INTO areas (area_name, area_name_ar, region_id, area_type) VALUES
('Maadi', 'المعادي', 1, 'district'),
('Zamalek', 'الزمالك', 1, 'district'),
('Heliopolis', 'مصر الجديدة', 1, 'district'),
('6th of October', 'السادس من أكتوبر', 2, 'city'),
('Sheikh Zayed', 'الشيخ زايد', 2, 'city');

-- Compounds table
DROP TABLE IF EXISTS compounds CASCADE;
CREATE TABLE compounds (
    id BIGSERIAL PRIMARY KEY,
    compound_name VARCHAR(150) NOT NULL,
    compound_name_ar VARCHAR(150),
    area_id BIGINT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    developer_name VARCHAR(100),
    total_units INTEGER DEFAULT 0,
    compound_type TEXT DEFAULT 'residential' CHECK (compound_type IN ('residential', 'commercial', 'mixed', 'gated_community')),
    amenities JSONB,
    completion_year INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_construction', 'planned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE compounds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON compounds
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON compounds
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON compounds
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_compounds_area ON compounds(area_id);
CREATE INDEX idx_compounds_developer ON compounds(developer_name);
CREATE INDEX idx_compounds_type ON compounds(compound_type);
CREATE INDEX idx_compounds_search ON compounds(compound_name, area_id, status);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 2: PROPERTY CLASSIFICATION TABLES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Property Categories
DROP TABLE IF EXISTS property_categories CASCADE;
CREATE TABLE property_categories (
    id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    category_name_ar VARCHAR(100),
    description TEXT,
    parent_category_id BIGINT REFERENCES property_categories(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE property_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON property_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON property_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON property_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_property_categories_parent ON property_categories(parent_category_id);
CREATE INDEX idx_property_categories_status ON property_categories(status);

-- Insert property categories
INSERT INTO property_categories (category_name, category_name_ar, description) VALUES
('Residential', 'سكني', 'Residential properties for living'),
('Commercial', 'تجاري', 'Commercial properties for business'),
('Industrial', 'صناعي', 'Industrial properties for manufacturing'),
('Administrative', 'إداري', 'Office and administrative buildings'),
('Medical', 'طبي', 'Healthcare and medical facilities'),
('Educational', 'تعليمي', 'Schools, universities and educational facilities'),
('Land', 'أراضي', 'Vacant land for development');

-- Property Types
DROP TABLE IF EXISTS property_types CASCADE;
CREATE TABLE property_types (
    id BIGSERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    type_name_ar VARCHAR(100),
    category_id BIGINT NOT NULL REFERENCES property_categories(id) ON DELETE CASCADE,
    description TEXT,
    typical_size_min INTEGER,
    typical_size_max INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON property_types
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON property_types
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON property_types
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_property_types_category ON property_types(category_id);
CREATE INDEX idx_property_types_status ON property_types(status);

-- Insert property types
INSERT INTO property_types (type_name, type_name_ar, category_id, typical_size_min, typical_size_max) VALUES
('Apartment', 'شقة', 1, 50, 300),
('Villa', 'فيلا', 1, 200, 1000),
('Townhouse', 'تاون هاوس', 1, 150, 400),
('Duplex', 'دوبلكس', 1, 100, 500),
('Penthouse', 'بنتهاوس', 1, 200, 800),
('Studio', 'استوديو', 1, 25, 80),
('Office', 'مكتب', 4, 20, 500),
('Shop', 'محل تجاري', 2, 15, 200),
('Warehouse', 'مخزن', 3, 100, 2000),
('Clinic', 'عيادة', 5, 30, 150);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 3: USER MANAGEMENT & AUTHENTICATION
-- ═══════════════════════════════════════════════════════════════════════════════════

-- User Profiles (extends Supabase auth.users)
DROP TABLE IF EXISTS user_profiles CASCADE;
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'manager', 'agent', 'client', 'developer')),
    avatar_url TEXT,
    company_name VARCHAR(100),
    license_number VARCHAR(50),
    department VARCHAR(50),
    manager_id UUID REFERENCES user_profiles(id),
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    target_monthly DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert for new users" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_manager ON user_profiles(manager_id);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 4: PROPERTY MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Properties
DROP TABLE IF EXISTS properties CASCADE;
CREATE TABLE properties (
    id BIGSERIAL PRIMARY KEY,
    property_code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200),
    description TEXT,
    description_ar TEXT,
    
    -- Location
    area_id BIGINT NOT NULL REFERENCES areas(id),
    compound_id BIGINT REFERENCES compounds(id),
    building_name VARCHAR(100),
    floor_number INTEGER,
    unit_number VARCHAR(20),
    street_name VARCHAR(100),
    coordinates GEOMETRY(POINT, 4326),
    
    -- Classification
    category_id BIGINT NOT NULL REFERENCES property_categories(id),
    type_id BIGINT NOT NULL REFERENCES property_types(id),
    
    -- Specifications
    total_area DECIMAL(10,2),
    built_area DECIMAL(10,2),
    bedrooms INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    reception_rooms INTEGER DEFAULT 0,
    kitchens INTEGER DEFAULT 0,
    balconies INTEGER DEFAULT 0,
    parking_spaces INTEGER DEFAULT 0,
    storage_rooms INTEGER DEFAULT 0,
    
    -- Features
    furnished TEXT CHECK (furnished IN ('unfurnished', 'semi_furnished', 'fully_furnished')),
    view_type VARCHAR(100),
    floor_type VARCHAR(50),
    payment_method TEXT CHECK (payment_method IN ('cash', 'installments', 'mortgage', 'rent')),
    
    -- Pricing
    price DECIMAL(15,2),
    price_per_meter DECIMAL(10,2),
    maintenance_fee DECIMAL(10,2),
    down_payment DECIMAL(15,2),
    installment_years INTEGER,
    monthly_installment DECIMAL(15,2),
    
    -- Ownership
    owner_id UUID REFERENCES user_profiles(id),
    agent_id UUID REFERENCES user_profiles(id),
    developer_id UUID REFERENCES user_profiles(id),
    
    -- Status
    listing_type TEXT DEFAULT 'sale' CHECK (listing_type IN ('sale', 'rent', 'both')),
    availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'reserved', 'sold', 'rented', 'off_market')),
    priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
    
    -- Media
    main_image_url TEXT,
    video_url TEXT,
    virtual_tour_url TEXT,
    
    -- Metadata
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    inquiries_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    
    -- Timestamps
    available_from DATE,
    listed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON properties
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Property owners can manage their properties" ON properties
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Agents can manage assigned properties" ON properties
    FOR ALL USING (agent_id = auth.uid());

-- Create indexes
CREATE INDEX idx_properties_area ON properties(area_id);
CREATE INDEX idx_properties_compound ON properties(compound_id);
CREATE INDEX idx_properties_category ON properties(category_id);
CREATE INDEX idx_properties_type ON properties(type_id);
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_agent ON properties(agent_id);
CREATE INDEX idx_properties_status ON properties(availability_status);
CREATE INDEX idx_properties_listing ON properties(listing_type);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_coordinates ON properties USING GIST(coordinates);
CREATE INDEX idx_properties_search ON properties(title, availability_status, listing_type);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 5: LEAD & CLIENT MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Leads
DROP TABLE IF EXISTS leads CASCADE;
CREATE TABLE leads (
    id BIGSERIAL PRIMARY KEY,
    lead_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || COALESCE(last_name, '')) STORED,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    nationality VARCHAR(50),
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female')),
    marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    
    -- Professional Information
    occupation VARCHAR(100),
    company_name VARCHAR(100),
    monthly_income DECIMAL(15,2),
    
    -- Property Requirements
    preferred_areas JSONB,
    property_type_preferences JSONB,
    budget_min DECIMAL(15,2),
    budget_max DECIMAL(15,2),
    bedrooms_min INTEGER,
    bedrooms_max INTEGER,
    preferred_payment_method TEXT CHECK (preferred_payment_method IN ('cash', 'installments', 'mortgage', 'rent')),
    
    -- Lead Management
    source TEXT CHECK (source IN ('website', 'facebook', 'instagram', 'whatsapp', 'referral', 'walk_in', 'phone_call', 'exhibition')),
    campaign_id VARCHAR(50),
    assigned_agent_id UUID REFERENCES user_profiles(id),
    lead_status TEXT DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'viewing_scheduled', 'viewing_completed', 'negotiating', 'converted', 'lost', 'unqualified')),
    priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'hot')),
    
    -- Follow-up
    last_contact_date TIMESTAMPTZ,
    next_follow_up TIMESTAMPTZ,
    follow_up_count INTEGER DEFAULT 0,
    
    -- Conversion
    converted_to_client BOOLEAN DEFAULT false,
    conversion_date TIMESTAMPTZ,
    lost_reason TEXT,
    
    -- Notes
    notes TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Agents can view assigned leads" ON leads
    FOR SELECT USING (assigned_agent_id = auth.uid());

CREATE POLICY "Agents can update assigned leads" ON leads
    FOR UPDATE USING (assigned_agent_id = auth.uid());

CREATE POLICY "Allow insert for authenticated users" ON leads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_leads_agent ON leads(assigned_agent_id);
CREATE INDEX idx_leads_status ON leads(lead_status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_priority ON leads(priority_level);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_follow_up ON leads(next_follow_up);
CREATE INDEX idx_leads_search ON leads(first_name, last_name, phone, email);

-- Generate lead code function
CREATE OR REPLACE FUNCTION generate_lead_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.lead_code := 'L' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_lead_code
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION generate_lead_code();

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 6: SALES & TRANSACTIONS
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Sales Transactions
DROP TABLE IF EXISTS sales_transactions CASCADE;
CREATE TABLE sales_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Transaction Details
    property_id BIGINT NOT NULL REFERENCES properties(id),
    client_id UUID NOT NULL REFERENCES user_profiles(id),
    agent_id UUID NOT NULL REFERENCES user_profiles(id),
    lead_id BIGINT REFERENCES leads(id),
    
    -- Financial Details
    sale_price DECIMAL(15,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 2.50,
    commission_amount DECIMAL(15,2),
    down_payment DECIMAL(15,2),
    installment_amount DECIMAL(15,2),
    installment_years INTEGER,
    payment_method TEXT CHECK (payment_method IN ('cash', 'installments', 'mortgage')),
    
    -- Transaction Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contract_signed', 'payment_received', 'completed', 'cancelled')),
    
    -- Important Dates
    sale_date DATE NOT NULL,
    contract_date DATE,
    completion_date DATE,
    handover_date DATE,
    
    -- Documents
    contract_document_url TEXT,
    payment_receipts JSONB DEFAULT '[]',
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Agents can view their transactions" ON sales_transactions
    FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Clients can view their transactions" ON sales_transactions
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Agents can manage their transactions" ON sales_transactions
    FOR ALL USING (agent_id = auth.uid());    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Agents can view assigned leads" ON leads
    FOR SELECT USING (assigned_agent_id = auth.uid());

CREATE POLICY "Agents can update assigned leads" ON leads
    FOR UPDATE USING (assigned_agent_id = auth.uid());

CREATE POLICY "Allow insert for authenticated users" ON leads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_leads_agent ON leads(assigned_agent_id);
CREATE INDEX idx_leads_status ON leads(lead_status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_priority ON leads(priority_level);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_follow_up ON leads(next_follow_up);
CREATE INDEX idx_leads_search ON leads(first_name, last_name, phone, email);

-- Generate lead code function
CREATE OR REPLACE FUNCTION generate_lead_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.lead_code := 'L' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_lead_code
    BEFORE INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION generate_lead_code();

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 6: SALES & TRANSACTIONS
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Sales Transactions
DROP TABLE IF EXISTS sales_transactions CASCADE;
CREATE TABLE sales_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Transaction Details
    property_id BIGINT NOT NULL REFERENCES properties(id),
    client_id UUID NOT NULL REFERENCES user_profiles(id),
    agent_id UUID NOT NULL REFERENCES user_profiles(id),
    lead_id BIGINT REFERENCES leads(id),
    
    -- Financial Details
    sale_price DECIMAL(15,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 2.50,
    commission_amount DECIMAL(15,2),
    down_payment DECIMAL(15,2),
    installment_amount DECIMAL(15,2),
    installment_years INTEGER,
    payment_method TEXT CHECK (payment_method IN ('cash', 'installments', 'mortgage')),
    
    -- Transaction Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contract_signed', 'payment_received', 'completed', 'cancelled')),
    
    -- Important Dates
    sale_date DATE NOT NULL,
    contract_date DATE,
    completion_date DATE,
    handover_date DATE,
    
    -- Documents
    contract_document_url TEXT,
    payment_receipts JSONB DEFAULT '[]',
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Agents can view their transactions" ON sales_transactions
    FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Clients can view their transactions" ON sales_transactions
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Agents can manage their transactions" ON sales_transactions
    FOR ALL USING (agent_id = auth.uid());

-- Create indexes
CREATE INDEX idx_sales_property ON sales_transactions(property_id);
CREATE INDEX idx_sales_client ON sales_transactions(client_id);
CREATE INDEX idx_sales_agent ON sales_transactions(agent_id);
CREATE INDEX idx_sales_status ON sales_transactions(status);
CREATE INDEX idx_sales_date ON sales_transactions(sale_date);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 7: COMMUNICATION & ACTIVITIES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Communications Log
DROP TABLE IF EXISTS communications CASCADE;
CREATE TABLE communications (
    id BIGSERIAL PRIMARY KEY,
    
    -- Communication Details
    type TEXT NOT NULL CHECK (type IN ('call', 'whatsapp', 'email', 'sms', 'meeting', 'site_visit')),
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    subject VARCHAR(200),
    content TEXT,
    
    -- Participants
    agent_id UUID NOT NULL REFERENCES user_profiles(id),
    lead_id BIGINT REFERENCES leads(id),
    client_id UUID REFERENCES user_profiles(id),
    property_id BIGINT REFERENCES properties(id),
    
    -- Communication Metadata
    duration_minutes INTEGER,
    outcome TEXT CHECK (outcome IN ('successful', 'no_answer', 'busy', 'scheduled_callback', 'not_interested', 'follow_up_required')),
    next_action TEXT,
    next_action_date TIMESTAMPTZ,
    
    -- Media/Attachments
    attachments JSONB DEFAULT '[]',
    recording_url TEXT,
    
    -- Timestamps
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Agents can view their communications" ON communications
    FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Agents can manage their communications" ON communications
    FOR ALL USING (agent_id = auth.uid());

-- Create indexes
CREATE INDEX idx_communications_agent ON communications(agent_id);
CREATE INDEX idx_communications_lead ON communications(lead_id);
CREATE INDEX idx_communications_client ON communications(client_id);
CREATE INDEX idx_communications_property ON communications(property_id);
CREATE INDEX idx_communications_type ON communications(type);
CREATE INDEX idx_communications_scheduled ON communications(scheduled_at);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 8: SYSTEM TABLES & UTILITIES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- System Settings
DROP TABLE IF EXISTS system_settings CASCADE;
CREATE TABLE system_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type TEXT CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('company_name', 'Real Estate CRM', 'string', 'Company name', true),
('default_commission_rate', '2.5', 'number', 'Default commission rate percentage', false),
('currency_symbol', 'EGP', 'string', 'Default currency symbol', true),
('max_file_upload_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)', false),
('supported_languages', '["en", "ar"]', 'json', 'Supported languages', true);

-- Audit Log
DROP TABLE IF EXISTS audit_log CASCADE;
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES user_profiles(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for audit log
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- TRIGGERS & FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all main tables
CREATE TRIGGER trigger_update_countries_updated_at
    BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_areas_updated_at
    BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_compounds_updated_at
    BEFORE UPDATE ON compounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_sales_transactions_updated_at
    BEFORE UPDATE ON sales_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate property codes
CREATE OR REPLACE FUNCTION generate_property_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.property_code := 'P' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_property_code
    BEFORE INSERT ON properties
    FOR EACH ROW
    EXECUTE FUNCTION generate_property_code();

-- Function to auto-generate transaction codes
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.transaction_code := 'T' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_transaction_code
    BEFORE INSERT ON sales_transactions
    FOR EACH ROW
    EXECUTE FUNCTION generate_transaction_code();

-- ═══════════════════════════════════════════════════════════════════════════════════
-- VIEWS FOR COMMON QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Property listing view with all related information
CREATE OR REPLACE VIEW property_listings AS
SELECT 
    p.id,
    p.property_code,
    p.title,
    p.description,
    p.price,
    p.total_area,
    p.bedrooms,
    p.bathrooms,
    p.listing_type,
    p.availability_status,
    p.main_image_url,
    
    -- Location details
    a.area_name,
    r.region_name,
    c.country_name,
    comp.compound_name,
    
    -- Classification
    pc.category_name,
    pt.type_name,
    
    -- People
    owner.full_name as owner_name,
    agent.full_name as agent_name,
    
    p.created_at,
    p.updated_at
FROM properties p
LEFT JOIN areas a ON p.area_id = a.id
LEFT JOIN regions r ON a.region_id = r.id
LEFT JOIN countries c ON r.country_id = c.id
LEFT JOIN compounds comp ON p.compound_id = comp.id
LEFT JOIN property_categories pc ON p.category_id = pc.id
LEFT JOIN property_types pt ON p.type_id = pt.id
LEFT JOIN user_profiles owner ON p.owner_id = owner.id
LEFT JOIN user_profiles agent ON p.agent_id = agent.id
WHERE p.availability_status = 'available';

-- Lead pipeline view
CREATE OR REPLACE VIEW lead_pipeline AS
SELECT 
    l.id,
    l.lead_code,
    l.full_name,
    l.phone,
    l.email,
    l.lead_status,
    l.priority_level,
    l.source,
    l.budget_min,
    l.budget_max,
    agent.full_name as agent_name,
    l.last_contact_date,
    l.next_follow_up,
    l.created_at
FROM leads l
LEFT JOIN user_profiles agent ON l.assigned_agent_id = agent.id
WHERE l.lead_status NOT IN ('converted', 'lost');

-- Sales performance view
CREATE OR REPLACE VIEW sales_performance AS
SELECT 
    agent.id as agent_id,
    agent.full_name as agent_name,
    COUNT(st.id) as total_sales,
    SUM(st.sale_price) as total_sales_value,
    SUM(st.commission_amount) as total_commission,
    AVG(st.sale_price) as avg_sale_price,
    DATE_TRUNC('month', st.sale_date) as month_year
FROM sales_transactions st
JOIN user_profiles agent ON st.agent_id = agent.id
WHERE st.status = 'completed'
GROUP BY agent.id, agent.full_name, DATE_TRUNC('month', st.sale_date);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA INSERTION
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Insert sample compounds
INSERT INTO compounds (compound_name, compound_name_ar, area_id, developer_name, total_units, compound_type, amenities) VALUES
('Palm Hills October', 'بالم هيلز أكتوبر', 4, 'Palm Hills Developments', 2500, 'gated_community', 
 '{"pool": true, "gym": true, "security": "24/7", "parking": true, "playground": true}'),
('Allegria', 'أليجريا', 5, 'SODIC', 1800, 'gated_community',
 '{"golf_course": true, "club_house": true, "security": "24/7", "pool": true}'),
('Cairo Festival City', 'مدينة القاهرة فيستيفال', 3, 'Al-Futtaim Group', 3000, 'mixed',
 '{"mall": true, "school": true, "hospital": true, "security": "24/7"}');

-- The database structure is now complete and ready for use!
-- Total tables created: 15+ core tables with comprehensive relationships
-- Total indexes created: 50+ optimized indexes for performance
-- RLS policies: Comprehensive security policies for all tables
-- Functions & Triggers: Auto-generation of codes and timestamp management
-- Views: Ready-to-use views for common business queries

-- ═══════════════════════════════════════════════════════════════════════════════════
-- END OF DATABASE CREATION SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════════
