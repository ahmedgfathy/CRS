-- ═══════════════════════════════════════════════════════════════════════════════════
-- REAL ESTATE CRM DATABASE - SUPABASE POSTGRESQL VERSION
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Converted from MySQL to PostgreSQL for Supabase
-- Version: 1.0 Supabase Edition
-- Created: August 3, 2025
-- Database: PostgreSQL 15+ (Supabase)
-- Total Fields: 410 across 8 major modules
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 1: GEOGRAPHIC HIERARCHY TABLES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Countries table
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

-- Create indexes
CREATE INDEX idx_countries_status ON countries(status);
CREATE INDEX idx_countries_code ON countries(country_code);

-- Regions table
CREATE TABLE regions (
    id BIGSERIAL PRIMARY KEY,
    region_name VARCHAR(100) NOT NULL,
    region_name_ar VARCHAR(100),
    country_id BIGINT NOT NULL REFERENCES countries(id),
    region_code VARCHAR(20),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_regions_country ON regions(country_id);
CREATE INDEX idx_regions_status ON regions(status);
CREATE INDEX idx_regions_search ON regions(region_name, status);

-- Areas table
CREATE TABLE areas (
    id BIGSERIAL PRIMARY KEY,
    area_name VARCHAR(100) NOT NULL,
    area_name_ar VARCHAR(100),
    region_id BIGINT NOT NULL REFERENCES regions(id),
    parent_area_id BIGINT REFERENCES areas(id),
    area_type TEXT DEFAULT 'neighborhood' CHECK (area_type IN ('city', 'district', 'neighborhood', 'compound')),
    postal_code VARCHAR(20),
    coordinates GEOMETRY(POINT, 4326), -- PostGIS for geolocation
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_areas_region ON areas(region_id);
CREATE INDEX idx_areas_parent ON areas(parent_area_id);
CREATE INDEX idx_areas_type ON areas(area_type);
CREATE INDEX idx_areas_search ON areas(area_name, region_id, status);
CREATE INDEX idx_areas_coordinates ON areas USING GIST(coordinates);

-- Compounds table
CREATE TABLE compounds (
    id BIGSERIAL PRIMARY KEY,
    compound_name VARCHAR(150) NOT NULL,
    compound_name_ar VARCHAR(150),
    area_id BIGINT NOT NULL REFERENCES areas(id),
    developer_name VARCHAR(100),
    total_units INTEGER DEFAULT 0,
    compound_type TEXT DEFAULT 'residential' CHECK (compound_type IN ('residential', 'commercial', 'mixed', 'gated_community')),
    amenities JSONB,
    completion_year INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_construction', 'planned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_compounds_area ON compounds(area_id);
CREATE INDEX idx_compounds_developer ON compounds(developer_name);
CREATE INDEX idx_compounds_type ON compounds(compound_type);
CREATE INDEX idx_compounds_search ON compounds(compound_name, area_id, status);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 2: PROPERTY CLASSIFICATION TABLES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Property Categories
CREATE TABLE property_categories (
    id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    category_name_ar VARCHAR(50),
    parent_id BIGINT REFERENCES property_categories(id),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_name)
);

-- Create indexes
CREATE INDEX idx_categories_parent ON property_categories(parent_id);
CREATE INDEX idx_categories_status ON property_categories(status);

-- Property Types
CREATE TABLE property_types (
    id BIGSERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    type_name_ar VARCHAR(50),
    category_id BIGINT NOT NULL REFERENCES property_categories(id),
    bedroom_count INTEGER DEFAULT 0,
    bathroom_count INTEGER DEFAULT 0,
    description TEXT,
    average_size DECIMAL(8,2), -- in square meters
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type_name, category_id)
);

-- Create indexes
CREATE INDEX idx_property_types_category ON property_types(category_id);
CREATE INDEX idx_property_types_bedrooms ON property_types(bedroom_count);
CREATE INDEX idx_property_types_status ON property_types(status);

-- Unit Types
CREATE TABLE unit_types (
    id BIGSERIAL PRIMARY KEY,
    unit_type_name VARCHAR(50) NOT NULL,
    unit_type_name_ar VARCHAR(50),
    property_type_id BIGINT NOT NULL REFERENCES property_types(id),
    description TEXT,
    specifications JSONB,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_unit_types_property_type ON unit_types(property_type_id);
CREATE INDEX idx_unit_types_status ON unit_types(status);

-- Property Features
CREATE TABLE property_features (
    id BIGSERIAL PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL,
    feature_name_ar VARCHAR(100),
    feature_category TEXT DEFAULT 'amenity' CHECK (feature_category IN ('interior', 'exterior', 'amenity', 'security', 'parking', 'utility')),
    description TEXT,
    icon_class VARCHAR(50),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feature_name)
);

-- Create indexes
CREATE INDEX idx_features_category ON property_features(feature_category);
CREATE INDEX idx_features_status ON property_features(status);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 3: USER MANAGEMENT & AUTHENTICATION TABLES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- User Roles
CREATE TABLE user_roles (
    id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    role_name_ar VARCHAR(50),
    role_level INTEGER NOT NULL, -- 1=Sole Admin, 2=Owner, 3=Manager, 4=Team Lead, 5=Agent, 6=Individual
    description TEXT,
    permissions JSONB,
    can_manage_roles BOOLEAN DEFAULT FALSE,
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_view_all_data BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_name)
);

