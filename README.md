# Clinic Management System

A comprehensive clinic management system built with Next.js, featuring doctor appointment scheduling, patient management, and medical records.

## 🏥 Features

- **Doctor Management**: Profile management, availability scheduling, specialty filtering
- **Patient Management**: Medical history, contact information, insurance details
- **Appointment Scheduling**: Real-time availability, booking system, payment integration
- **Medical Records**: Digital health records, prescriptions, follow-up tracking
- **Modern UI**: Responsive design with Tailwind CSS and Radix UI components

## 🗄️ Database

This application uses **MySQL** with Prisma ORM for data management. The database is hosted on AWS RDS.

### Database Schema

- **Doctors**: Professional profiles with availability slots
- **Patients**: Personal and medical information
- **Appointments**: Scheduling and consultation records
- **Doctor Slots**: Availability management system

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MySQL database (AWS RDS recommended)
- Environment variables configured

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd clinic/apps/web
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp env.example .env
# Edit .env with your database credentials
```

4. **Set up the database**

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with sample data
npm run seed:mysql
```

5. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── doctor/            # Doctor dashboard
│   └── (auth)/            # Authentication pages
├── components/            # Reusable UI components
├── lib/                   # Utility libraries
│   ├── db/               # Database services
│   └── utils/            # Helper functions
├── store/                # State management
└── types/                # TypeScript type definitions
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:push          # Push schema changes
npm run seed:mysql       # Seed database with sample data
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL="mysql://username:password@host:port/database"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Payments (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
```

## 📊 API Endpoints

### Doctors

- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/[id]` - Get specific doctor
- `GET /api/doctors?specialty=Cardiology` - Filter by specialty

### Appointments

- `GET /api/appointments` - Get appointments with filters
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments` - Update appointment
- `DELETE /api/appointments` - Delete appointment

### Patients

- `GET /api/patients` - Get all patients
- `POST /api/patients` - Create new patient
- `PUT /api/patients/[id]` - Update patient

## 🗃️ Database Migration

This application was migrated from MongoDB to MySQL. See [MYSQL_MIGRATION_GUIDE.md](./MYSQL_MIGRATION_GUIDE.md) for detailed migration information.

### Migration Highlights

- ✅ MongoDB → MySQL with Prisma ORM
- ✅ Embedded documents → Relational tables
- ✅ Maintained API compatibility
- ✅ Improved query performance
- ✅ Better data integrity with foreign keys

## 🧪 Testing

```bash
# Test database connection
curl http://localhost:3000/api/doctors

# Test with specialty filter
curl http://localhost:3000/api/doctors?specialty=Cardiology
```

## 📚 Documentation

- [MongoDB to MySQL Migration Guide](./MYSQL_MIGRATION_GUIDE.md)
- [Appointment Scheduling Setup](./APPOINTMENT_SCHEDULING_SETUP.md)
- [Availability Management](./AVAILABILITY_MANAGEMENT.md)
- [MongoDB Setup (Legacy)](./MONGODB_SETUP.md)

## 🛡️ Security

- Environment variable protection
- Input validation with Zod
- SQL injection prevention with Prisma
- Authentication with Clerk
- Secure payment processing with Stripe

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Self-hosted

1. Build the application: `npm run build`
2. Set up MySQL database
3. Configure environment variables
4. Run migrations: `npm run db:migrate`
5. Start the server: `npm start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the documentation
- Review the migration guide
- Open an issue on GitHub

---

Built with ❤️ using Next.js, Prisma, and MySQL
