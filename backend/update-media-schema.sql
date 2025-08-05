-- Updated SQL schema for media linking to Appwrite storage
-- Run this in Supabase SQL Editor to update existing tables

-- Update property_images table to support Appwrite storage linking
ALTER TABLE property_images 
ADD COLUMN IF NOT EXISTS appwrite_bucket_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'appwrite',
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);

-- Update property_videos table to support Appwrite storage linking  
ALTER TABLE property_videos
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'external',
ADD COLUMN IF NOT EXISTS appwrite_file_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_images_appwrite_file ON property_images(appwrite_file_id);
CREATE INDEX IF NOT EXISTS idx_property_videos_appwrite_file ON property_videos(appwrite_file_id);
CREATE INDEX IF NOT EXISTS idx_property_images_storage_provider ON property_images(storage_provider);
CREATE INDEX IF NOT EXISTS idx_property_videos_storage_provider ON property_videos(storage_provider);

-- Create a view for easy media access with Appwrite links
CREATE OR REPLACE VIEW property_media_view AS
SELECT 
    p.id as property_id,
    p.property_code,
    p.title as property_title,
    a.area_name,
    
    -- Images from Appwrite storage
    (
        SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', pi.id,
                'appwrite_file_id', pi.appwrite_file_id,
                'appwrite_bucket_id', pi.appwrite_bucket_id,
                'image_url', pi.image_url,
                'image_title', pi.image_title,
                'is_primary', pi.is_primary,
                'storage_provider', pi.storage_provider,
                'file_size', pi.file_size,
                'file_type', pi.file_type
            )
            ORDER BY pi.sort_order
        )
        FROM property_images pi 
        WHERE pi.property_id = p.id
    ) as images,
    
    -- Videos (Appwrite storage or external)
    (
        SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', pv.id,
                'appwrite_file_id', pv.appwrite_file_id,
                'video_url', pv.video_url,
                'video_title', pv.video_title,
                'video_type', pv.video_type,
                'storage_provider', pv.storage_provider,
                'duration', pv.duration,
                'file_size', pv.file_size
            )
            ORDER BY pv.sort_order
        )
        FROM property_videos pv 
        WHERE pv.property_id = p.id
    ) as videos
    
FROM properties p
LEFT JOIN areas a ON p.area_id = a.id;

-- Grant access to the view
GRANT SELECT ON property_media_view TO authenticated;
GRANT SELECT ON property_media_view TO anon;

COMMENT ON VIEW property_media_view IS 'Consolidated view of properties with their media files linked to Appwrite storage';
COMMENT ON COLUMN property_images.storage_provider IS 'Storage provider: appwrite, supabase, or external';
COMMENT ON COLUMN property_images.appwrite_bucket_id IS 'Original Appwrite bucket ID for file reference';
COMMENT ON COLUMN property_videos.storage_provider IS 'Storage provider: appwrite, supabase, external, youtube, vimeo';
