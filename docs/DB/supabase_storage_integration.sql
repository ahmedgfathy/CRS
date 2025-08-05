-- ═══════════════════════════════════════════════════════════════════════════════════
-- SUPABASE STORAGE INTEGRATION FOR REAL ESTATE CRM
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Extends existing database with file storage tables and security policies
-- Compatible with existing user management and RLS policies
-- ═══════════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════════
-- STORAGE CONFIGURATION TABLES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- File Categories for organized storage
DROP TABLE IF EXISTS file_categories CASCADE;
CREATE TABLE file_categories (
    id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    category_name_ar VARCHAR(50),
    description TEXT,
    allowed_file_types JSONB DEFAULT '["jpg", "jpeg", "png", "pdf", "mp4", "mov"]',
    max_file_size_mb INTEGER DEFAULT 10,
    storage_bucket VARCHAR(50) NOT NULL,
    path_prefix VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    compression_enabled BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE file_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access for authenticated users" ON file_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert default file categories
INSERT INTO file_categories (category_name, category_name_ar, description, allowed_file_types, max_file_size_mb, storage_bucket, path_prefix, is_public) VALUES
('property_images', 'صور العقارات', 'Property listing images', '["jpg", "jpeg", "png", "webp"]', 10, 'property-files', 'images/properties', true),
('property_videos', 'فيديوهات العقارات', 'Property tour videos - compressed for free plan', '["mp4", "mov"]', 45, 'property-files', 'videos/properties', true),
('property_documents', 'مستندات العقارات', 'Property contracts and documents', '["pdf", "doc", "docx"]', 20, 'property-files', 'documents/properties', false),
('floor_plans', 'المخططات المعمارية', 'Architectural floor plans', '["jpg", "jpeg", "png", "pdf"]', 8, 'property-files', 'floor-plans', true),
('user_avatars', 'صور المستخدمين', 'User profile pictures', '["jpg", "jpeg", "png"]', 3, 'user-files', 'avatars', false),
('lead_attachments', 'مرفقات العملاء المحتملين', 'Lead-related documents', '["pdf", "jpg", "png", "doc"]', 15, 'lead-files', 'attachments', false),
('marketing_materials', 'المواد التسويقية', 'Marketing brochures and materials', '["jpg", "png", "pdf", "mp4"]', 25, 'marketing-files', 'materials', true);

-- Property Files Management
DROP TABLE IF EXISTS property_files CASCADE;
CREATE TABLE property_files (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES file_categories(id),
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL, -- in bytes
    file_type VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100),
    
    -- Image/Video Specific
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    thumbnail_url TEXT,
    
    -- Organization
    title VARCHAR(200),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    
    -- SEO
    alt_text VARCHAR(255),
    caption TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Upload Information
    uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
    upload_session_id UUID DEFAULT gen_random_uuid(),
    
    -- Status
    processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('uploading', 'processing', 'completed', 'failed')),
    quality_check_passed BOOLEAN DEFAULT true,
    
    -- Metadata
    exif_data JSONB,
    processing_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE property_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for property files
CREATE POLICY "Property files visible based on property access" ON property_files
    FOR SELECT USING (
        -- Public files are visible to all authenticated users
        is_public = true
        OR
        -- Property owners can see all files
        property_id IN (
            SELECT id FROM properties WHERE owner_id = auth.uid()
        )
        OR
        -- Assigned agents can see all files
        property_id IN (
            SELECT id FROM properties WHERE agent_id = auth.uid()
        )
        OR
        -- Users who uploaded the file can see it
        uploaded_by = auth.uid()
    );

CREATE POLICY "Property files management by authorized users" ON property_files
    FOR ALL USING (
        -- Property owners can manage files
        property_id IN (
            SELECT id FROM properties WHERE owner_id = auth.uid()
        )
        OR
        -- Assigned agents can manage files
        property_id IN (
            SELECT id FROM properties WHERE agent_id = auth.uid()
        )
        OR
        -- File uploader can manage their files
        uploaded_by = auth.uid()
    );

