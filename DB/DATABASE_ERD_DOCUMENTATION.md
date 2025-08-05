# REAL ESTATE CRM DATABASE SCHEMA DOCUMENTATION
## Entity Relationship Diagram (ERD) Documentation

### 📊 DATABASE ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REAL ESTATE CRM DATABASE STRUCTURE                      │
│                              410 Fields • 25+ Tables                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GEOGRAPHIC    │    │  PROPERTY MGMT  │    │  CUSTOMER MGMT  │    │   USER MGMT     │
│   HIERARCHY     │    │     MODULE      │    │     MODULE      │    │    MODULE       │
│                 │    │                 │    │                 │    │                 │
│ • Countries     │    │ • Properties    │    │ • Customers     │    │ • Users         │
│ • Regions       │    │ • Property Types│    │ • Leads         │    │ • Roles         │
│ • Areas         │    │ • Categories    │    │ • Activities    │    │ • Departments   │
│ • Compounds     │    │ • Features      │    │ • Sources       │    │ • Teams         │
│                 │    │ • Images        │    │ • Statuses      │    │ • Permissions   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         └───────────────────────┼───────────────────────┼───────────────────────┘
                                 │                       │
                ┌─────────────────┼─────────────────┐    │
                │                                   │    │
         ┌─────────────────┐              ┌─────────────────┐
         │   AUDIT SYSTEM  │              │  LOOKUP TABLES  │
         │    MODULE       │              │    (112 TABLES) │
         │                 │              │                 │
         │ • Entity History│              │ • Reference Data│
         │ • User Activity │              │ • Static Values │
         │ • Security Logs │              │ • Dropdown Lists│
         │ • Change Tracks │              │ • Categorization│
         └─────────────────┘              └─────────────────┘
```

### 🏗️ CORE ENTITY RELATIONSHIPS

#### **1. GEOGRAPHIC HIERARCHY CHAIN**
```
Countries (1) ──→ (M) Regions (1) ──→ (M) Areas (1) ──→ (M) Compounds
    │                    │                    │                │
    └─ Egypt             └─ Cairo            └─ New Cairo     └─ Mountain View
    └─ UAE               └─ Alexandria       └─ Maadi         └─ Hyde Park
    └─ Saudi Arabia      └─ Giza             └─ Zamalek       └─ Eastown
```

#### **2. PROPERTY MANAGEMENT FLOW**
```
Property Categories (1) ──→ (M) Property Types (1) ──→ (M) Unit Types
         │                           │                        │
         └─ Residential              └─ 2 Bedroom             └─ Apartment
         └─ Commercial               └─ 3 Bedroom             └─ Duplex
         └─ Administrative           └─ Studio                └─ Penthouse

Properties (M) ──→ (M) Property Features (via junction table)
     │
     └─ Images (1:M)
     └─ Located in Area (M:1)
     └─ Assigned to Agent (M:1)
```

#### **3. CUSTOMER & LEAD PIPELINE**
```
Lead Sources ──→ Leads ──→ Customers ──→ Properties
     │            │           │             │
     │            └─ Lead Activities        └─ Property Viewings
     │            └─ Status Changes         └─ Purchase History
     │
     └─ Website, Facebook, Google, Referrals
```

#### **4. USER MANAGEMENT HIERARCHY**
```
User Roles (1) ──→ (M) Users (1) ──→ (M) Departments (1) ──→ (M) Teams
    │                    │                    │                    │
    └─ Sole Admin        └─ User Profile     └─ Sales              └─ Residential Team
    └─ Owner             └─ Agent Profile    └─ Marketing          └─ Commercial Team
    └─ Manager           └─ Performance      └─ Customer Service   └─ Support Team
    └─ Agent             └─ Access Control   └─ Administration     └─ Admin Team
```

### 📋 DETAILED TABLE RELATIONSHIPS

#### **PROPERTIES TABLE (Central Entity)**
```sql
Properties {
    id (PK)
    property_code (UNIQUE)
    property_type_id (FK → property_types.id)
    area_id (FK → areas.id)
    compound_id (FK → compounds.id)
    listing_agent_id (FK → users.id)
    created_by (FK → users.id)
    updated_by (FK → users.id)
}

