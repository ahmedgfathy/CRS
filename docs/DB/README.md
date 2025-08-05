# Supabase Real Estate CRM Database Setup Guide

## 🎯 Project Overview
- **Project Name**: supabase-emerald-tree
- **Project ID**: cqylpwdcwrssttrtvtov
- **Database**: PostgreSQL 15+ (Supabase)
- **Total Tables**: 15+ core tables
- **Total Fields**: 410+ across 8 major modules

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Test Connection
```bash
python test_connection.py
```

### Step 3: Create Database Structure
```bash
python setup_supabase_database.py
```

## 📊 Database Structure

### Core Modules
1. **Geographic Hierarchy** (4 tables)
   - Countries, Regions, Areas, Compounds

2. **Property Classification** (2 tables)
   - Property Categories, Property Types

3. **User Management** (1 table)
   - User Profiles (extends auth.users)

4. **Property Management** (1 table)
   - Properties (main property listings)

5. **Lead Management** (1 table)
   - Leads (potential clients)

6. **Sales & Transactions** (1 table)
   - Sales Transactions

7. **Communication** (1 table)
   - Communications Log

8. **System Tables** (3 tables)
   - System Settings, Audit Log

### Key Features
- ✅ Row Level Security (RLS) on all tables
- ✅ Comprehensive indexing for performance
- ✅ Auto-generated codes for properties/transactions
- ✅ PostGIS support for geolocation
- ✅ JSONB fields for flexible data storage
- ✅ Audit trail for all changes
- ✅ Multi-language support (EN/AR)

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Agents can only see assigned leads/properties
- Clients can only view their transactions
- Admins have full access

### Authentication
- Integrates with Supabase Auth
- Role-based access control
- JWT token authentication

## 📱 Frontend Integration

### Environment Variables
After setup, use these in your React Native/Next.js app:

```javascript
// .env.local
NEXT_PUBLIC_SUPABASE_URL=https://cqylpwdcwrssttrtvtov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabase Client Setup
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## 🔍 Database Views

### Pre-built Views for Common Queries
1. **property_listings** - Complete property information with location/agent details
2. **lead_pipeline** - Active leads with follow-up information
3. **sales_performance** - Agent performance metrics

### Sample Queries
```sql
-- Get all available properties in Cairo
SELECT * FROM property_listings 
WHERE region_name = 'Cairo' 
AND availability_status = 'available';

-- Get agent's active leads
SELECT * FROM lead_pipeline 
WHERE agent_name = 'Agent Name';

-- Get monthly sales performance
SELECT * FROM sales_performance 
WHERE month_year >= '2025-01-01';
```

## 📈 Performance Optimization

### Indexes Created
- Geographic indexes (regions, areas)
- Property search indexes (price, location, type)
- User relationship indexes
- Communication tracking indexes
- PostGIS spatial indexes

### Query Optimization
- Composite indexes for common search patterns
- Partial indexes for filtered queries
- GiST indexes for geometric data

## 🛠️ Maintenance & Monitoring

### Audit Trail
All changes are automatically logged in the `audit_log` table with:
- Table name and record ID
- Old and new values (JSON)
- User ID and timestamp
- IP address and user agent

### System Settings
Configurable settings stored in `system_settings` table:
- Company information
- Default commission rates
- File upload limits
- Supported languages

## 🔧 Troubleshooting

### Common Issues
1. **Connection Failed**
   - Check internet connection
   - Verify Supabase project is active
   - Confirm credentials are correct

2. **Permission Denied**
   - Ensure RLS policies are properly configured
   - Check user roles and permissions

3. **Slow Queries**
   - Review query execution plans
   - Consider adding additional indexes
   - Optimize WHERE clauses

### Support
- Check Supabase dashboard for real-time monitoring
- Review logs in Supabase logging section
- Use built-in query analyzer

## 🎉 Next Steps

1. **Dashboard Access**: https://supabase.com/dashboard/project/cqylpwdcwrssttrtvtov
2. **API Documentation**: Auto-generated at your Supabase URL
3. **Real-time**: Enable for instant updates
4. **Storage**: Configure for property images/documents
5. **Edge Functions**: Add custom business logic

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [React Native + Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)
