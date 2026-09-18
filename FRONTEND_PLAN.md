# PH Healthcare Frontend Implementation Plan

## 1. Project Setup & Architecture

**Tech Stack:**
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS + shadcn/ui for components
- Zustand for state management
- React Query (TanStack Query) for API calls
- React Hook Form + Zod for form validation
- next-auth for authentication
- Lucide React for icons

**Project Structure:**
```
src/
├── app/                    # App Router pages
│   ├── (auth)/            # Public auth pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes (if needed)
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                  # Utilities and configs
│   ├── api/              # API client and endpoints
│   ├── hooks/            # Custom React hooks
│   └── validations/      # Zod schemas
├── stores/               # Zustand stores
├── types/                # TypeScript interfaces
└── styles/               # Global styles
```

---

## 2. Authentication System

**Features to implement:**
- Patient registration with email OTP verification
- Login page with email/password
- Google OAuth integration
- Forgot password flow
- Protected routes with role-based access
- Token refresh mechanism
- Logout functionality

**Pages:**
- `/login` - Login form with Google OAuth
- `/register` - Patient registration
- `/verify-email` - OTP verification
- `/forgot-password` - Request password reset
- `/reset-password` - Set new password with OTP

**Implementation Details:**
- Store tokens in memory (not cookies due to backend cookie config issues)
- Implement automatic token refresh
- Create auth middleware for route protection
- Role-based route guards (Patient, Doctor, Admin, Super Admin)

---

## 3. Patient Dashboard

**Features:**
- Profile management (view/edit personal info)
- Profile image upload
- Appointment history and status
- Book new appointments
- View prescriptions
- Payment history
- Analytics (appointment counts, spending)

**Pages:**
- `/dashboard` - Overview with stats
- `/dashboard/profile` - Profile management
- `/dashboard/appointments` - Appointment list
- `/dashboard/appointments/book` - Book appointment
- `/dashboard/appointments/:id` - Appointment details
- `/dashboard/prescriptions` - View prescriptions
- `/dashboard/payments` - Payment history
- `/dashboard/analytics` - Personal analytics

---

## 4. Doctor Dashboard

**Features:**
- Profile management (specialization, fees, bio)
- Schedule management (create, publish, delete)
- View appointments and update status
- Write prescriptions
- Analytics (appointments, earnings)
- View meeting links for scheduled appointments

**Pages:**
- `/doctor` - Dashboard overview
- `/doctor/profile` - Profile management
- `/doctor/schedules` - Schedule list
- `/doctor/schedules/create` - Create new schedule
- `/doctor/schedules/:id` - Schedule details
- `/doctor/appointments` - Appointment list
- `/doctor/appointments/:id` - Appointment details with status updates
- `/doctor/prescriptions` - Write prescriptions
- `/doctor/analytics` - Performance analytics

---

## 5. Admin Dashboard

**Features:**
- Doctor verification (approve/reject applications)
- Manage all doctors and patients
- View all appointments and payments
- Platform analytics
- User management (block/unblock)

**Pages:**
- `/admin` - Dashboard overview
- `/admin/doctors` - Doctor list with verification status
- `/admin/doctors/:id` - Doctor details and verification
- `/admin/patients` - Patient list
- `/admin/patients/:id` - Patient details
- `/admin/appointments` - All appointments
- `/admin/payments` - Payment management
- `/admin/analytics` - Platform analytics

---

## 6. Public Pages

**Features:**
- Landing page with features
- Doctor listing with filters
- Doctor profiles
- About/Contact pages
- Responsive design

**Pages:**
- `/` - Landing page
- `/doctors` - Public doctor listing
- `/doctors/:id` - Doctor public profile
- `/about` - About the platform
- `/contact` - Contact information

---

## 7. Key Components to Build

**Layout Components:**
- Header with navigation
- Sidebar for dashboards
- Footer
- Mobile responsive menu

**Reusable Components:**
- Data tables with sorting, filtering, pagination
- Form components (inputs, selects, date pickers)
- Modal dialogs
- Loading states and skeletons
- Toast notifications
- Image upload component
- Payment integration components

**Feature-Specific Components:**
- Appointment booking flow
- Schedule creation form
- Prescription form
- Analytics charts and graphs
- Payment status components
- Status badges and indicators

---

## 8. API Integration

**API Client Setup:**
- Axios instance with interceptors
- Automatic token attachment
- Error handling and retry logic
- Request/response transformation

**React Query Integration:**
- Query hooks for all API endpoints
- Mutation hooks for form submissions
- Cache management and invalidation
- Optimistic updates where applicable

---

## 9. State Management

**Zustand Stores:**
- Auth store (user, tokens, login/logout)
- UI store (sidebar state, modals)
- Cart store (if implementing any booking flow state)

---

## 10. Form Handling

**Zod Schemas (mirroring backend):**
- Registration/Login forms
- Profile update forms
- Schedule creation forms
- Prescription forms
- Search/filter forms

---

## 11. Key Features Implementation

**Appointment Booking Flow:**
1. Select doctor from list
2. View available schedules
3. Select time slot
4. Confirm booking details
5. Redirect to bKash payment
6. Handle payment callback
7. Show confirmation

**Doctor Verification Flow:**
1. Admin views pending applications
2. Review documents and profile
3. Approve or reject with reason
4. Send notification email
5. Update doctor status

**Prescription Writing:**
1. Select completed appointment
2. Enter findings and symptoms
3. Add medicines with dosage
4. Generate PDF
5. Upload to Cloudinary
6. Email to patient

---

## 12. Responsive Design

- Mobile-first approach
- Tablet and desktop breakpoints
- Touch-friendly interactions
- Responsive navigation
- Adaptive layouts for dashboards

---

## 13. Performance Optimization

- Image optimization with Next.js Image
- Code splitting and lazy loading
- API response caching
- Pagination for large lists
- Debounced search inputs

---

## 14. Error Handling

- Global error boundary
- API error handling
- Form validation errors
- Network error states
- 404 and 403 pages

---

## 15. Testing Strategy

- Component testing with React Testing Library
- E2E testing with Playwright
- API integration testing
- Form validation testing

---

## 16. Deployment

- Vercel deployment configuration
- Environment variables setup
- CI/CD pipeline
- Production optimizations

---

## Priority Implementation Order

### Phase 1 (MVP - 2 weeks):
1. Project setup and authentication
2. Basic layout and navigation
3. Patient registration/login
4. Public doctor listing
5. Basic patient dashboard

### Phase 2 (Core Features - 2 weeks):
1. Appointment booking flow
2. Doctor schedule management
3. Payment integration
4. Basic admin dashboard

### Phase 3 (Advanced Features - 1 week):
1. Prescription management
2. Analytics dashboards
3. Advanced filtering and search
4. Profile management

### Phase 4 (Polish - 1 week):
1. Responsive design optimization
2. Performance optimization
3. Error handling
4. Testing and bug fixes

---

## Technical Considerations

1. **Token Storage**: Store JWT tokens in memory due to cookie security issues with the backend
2. **Payment Flow**: Handle bKash redirect flow properly with callbacks
3. **File Uploads**: Implement proper file upload components with preview
4. **Real-time Updates**: Consider WebSocket for appointment status updates (if backend supports)
5. **PDF Handling**: Display PDFs in browser and handle downloads
6. **Email Verification**: Handle OTP input with auto-advance and resend functionality
