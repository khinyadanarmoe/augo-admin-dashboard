# AUGo Admin Dashboard

Admin dashboard for AUGo community platform - manage users, posts, reports, announcements, AR models, and announcers with real-time updates.

## Features

### User & Content Moderation

- **User Management** - Monitor and manage user accounts with status tracking (active/suspended/banned)
- **Post Moderation** - Review, warn, and remove posts with filtering and search
- **Report Handling** - Process user reports with auto-removal for inappropriate content
- **Automated Moderation** - Suspicious posts auto-removed via Cloud Functions
- **User Access Control** - Banned users blocked from login, suspended users restricted from posting

### Announcements & Announcers

- **Announcer Management** - Approve and manage announcer accounts with Firebase Authentication
- **Announcer Profiles** - Profile picture support with storage integration
- **Announcement System** - Create, schedule, and manage community announcements
- **Status Automation** - Auto-activation/expiration of announcements via Cloud Functions
- **Location-based Announcements** - Geolocation support for targeted announcements

### AR Experience Management

- **AR Models Management** - Upload and configure AR character models
- **Multi-location Spawning** - Fixed locations, random zones, or dynamic spawning modes
- **Status Management** - Active, inactive, or scheduled AR spawns with time-based automation
- **Location Configuration** - Multiple spawn points per AR model with latitude/longitude
- **AR Capture Tracking** - Monitor user interactions with AR experiences

### Analytics & Insights

- **Dashboard Metrics** - Real-time statistics on users, posts, reports, and announcements
- **Activity Charts** - Posts over time, top locations, category distribution
- **Pending Approvals** - Quick access to announcer and announcement approvals
- **Recent Activity** - Flagged users, reports, and top posts

### System Configuration

- **Configuration Panel** - Customize thresholds, limits, and system settings
- **Real-time Updates** - Configuration changes reflected immediately across the system
- **Notification Settings** - Configure urgent announcement thresholds
- **Moderation Rules** - Set report thresholds, suspension duration, and ban criteria

### Security & Authentication

- **Admin Authentication** - Firebase Auth with custom admin claims
- **Secure Logout** - Confirmation modal with proper session cleanup
- **Protected Routes** - HOC-based authentication for all admin pages
- **Firestore Security Rules** - Role-based access control for all collections

### User Experience

- **Dark Mode** - Full dark mode support across all pages including login
- **Real-time Notifications** - Bell notifications for pending approvals and urgent items
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- **Image Management** - Firebase Storage integration for photos and profile pictures
- **Logo & Branding** - Custom logo with favicon support

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions Gen1 Node.js 20, Storage)
- **State Management**: React Hooks, Context API
- **UI Components**: Custom components with dark mode support
- **Real-time**: Firestore subscriptions for live data updates
- **Deployment**: Firebase Hosting

## Project Structure

```
augo-admin-dashboard/
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── drawers/      # Detail view drawers
│   │   │   ├── tables/       # Data tables
│   │   │   ├── dashboard/    # Dashboard widgets
│   │   │   └── hoc/          # Higher-order components
│   │   ├── pages/            # Next.js pages
│   │   │   ├── index.tsx     # Dashboard
│   │   │   ├── login.tsx     # Login page
│   │   │   ├── users/        # User management
│   │   │   ├── posts/        # Post moderation
│   │   │   ├── reports/      # Report handling
│   │   │   ├── announcements/# Announcement management
│   │   │   ├── announcers/   # Announcer management
│   │   │   ├── ar-models/    # AR model management
│   │   │   └── configuration/# System settings
│   │   ├── lib/              # Utilities and helpers
│   │   │   ├── firebase.ts   # Firebase initialization
│   │   │   ├── firestore/    # Firestore CRUD operations
│   │   │   ├── notifications.ts
│   │   │   └── storageUtils.ts
│   │   ├── types/            # TypeScript types
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Utility functions
│   └── public/               # Static assets
├── functions/
│   └── src/
│       ├── index.ts          # Cloud Functions entry
│       ├── announcements.ts  # Announcement automation
│       ├── announcers.ts     # Announcer creation/management
│       ├── reports.ts        # Auto-moderation
│       └── notifications.ts  # Push notifications
├── firestore.rules           # Security rules
├── firestore.indexes.json    # Database indexes
├── storage.rules             # Storage security rules
└── firebase.json             # Firebase configuration
```