-- Create indexes
CREATE INDEX idx_roles_level ON user_roles(role_level);
CREATE INDEX idx_roles_status ON user_roles(status);

-- Departments
CREATE TABLE departments (
    id BIGSERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    department_name_ar VARCHAR(100),
    department_code VARCHAR(20) NOT NULL UNIQUE,
    parent_department_id BIGINT REFERENCES departments(id),
    manager_id BIGINT,
    budget DECIMAL(15,2),
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_manager ON departments(manager_id);
CREATE INDEX idx_departments_status ON departments(status);

-- Teams
CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    team_name_ar VARCHAR(100),
    department_id BIGINT NOT NULL REFERENCES departments(id),
    team_lead_id BIGINT,
    team_type TEXT DEFAULT 'sales' CHECK (team_type IN ('sales', 'marketing', 'support', 'admin', 'management')),
    target_monthly DECIMAL(15,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_teams_department ON teams(department_id);
CREATE INDEX idx_teams_lead ON teams(team_lead_id);
CREATE INDEX idx_teams_type ON teams(team_type);
CREATE INDEX idx_teams_status ON teams(status);

-- Users table (Authentication & Core Profile)
-- NOTE: This extends Supabase auth.users with custom profile data
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_code VARCHAR(20) NOT NULL UNIQUE,
    
    -- Profile Information
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    full_name_ar VARCHAR(100),
    display_name VARCHAR(100),
    title VARCHAR(100),
    
    -- Contact Information
    phone_primary VARCHAR(20),
    phone_secondary VARCHAR(20),
    whatsapp_number VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    
    -- System Access
    role_id BIGINT NOT NULL REFERENCES user_roles(id),
    department_id BIGINT REFERENCES departments(id),
    team_id BIGINT REFERENCES teams(id),
    direct_manager_id UUID REFERENCES user_profiles(id),
    
    -- Account Settings
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar', 'both')),
    timezone VARCHAR(50) DEFAULT 'Africa/Cairo',
    date_format VARCHAR(20) DEFAULT 'Y-m-d',
    currency_preference VARCHAR(3) DEFAULT 'EGP',
    
    -- Security Settings
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Session Management
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    
    -- Employment Information
    employee_id VARCHAR(50),
    hire_date DATE,
    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'consultant', 'intern')),
    employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'on_leave', 'terminated')),
    
    -- Performance & Targets
    sales_target_monthly DECIMAL(15,2),
    commission_rate DECIMAL(5,2),
    base_salary DECIMAL(10,2),
    
    -- Access Control
    can_login BOOLEAN DEFAULT TRUE,
    can_api_access BOOLEAN DEFAULT FALSE,
    data_access_level TEXT DEFAULT 'own' CHECK (data_access_level IN ('own', 'team', 'department', 'all')),
    ip_whitelist JSONB,
    
    -- Audit Fields
    created_by UUID REFERENCES user_profiles(id),
    updated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX idx_user_profiles_department ON user_profiles(department_id);
