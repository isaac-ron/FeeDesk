# SchoolPayERP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SchoolPayERP** is a comprehensive enterprise resource planning system designed specifically for educational institutions to manage student payments, fees, and financial transactions efficiently. Built with a modern tech stack and featuring multi-tenant architecture, it enables multiple schools to operate independently within a single deployment.

## 🌟 Key Features

- **Multi-Tenant Architecture**: Support multiple schools with complete data isolation
- **M-PESA Integration**: Seamless mobile money payments via Safaricom M-PESA
- **Bank Integration**: Automatic payment recording from bank statements (CSV/Excel)
- **Real-time Updates**: WebSocket-based live transaction notifications
- **Student Management**: Comprehensive student records and admission management
- **Fee Management**: Flexible fee structures with term-based billing
- **Payment Tracking**: Detailed transaction history and receipt generation
- **User Roles**: Role-based access control (Super Admin, School Admin, Bursar, Teacher)
- **SMS Notifications**: Automated SMS alerts for payments (via Africa's Talking)
- **Bulk Operations**: CSV import for students and bulk fee assignments
- **Reporting**: Financial reports, payment summaries, and analytics
- **Security**: JWT authentication, password hashing, and secure API endpoints

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Security**: Helmet, bcryptjs
- **Payments**: M-PESA API, Africa's Talking SMS API
- **File Processing**: Multer, CSV Parser

### Frontend
- **Framework**: React 19 with React Router v6
- **Build Tool**: Rolldown-powered Vite fork
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

### DevOps
- **Containerization**: Docker & Docker Compose
- **Process Management**: PM2 (production)
- **Logging**: Morgan
- **Environment**: dotenv

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v16.x or higher
- **MongoDB**: v5.x or higher
- **npm**: v8.x or higher
- **Docker** (optional): For containerized deployment
- **M-PESA Credentials**: Safaricom Daraja API credentials (for payment integration)
- **Africa's Talking Account**: For SMS notifications (optional)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/isaac-ron/SchoolPayERP.git
cd SchoolPayERP
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# - MongoDB connection string
# - JWT secret
# - M-PESA credentials
# - Africa's Talking API keys
nano .env

# Start the backend server
npm run dev
```

The backend server will start on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with backend API URL
nano .env

# Start the development server
npm run dev
```

The frontend application will start on `http://localhost:5173`

## 🐳 Docker Deployment

For a containerized deployment:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker configuration.

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/schoolpay

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# M-PESA Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_paybill_number
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback

# Africa's Talking (SMS)
AFRICASTALKING_API_KEY=your_africastalking_api_key
AFRICASTALKING_USERNAME=your_africastalking_username
AFRICASTALKING_SENDER_ID=SCHOOLPAY
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 📖 Documentation

Comprehensive documentation is available for various aspects of the system:

- **[Multi-Tenant Architecture](MULTI_TENANT_ARCHITECTURE.md)**: Detailed multi-tenant design and implementation
- **[Multi-Tenant Quick Reference](MULTI_TENANT_QUICK_REF.md)**: Quick guide for multi-tenant features
- **[M-PESA Integration](MPESA_INTEGRATION.md)**: Complete M-PESA payment setup and integration
- **[Bank Integration](BANK_INTEGRATION.md)**: Bank statement processing and reconciliation
- **[Bank Integration Quick Start](BANK_INTEGRATION_QUICK_START.md)**: Quick setup for bank integration
- **[API Testing Guide](API_TESTING_GUIDE.md)**: API endpoints and testing procedures
- **[Docker Setup](DOCKER_SETUP.md)**: Docker and container deployment guide

## 💡 Usage

### Creating a School (Super Admin)

1. Log in as Super Admin
2. Navigate to Schools Management
3. Click "Add New School"
4. Fill in school details (name, code, paybill number)
5. Set subscription plan and student limits

### Adding Students

1. Log in as School Admin or Bursar
2. Go to Students section
3. Add individual students or bulk import via CSV

### Recording Payments

**Manual Entry:**
1. Navigate to Payments
2. Select student and enter payment details
3. Generate receipt

**M-PESA Automatic:**
- Students send payments to the school's M-PESA paybill
- System automatically records and matches to student accounts
- Real-time notifications sent

**Bank Integration:**
1. Download bank statement (CSV/Excel)
2. Upload via Bank Reconciliation tool
3. System matches and records payments automatically

### Generating Reports

1. Go to Reports section
2. Select report type (collections, outstanding fees, etc.)
3. Choose date range and filters
4. Export as PDF or Excel

## 🤝 Contributing

We welcome contributions to SchoolPayERP! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## 🧪 Testing

Testing infrastructure is planned for future releases. Current development focuses on:

```bash
# Backend linting
cd backend
npm run dev

# Frontend linting
cd frontend
npm run lint
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Ron Isaac** - Initial work - [@isaac-ron](https://github.com/isaac-ron)

## 🆘 Support

For support, please:
- Open an issue on GitHub
- Contact the project maintainer

## 🙏 Acknowledgments

- Safaricom for M-PESA Daraja API
- Africa's Talking for SMS API
- All contributors who have helped shape this project

## 📊 Project Status

This project is actively maintained and under continuous development. New features and improvements are regularly added based on user feedback and requirements.

---

**Built with ❤️ for educational institutions**