# 🏠 Real Estate CRM System

A comprehensive Customer Relationship Management system built specifically for real estate professionals, featuring secure file storage, property management, and client tracking.

## 🚀 Features

- **🏡 Property Management**: Complete property listing and management system
- **👥 Client Management**: Lead tracking and customer relationship management
- **📁 File Storage**: Secure file upload and management with Supabase integration
- **🔒 Authentication**: Role-based access control with JWT authentication
- **📊 Analytics**: Storage statistics and usage monitoring
- **🗜️ Free Plan Optimized**: Smart compression for Supabase free tier (50MB file limit)

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **Supabase** (PostgreSQL + Storage + Auth)
- **JWT** authentication
- **Multer** for file uploads
- **Sharp** for image processing

### Frontend
- **React.js**
- **JavaScript ES6+**

### Database
- **PostgreSQL 15+** (via Supabase)
- **Row Level Security (RLS)**
- **Real-time subscriptions**

## 📁 Project Structure

```
CRS/
├── backend/                    # Node.js Express API
│   ├── routes/
│   │   └── fileRoutes.js      # File upload/management endpoints
│   ├── services/
│   │   └── StorageService.js  # File storage business logic
│   ├── config/
│   │   └── freePlanConfig.js  # Supabase free plan optimizations
│   ├── package.json
│   └── .env
├── frontend/                   # React components
│   └── components/
│       └── FreePlanFileUpload.jsx
├── DB/                        # Database schemas and documentation
│   ├── REAL_ESTATE_CRM_DATABASE.sql
│   ├── supabase_storage_integration.sql
│   └── [database documentation]
└── docs/                      # Implementation guides
    ├── SUPABASE_IMPLEMENTATION_GUIDE.md
    └── SUPABASE_FREE_PLAN_DEPLOYMENT_CHECKLIST.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/real-estate-crm.git
cd real-estate-crm
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Configuration
Create `.env` file in the backend directory:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret
```

### 4. Database Setup
1. Create a new Supabase project
2. Run the SQL files in this order:
   ```sql
   -- 1. Main database schema
   DB/REAL_ESTATE_CRM_DATABASE.sql
   
   -- 2. File storage integration
   DB/supabase_storage_integration.sql
   ```

### 5. Start the Development Server
```bash
cd backend
npm run dev
```

## 📊 File Storage Features

### Free Plan Optimization
- **Images**: Auto-compressed to 10MB max
- **Videos**: 45MB limit with compression guidance
- **Documents**: 25MB limit
- **Smart Compression**: Automatic image optimization

### Supported File Types
- **Images**: JPEG, PNG, WebP
- **Videos**: MP4, MOV, AVI
- **Documents**: PDF, DOC, DOCX

### API Endpoints
```javascript
POST   /api/files/properties/:propertyId/images     // Upload property images
POST   /api/files/properties/:propertyId/videos     // Upload property videos
GET    /api/files/properties/:propertyId            // Get property files
PATCH  /api/files/properties/:fileId                // Update file metadata
DELETE /api/files/properties/:fileId                // Delete file
POST   /api/files/users/avatar                      // Upload user avatar
GET    /api/files/stats                             // Storage statistics
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Row Level Security**: Database-level access control
- **File Validation**: Type and size validation
- **Permission Checks**: Role-based file access
- **Secure URLs**: Supabase signed URLs for file access

## 📈 Performance Optimizations

- **Image Compression**: Automatic optimization for web
- **Progressive Loading**: Lazy loading for large file lists
- **Caching**: Smart caching strategies
- **CDN Ready**: Optimized for CDN integration

## 🆓 Supabase Free Plan Considerations

This system is optimized for Supabase's free tier:
- **50MB per file limit** enforced
- **Automatic compression** for oversized files
- **External hosting suggestions** for large videos
- **Usage monitoring** and warnings

## 📚 Documentation

- [Implementation Guide](docs/SUPABASE_IMPLEMENTATION_GUIDE.md)
- [Deployment Checklist](docs/SUPABASE_FREE_PLAN_DEPLOYMENT_CHECKLIST.md)
- [Database Schema](DB/DATABASE_ERD_DOCUMENTATION.md)

## 🧪 Testing

```bash
cd backend
npm test
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```bash
docker build -t real-estate-crm .
docker run -p 3000:3000 real-estate-crm
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@yourdomain.com
- 💬 Discord: [Your Discord Server]
- 📖 Documentation: [docs/](docs/)

## 🎯 Roadmap

- [ ] Mobile app integration
- [ ] Advanced analytics dashboard
- [ ] Email automation
- [ ] Integration with MLS systems
- [ ] Advanced search filters
- [ ] Reporting system

---

**Built with ❤️ for real estate professionals**