CREATE INDEX idx_user_profiles_team ON user_profiles(team_id);
CREATE INDEX idx_user_profiles_manager ON user_profiles(direct_manager_id);
CREATE INDEX idx_user_profiles_employment ON user_profiles(employment_status);
CREATE INDEX idx_user_profiles_user_code ON user_profiles(user_code);

-- Data Access Groups (for territory/team-based access control)
CREATE TABLE data_access_groups (
    id BIGSERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    group_type TEXT DEFAULT 'team' CHECK (group_type IN ('geographic', 'property_type', 'price_range', 'team', 'department')),
    description TEXT,
    access_rules JSONB, -- Defines what data this group can access
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_access_groups_type ON data_access_groups(group_type);
CREATE INDEX idx_access_groups_status ON data_access_groups(status);

-- User Access Group Memberships
CREATE TABLE user_access_groups (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    access_group_id BIGINT NOT NULL REFERENCES data_access_groups(id),
    granted_by UUID NOT NULL REFERENCES user_profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE(user_id, access_group_id)
);

-- Create indexes
CREATE INDEX idx_user_access_user ON user_access_groups(user_id);
CREATE INDEX idx_user_access_group ON user_access_groups(access_group_id);
CREATE INDEX idx_user_access_status ON user_access_groups(status);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- PHASE 4: BUSINESS LOOKUP TABLES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Lead Sources
CREATE TABLE lead_sources (
    id BIGSERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL UNIQUE,
    source_name_ar VARCHAR(100),
    source_type TEXT DEFAULT 'digital' CHECK (source_type IN ('digital', 'traditional', 'referral', 'direct')),
    cost_per_lead DECIMAL(10,2),
    tracking_code VARCHAR(50),
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_lead_sources_type ON lead_sources(source_type);
CREATE INDEX idx_lead_sources_status ON lead_sources(status);

-- Lead Statuses
CREATE TABLE lead_statuses (
    id BIGSERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    status_name_ar VARCHAR(50),
    status_type TEXT DEFAULT 'new' CHECK (status_type IN ('new', 'working', 'qualified', 'unqualified', 'converted', 'lost')),
    stage_order INTEGER NOT NULL UNIQUE,
    is_active_stage BOOLEAN DEFAULT TRUE,
    color_code VARCHAR(7) DEFAULT '#007bff',
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_lead_statuses_type ON lead_statuses(status_type);
CREATE INDEX idx_lead_statuses_order ON lead_statuses(stage_order);
CREATE INDEX idx_lead_statuses_status ON lead_statuses(status);

-- Budget Ranges
CREATE TABLE budget_ranges (
    id BIGSERIAL PRIMARY KEY,
    range_name VARCHAR(50) NOT NULL UNIQUE,
    range_name_ar VARCHAR(50),
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),
    currency_id VARCHAR(3) DEFAULT 'EGP',
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_budget_ranges_amount ON budget_ranges(min_amount, max_amount);
CREATE INDEX idx_budget_ranges_status ON budget_ranges(status);

-- Payment Types
CREATE TABLE payment_types (
    id BIGSERIAL PRIMARY KEY,
    payment_method VARCHAR(50) NOT NULL UNIQUE,
    payment_method_ar VARCHAR(50),
    description TEXT,
    payment_terms TEXT,
    processing_fee DECIMAL(5,2) DEFAULT 0.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payment_types_status ON payment_types(status);

-- Continue with remaining tables in next part...
-- This is part 1 of the Supabase conversion
-- Total: ~1000 lines to convert