## Key Features Implementation

### AR Spawning System

- **Spawn Modes**: Fixed locations, random zones, or dynamic spawning
- **Status Management**: Active (always visible), Scheduled (time-based), Inactive (hidden)
- **Auto-calculation**: Status automatically determined from start/end times
- **Multiple Locations**: One AR model can spawn at multiple fixed locations
- **Backward Compatibility**: Maintains `isActive` boolean alongside status enum

### Content Moderation

- **Report Categories**: Spam, harassment, inappropriate content, violence, misinformation, other
- **Auto-removal**: Posts with "inappropriate" reports automatically removed
- **Threshold System**: Configurable thresholds for warnings and suspensions
- **User Status**: Active → Suspended → Banned progression
- **Cloud Functions**: Automated moderation with `handleNewReport` function

### Announcer System

- **Firebase Auth Integration**: Announcers created with auth accounts and custom claims
- **Profile Management**: Profile picture upload and display in announcement details
- **CRUD Operations**: Create, update, delete via Cloud Functions
- **Role-based Access**: Announcers can create/manage their own announcements
- **Affiliation Tracking**: Department and affiliation type management

### Authentication & Security

- **Admin Claims**: Custom Firebase Auth claims for admin verification
- **Protected Routes**: `withAdminAuth` HOC for page-level protection
- **Firestore Rules**: Collection-level access control
- **Session Management**: Token-based auth with automatic refresh
- **Secure Logout**: Proper cleanup with confirmation modal

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Firebase project with Firestore, Authentication, Storage, and Functions enabled

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd augo-admin-dashboard
```

2. Install frontend dependencies

```bash
cd frontend
pnpm install
```

3. Install Cloud Functions dependencies

```bash
cd ../functions
npm install
```

4. Configure Firebase

- Add your `serviceAccountKey.json` to project root
- Update Firebase config in `frontend/src/lib/firebase.ts`

5. Deploy Firestore rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

6. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

7. Run development server

```bash
cd frontend
pnpm dev
```

## Environment Setup

### Firebase Configuration

Required Firebase services:

- **Firestore**: Database for all collections
- **Authentication**: Admin and announcer authentication
- **Storage**: Images, AR models, profile pictures
- **Cloud Functions**: Automated tasks and API endpoints
- **Hosting** (optional): Deploy the admin dashboard

### Admin Setup

Create your first admin user:

```bash
node scripts/setAdmin.js <email>
```

## Cloud Functions

### Active Functions

- `activateScheduledAnnouncements` - Every 5 minutes, activates scheduled announcements
- `expireEndedAnnouncements` - Every hour, expires announcements past end date
- `handleNewReport` - Triggered on new report, auto-removes inappropriate content
- `createAnnouncer` - Creates announcer with Firebase Auth account
- `updateAnnouncer` - Updates announcer profile and auth account
- `deleteAnnouncer` - Removes announcer and auth account

## Database Collections

- `users` - User accounts and profiles
- `posts` - User-generated posts
- `reports` - Content reports
- `announcements` - Community announcements
- `announcers` - Announcer accounts
- `ar_spawns` - AR model spawn configurations
- `ar_captures` - User AR interaction tracking
- `admin_configuration` - System configuration
- `configuration_logs` - Configuration change history
- `admin_notifications` - Admin notification queue
- `user_notifications` - User notification delivery
- `affiliations` - Department/affiliation data

## Security Rules

### Firestore Rules

- Admins: Full access to all collections
- Announcers: Create/read/update own announcements
- AU Email users: Create posts and reports, read announcements
- Banned users: No login access
- Suspended users: Read-only, no post creation

### Storage Rules

- Authenticated users can upload to their own paths
- Public read access for profile pictures and AR models
- Admin access for all storage paths

## Contributing

1. Follow TypeScript best practices
2. Maintain consistent code style (Prettier/ESLint)
3. Test Firestore security rules before deployment
4. Document new features in README
5. Keep Cloud Functions lightweight and focused

## License

Proprietary - Assumption University

## Support

For issues or questions, contact the development team.
