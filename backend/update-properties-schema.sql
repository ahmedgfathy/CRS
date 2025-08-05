-- Update properties table to include ALL missing Appwrite fields
-- This adds all the owner, area, floor, compound data you need!

-- Add missing columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS owner_mobile VARCHAR(50),
ADD COLUMN IF NOT EXISTS floor_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS compound_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS land_area DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS building_area DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS finished_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS unit_features TEXT,
ADD COLUMN IF NOT EXISTS phase_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS handler VARCHAR(255),
ADD COLUMN IF NOT EXISTS sales_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS down_payment DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS inside_compound VARCHAR(50),
ADD COLUMN IF NOT EXISTS property_offered_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS activity VARCHAR(100),
ADD COLUMN IF NOT EXISTS space_earth VARCHAR(50),
ADD COLUMN IF NOT EXISTS space_unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS space_guard VARCHAR(50),
ADD COLUMN IF NOT EXISTS area_name VARCHAR(255);

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_properties_owner_name ON properties(owner_name);
CREATE INDEX IF NOT EXISTS idx_properties_owner_mobile ON properties(owner_mobile);
CREATE INDEX IF NOT EXISTS idx_properties_area_name ON properties(area_name);
CREATE INDEX IF NOT EXISTS idx_properties_compound_name ON properties(compound_name);
CREATE INDEX IF NOT EXISTS idx_properties_handler ON properties(handler);
CREATE INDEX IF NOT EXISTS idx_properties_sales_person ON properties(sales_person);

-- Update areas table to ensure name is unique
ALTER TABLE areas ADD CONSTRAINT IF NOT EXISTS unique_area_name UNIQUE (name);