-- Create indexes
CREATE INDEX idx_property_files_property ON property_files(property_id);
CREATE INDEX idx_property_files_category ON property_files(category_id);
CREATE INDEX idx_property_files_type ON property_files(file_type);
CREATE INDEX idx_property_files_primary ON property_files(is_primary);
CREATE INDEX idx_property_files_public ON property_files(is_public);
CREATE INDEX idx_property_files_uploaded_by ON property_files(uploaded_by);
CREATE INDEX idx_property_files_sort ON property_files(property_id, sort_order);

-- User Files (avatars, documents, etc.)
DROP TABLE IF EXISTS user_files CASCADE;
CREATE TABLE user_files (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES file_categories(id),
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100),
    
    -- Organization
    title VARCHAR(200),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    
    -- Upload Information
    uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
    
    -- Status
    processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('uploading', 'processing', 'completed', 'failed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user files
CREATE POLICY "Users can manage own files" ON user_files
    FOR ALL USING (user_id = auth.uid() OR uploaded_by = auth.uid());

CREATE POLICY "Public user files visible to all" ON user_files
    FOR SELECT USING (is_public = true);

-- Create indexes
CREATE INDEX idx_user_files_user ON user_files(user_id);
CREATE INDEX idx_user_files_category ON user_files(category_id);
CREATE INDEX idx_user_files_public ON user_files(is_public);

-- Lead Files (attachments, documents)
DROP TABLE IF EXISTS lead_files CASCADE;
CREATE TABLE lead_files (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES file_categories(id),
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100),
    
    -- Organization
    title VARCHAR(200),
    description TEXT,
    is_confidential BOOLEAN DEFAULT true,
    
    -- Upload Information
    uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
    
    -- Status
    processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('uploading', 'processing', 'completed', 'failed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lead_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead files
CREATE POLICY "Lead files visible to assigned agents and managers" ON lead_files
    FOR SELECT USING (
        -- Assigned agent can see files
        lead_id IN (
            SELECT id FROM leads WHERE assigned_agent_id = auth.uid()
        )
        OR
        -- File uploader can see their files
        uploaded_by = auth.uid()
        OR
        -- Managers can see team files (role-based access)
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Lead files management by authorized users" ON lead_files
    FOR ALL USING (
        -- Assigned agent can manage files
        lead_id IN (
            SELECT id FROM leads WHERE assigned_agent_id = auth.uid()
        )
        OR
        -- File uploader can manage their files
        uploaded_by = auth.uid()
    );

-- Create indexes
CREATE INDEX idx_lead_files_lead ON lead_files(lead_id);
CREATE INDEX idx_lead_files_category ON lead_files(category_id);
CREATE INDEX idx_lead_files_confidential ON lead_files(is_confidential);
CREATE INDEX idx_lead_files_uploaded_by ON lead_files(uploaded_by);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- FILE MANAGEMENT FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Function to generate secure file paths
CREATE OR REPLACE FUNCTION generate_file_path(
    bucket_name TEXT,
    entity_type TEXT,
    entity_id BIGINT,
    file_extension TEXT,
    user_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    date_path TEXT;
    random_string TEXT;
    user_path TEXT;
BEGIN
    -- Generate date-based path
    date_path := TO_CHAR(NOW(), 'YYYY/MM/DD');
    
    -- Generate random string for security
    random_string := ENCODE(gen_random_bytes(8), 'hex');
    
    -- Add user path for user-specific files
    IF user_id IS NOT NULL THEN
        user_path := SUBSTRING(user_id::TEXT, 1, 8);
        RETURN bucket_name || '/' || entity_type || '/' || date_path || '/' || user_path || '/' || entity_id || '_' || random_string || '.' || file_extension;
    ELSE
        RETURN bucket_name || '/' || entity_type || '/' || date_path || '/' || entity_id || '_' || random_string || '.' || file_extension;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update file metadata after processing
CREATE OR REPLACE FUNCTION update_file_metadata(
    file_id BIGINT,
    table_name TEXT,
    metadata JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    IF table_name = 'property_files' THEN
        UPDATE property_files 
        SET processing_status = 'completed',
            width = (metadata->>'width')::INTEGER,
            height = (metadata->>'height')::INTEGER,
            duration_seconds = (metadata->>'duration')::INTEGER,
            exif_data = metadata->'exif',
            updated_at = NOW()
        WHERE id = file_id;
        
    ELSIF table_name = 'user_files' THEN
        UPDATE user_files 
        SET processing_status = 'completed',
            updated_at = NOW()
        WHERE id = file_id;
        
    ELSIF table_name = 'lead_files' THEN
        UPDATE lead_files 
        SET processing_status = 'completed',
            updated_at = NOW()
        WHERE id = file_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get file usage statistics
CREATE OR REPLACE FUNCTION get_storage_usage(user_id UUID DEFAULT NULL)
RETURNS TABLE(
    category_name TEXT,
    file_count BIGINT,
    total_size_mb NUMERIC,
    total_size_gb NUMERIC
) AS $$
BEGIN
    IF user_id IS NULL THEN
        -- Global statistics
        RETURN QUERY
        SELECT 
            fc.category_name,
            COUNT(*)::BIGINT as file_count,
            ROUND((SUM(COALESCE(pf.file_size, 0) + COALESCE(uf.file_size, 0) + COALESCE(lf.file_size, 0)) / 1024.0 / 1024.0)::NUMERIC, 2) as total_size_mb,
            ROUND((SUM(COALESCE(pf.file_size, 0) + COALESCE(uf.file_size, 0) + COALESCE(lf.file_size, 0)) / 1024.0 / 1024.0 / 1024.0)::NUMERIC, 3) as total_size_gb
        FROM file_categories fc
        LEFT JOIN property_files pf ON fc.id = pf.category_id
        LEFT JOIN user_files uf ON fc.id = uf.category_id
        LEFT JOIN lead_files lf ON fc.id = lf.category_id
        GROUP BY fc.category_name;
    ELSE
        -- User-specific statistics
        RETURN QUERY
        SELECT 
            fc.category_name,
            COUNT(*)::BIGINT as file_count,
            ROUND((SUM(COALESCE(pf.file_size, 0) + COALESCE(uf.file_size, 0) + COALESCE(lf.file_size, 0)) / 1024.0 / 1024.0)::NUMERIC, 2) as total_size_mb,
            ROUND((SUM(COALESCE(pf.file_size, 0) + COALESCE(uf.file_size, 0) + COALESCE(lf.file_size, 0)) / 1024.0 / 1024.0 / 1024.0)::NUMERIC, 3) as total_size_gb
        FROM file_categories fc
        LEFT JOIN property_files pf ON fc.id = pf.category_id AND pf.uploaded_by = user_id
        LEFT JOIN user_files uf ON fc.id = uf.category_id AND uf.uploaded_by = user_id
        LEFT JOIN lead_files lf ON fc.id = lf.category_id AND lf.uploaded_by = user_id
        GROUP BY fc.category_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════════
-- TRIGGERS FOR AUTOMATIC FILE MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Function to automatically set primary image
CREATE OR REPLACE FUNCTION manage_primary_property_image()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is being set as primary, unset others
    IF NEW.is_primary = true THEN
        UPDATE property_files 
        SET is_primary = false 
        WHERE property_id = NEW.property_id 
        AND id != NEW.id 
        AND category_id = NEW.category_id;
    END IF;
    
    -- If no primary image exists and this is the first image, make it primary
    IF NEW.is_primary = false AND NEW.category_id = 1 THEN -- property_images category
        IF NOT EXISTS (
            SELECT 1 FROM property_files 
            WHERE property_id = NEW.property_id 
            AND category_id = NEW.category_id 
            AND is_primary = true
        ) THEN
            NEW.is_primary = true;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manage_primary_property_image
    BEFORE INSERT OR UPDATE ON property_files
    FOR EACH ROW
    EXECUTE FUNCTION manage_primary_property_image();

-- Function to update property main image URL
CREATE OR REPLACE FUNCTION update_property_main_image()
RETURNS TRIGGER AS $$
BEGIN
    -- Update property main_image_url when primary image changes
    IF NEW.is_primary = true AND OLD.is_primary = false THEN
        UPDATE properties 
        SET main_image_url = NEW.file_url,
            updated_at = NOW()
        WHERE id = NEW.property_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_main_image
    AFTER UPDATE ON property_files
    FOR EACH ROW
    EXECUTE FUNCTION update_property_main_image();

-- ═══════════════════════════════════════════════════════════════════════════════════
-- STORAGE VIEWS FOR COMMON QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Property files with category information
CREATE OR REPLACE VIEW property_files_with_categories AS
SELECT 
    pf.*,
    fc.category_name,
    fc.category_name_ar,
    fc.is_public as category_is_public,
    fc.max_file_size_mb as category_max_size,
    up.full_name as uploaded_by_name,
    p.title as property_title,
    p.property_code
FROM property_files pf
JOIN file_categories fc ON pf.category_id = fc.id
JOIN user_profiles up ON pf.uploaded_by = up.id
JOIN properties p ON pf.property_id = p.id;

-- File storage statistics by user
CREATE OR REPLACE VIEW user_storage_stats AS
SELECT 
    up.id as user_id,
    up.full_name,
    up.role,
    COUNT(DISTINCT pf.id) as property_files_count,
    COUNT(DISTINCT uf.id) as user_files_count,
    COUNT(DISTINCT lf.id) as lead_files_count,
    COALESCE(SUM(pf.file_size), 0) + COALESCE(SUM(uf.file_size), 0) + COALESCE(SUM(lf.file_size), 0) as total_storage_bytes,
    ROUND((COALESCE(SUM(pf.file_size), 0) + COALESCE(SUM(uf.file_size), 0) + COALESCE(SUM(lf.file_size), 0)) / 1024.0 / 1024.0, 2) as total_storage_mb
FROM user_profiles up
LEFT JOIN property_files pf ON up.id = pf.uploaded_by
LEFT JOIN user_files uf ON up.id = uf.uploaded_by
LEFT JOIN lead_files lf ON up.id = lf.uploaded_by
GROUP BY up.id, up.full_name, up.role;

-- Property gallery view
CREATE OR REPLACE VIEW property_gallery AS
SELECT 
    p.id as property_id,
    p.title,
    p.property_code,
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', pf.id,
            'file_url', pf.file_url,
            'thumbnail_url', pf.thumbnail_url,
            'title', pf.title,
            'alt_text', pf.alt_text,
            'is_primary', pf.is_primary,
            'sort_order', pf.sort_order,
            'file_type', pf.file_type,
            'category', fc.category_name
        ) ORDER BY pf.is_primary DESC, pf.sort_order ASC
    ) as files
FROM properties p
LEFT JOIN property_files pf ON p.id = pf.property_id
LEFT JOIN file_categories fc ON pf.category_id = fc.id
WHERE pf.processing_status = 'completed'
GROUP BY p.id, p.title, p.property_code;

-- ═══════════════════════════════════════════════════════════════════════════════════
-- STORAGE CONFIGURATION SETTINGS
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Add file storage settings to system_settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('max_file_upload_size', '52428800', 'number', 'Maximum file upload size in bytes (50MB - Supabase free plan)', false),
('max_video_upload_size', '47185920', 'number', 'Maximum video upload size in bytes (45MB)', false),
('max_image_upload_size', '10485760', 'number', 'Maximum image upload size in bytes (10MB)', false),
('allowed_image_types', '["jpg", "jpeg", "png", "webp"]', 'json', 'Allowed image file types', true),
('allowed_video_types', '["mp4", "mov"]', 'json', 'Allowed video file types (compressed formats only)', true),
('allowed_document_types', '["pdf", "doc", "docx", "txt"]', 'json', 'Allowed document file types', true),
('image_compression_quality', '75', 'number', 'JPEG compression quality (1-100) - optimized for free plan', false),
('video_compression_enabled', 'true', 'boolean', 'Enable video compression to stay under 45MB limit', false),
('auto_generate_thumbnails', 'true', 'boolean', 'Automatically generate thumbnails for images', false),
('thumbnail_size', '250', 'number', 'Thumbnail width in pixels (smaller for storage efficiency)', false),
('enable_image_optimization', 'true', 'boolean', 'Enable automatic image optimization', false),
('storage_quota_per_user_mb', '500', 'number', 'Storage quota per user in MB (500MB for free plan)', false),
('warn_at_storage_percentage', '80', 'number', 'Warn users when reaching % of storage quota', false),
('cdn_base_url', '', 'string', 'CDN base URL for file delivery', true);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- END OF STORAGE INTEGRATION SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════════