-- Relationships:
Properties ||--o{ Property_Images : has
Properties ||--o{ Property_Feature_Assignments : has
Properties }o--|| Areas : located_in
Properties }o--|| Property_Types : classified_as
Properties }o--|| Users : listed_by
Properties ||--o{ Leads : generates (through viewing/interest)
```

#### **LEADS TABLE (Sales Pipeline)**
```sql
Leads {
    id (PK)
    lead_code (UNIQUE)
    customer_id (FK → customers.id)
    source_id (FK → lead_sources.id)
    lead_status_id (FK → lead_statuses.id)
    assigned_agent_id (FK → users.id)
    budget_range_id (FK → budget_ranges.id)
    preferred_property_type_id (FK → property_types.id)
}

-- Relationships:
Leads }o--|| Customers : belongs_to
Leads }o--|| Lead_Sources : originated_from
Leads }o--|| Lead_Statuses : current_status
Leads }o--|| Users : assigned_to
Leads ||--o{ Lead_Activities : has_activities
```

#### **USERS TABLE (Authentication & Access)**
```sql
Users {
    id (PK)
    user_code (UNIQUE)
    role_id (FK → user_roles.id)
    department_id (FK → departments.id)
    team_id (FK → teams.id)
    direct_manager_id (FK → users.id) -- Self-referencing
}

-- Relationships:
Users }o--|| User_Roles : has_role
Users }o--|| Departments : belongs_to
Users }o--|| Teams : member_of
Users }o--|| Users : reports_to (self-referencing)
Users ||--o{ Properties : manages
Users ||--o{ Leads : handles
Users ||--o{ User_Activity_Log : generates
```

### 🔗 JUNCTION TABLES (Many-to-Many Relationships)

#### **Property Features Assignment**
```sql
Property_Feature_Assignments {
    property_id (FK → properties.id)
    feature_id (FK → property_features.id)
    feature_value (additional data)
}
-- Allows properties to have multiple features
-- Features can be assigned to multiple properties
```

#### **User Access Groups**
```sql
User_Access_Groups {
    user_id (FK → users.id)
    access_group_id (FK → data_access_groups.id)
    granted_by (FK → users.id)
    expires_at (timestamp)
}
-- Enables role-based and territory-based access control
```

### 📊 LOOKUP TABLES STRUCTURE (112 Reference Tables)

#### **Geographic Lookups**
```
• countries (countries, currency, phone prefixes)
• regions (states/provinces within countries)
• areas (cities, districts, neighborhoods)
• compounds (gated communities, developments)
```

#### **Property Classification Lookups**
```
• property_categories (Residential, Commercial, Administrative)
• property_types (Studio, 1BR, 2BR, Villa, Office)
• unit_types (Apartment, Duplex, Penthouse, Townhouse)
• property_features (Pool, Gym, Security, Parking, Garden)
• security_features (24/7 Security, Gated, CCTV)
• pool_types (Private, Shared, Olympic, Kids)
• terrace_types (Private, Shared, Rooftop)
```

#### **Customer & Lead Lookups**
```
• lead_sources (Website, Facebook, Google, Referral)
• lead_statuses (New, Contacted, Qualified, Converted)
• lead_qualities (Hot, Warm, Cold, Unqualified)
• lead_priorities (Urgent, High, Medium, Low)
• customer_types (Individual, Investor, Corporate)
• age_ranges (25-30, 31-40, 41-50, 51+)
• budget_ranges (Under 1M, 1-3M, 3-5M, 5M+)
• payment_types (Cash, Installments, Bank Financing)
```

#### **Business Structure Lookups**
```
• user_roles (Admin, Owner, Manager, Agent)
• departments (Sales, Marketing, Support, Admin)
• teams (Residential, Commercial, Digital Marketing)
• employment_types (Full-time, Part-time, Contract)
• employment_statuses (Active, Inactive, On Leave)
```

### 🔐 SECURITY & AUDIT ARCHITECTURE

#### **Row-Level Security Model**
```sql
-- Data Access Control Flow:
User Login → Role Check → Department/Team Access → Data Filtering

-- Example Access Rules:
Agent: Can only see own leads and properties
Team Lead: Can see team data
Manager: Can see department data
Owner/Admin: Can see all data
```

#### **Audit Trail System**
```sql
Entity_History {
    entity_type (property, lead, customer, user)
    entity_id (reference to actual record)
    field_name (which field was changed)
    old_value, new_value (change tracking)
    changed_by, changed_at (who and when)
}

User_Activity_Log {
    user_id, activity_type (login, view, create, update)
    entity_type, entity_id (what was accessed)
    ip_address, user_agent (security context)
}

Security_Events {
    event_type (failed_login, permission_denied)
    severity (low, medium, high, critical)
    user_id, ip_address (threat context)
}
```

### 📈 PERFORMANCE OPTIMIZATION INDEXES

#### **Search Performance Indexes**
```sql
-- Property Search (most common query)
idx_properties_search (area_id, property_type_id, bedrooms, price)

-- Lead Pipeline Queries
idx_leads_pipeline (agent_id, status_id, created_at, priority_id)

-- Agent Performance Queries
idx_agents_performance (department_id, team_id, status_id)

-- Customer Management
idx_customers_contact (phone_primary, email)
```

#### **Reporting Performance Indexes**
```sql
-- Financial Reports
idx_properties_reports (agent_id, created_at, price)
idx_leads_conversion (source_id, status_id, qualified_date)

-- Analytics Queries
idx_property_search_complex (area_id, property_type_id, bedrooms, price_min, price_max, status)
idx_lead_analytics (source_id, agent_id, created_at, status_id, budget_range)
```

### 🚀 IMPLEMENTATION PHASES

#### **Phase 1-2: Foundation (Weeks 1-2)**
1. Geographic hierarchy tables
2. User management and authentication
3. Core lookup tables (most critical 20)
4. Basic security implementation

#### **Phase 3-4: Core Business (Weeks 3-4)**
1. Properties table with all features
2. Customers and leads tables
3. Property-feature relationships
4. Basic CRUD operations

#### **Phase 5-6: Advanced Features (Weeks 5-6)**
1. Complete all 112 lookup tables
2. History tracking triggers
3. Audit logging system
4. Advanced search and filtering

#### **Phase 7-8: Optimization (Weeks 7-8)**
1. Performance tuning and indexing
2. Security hardening
3. Backup and recovery procedures
4. User acceptance testing

### 📊 DATA FLOW VISUALIZATION

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   LEAD      │───▶│  CUSTOMER   │───▶│  PROPERTY   │───▶│    SALE     │
│ GENERATION  │    │ MANAGEMENT  │    │  MATCHING   │    │ COMPLETION  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   SOURCES   │    │ DEMOGRAPHICS│    │ PREFERENCES │    │   HISTORY   │
│ • Website   │    │ • Personal  │    │ • Location  │    │ • Audit     │
│ • Facebook  │    │ • Contact   │    │ • Type      │    │ • Analytics │
│ • Referral  │    │ • Financial │    │ • Budget    │    │ • Reports   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 🎯 SUCCESS METRICS & KPIs

#### **Technical Metrics**
- **Query Performance**: < 200ms response time
- **Database Uptime**: 99.9% availability
- **Data Integrity**: 100% referential integrity
- **Security Events**: Zero unauthorized access

#### **Business Metrics**
- **Lead Conversion**: Track from source to sale
- **Agent Performance**: Properties sold, commission earned
- **Customer Satisfaction**: Feedback and repeat business
- **Market Analysis**: Price trends, demand patterns

---

**Database Schema Version**: 1.0  
**Total Tables**: 25+ main tables + 112 lookup tables  
**Total Fields**: 410 fields across all modules  
**Relationships**: 150+ foreign key constraints  
**Indexes**: 100+ performance-optimized indexes  
**Security Features**: Role-based access, audit trails, encryption  
**Scalability**: Designed for 100K+ properties, 500K+ leads, 10K+ users
