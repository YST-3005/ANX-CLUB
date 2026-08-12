# A.N.X V1 Platform

> **Premium Club & Member Ecosystem Platform** — A full-featured Next.js 16 frontend for managing college clubs, events, memberships, and member engagement.

![Next.js](https://img.shields.io/badge/Next.js-16.2.6-000?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss)

---

## ✨ Features

### 🔐 Authentication
- Email/password login with validation
- Multi-step signup wizard with college details
- Google OAuth integration (mock)
- Password strength indicator

### 📊 Member Dashboard
- Welcome banner with membership status
- Upcoming events widget
- Activity timeline & announcements
- Quick actions panel
- Membership upgrade CTA

### 🎪 Events System
- Event listing with search, filter & category tabs
- Event detail pages with speaker info, agenda & venue
- Registration/cancellation flow
- Capacity tracking with visual progress

### 👤 Profile Management
- Editable profile sections
- Skills & interests tagging
- Social links (GitHub, LinkedIn, Portfolio)

### 💳 Membership & Payments
- Free vs Premium tier comparison
- Pricing cards with feature breakdown
- Razorpay integration ready (mock)

### 🛡️ Admin Panel
- Admin dashboard with stat cards & charts
- Member management table
- Event management & creation wizard
- Analytics dashboard with Recharts

### 📢 Additional Pages
- Announcements feed
- Resource library
- Mentor directory
- 404 error page
- Premium landing page

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.x |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 + Custom Design System |
| Animation | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Notifications | React Hot Toast |
| Theme | next-themes (dark/light mode) |
| Auth Ready | Firebase (mock) |
| Payments Ready | Razorpay (mock) |

---

## 📁 Project Structure

```
anx-v1-platform/
├── app/
│   ├── (auth)/              # Auth layout group
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/         # Dashboard layout group
│   │   ├── dashboard/page.tsx
│   │   ├── events/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── membership/page.tsx
│   │   ├── announcements/page.tsx
│   │   ├── resources/page.tsx
│   │   └── mentors/page.tsx
│   ├── (admin)/             # Admin layout group
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── members/page.tsx
│   │       ├── events/page.tsx
│   │       ├── events/create/page.tsx
│   │       └── analytics/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx             # Landing page
│   └── not-found.tsx        # 404 page
├── components/
│   ├── auth/                # Auth components
│   ├── dashboard/           # Dashboard components
│   ├── landing/             # Landing page components
│   ├── ui/                  # Base UI components
│   ├── providers.tsx        # Context providers
│   └── theme-provider.tsx   # Theme provider
├── lib/
│   ├── constants.ts         # App constants & mock data
│   └── utils.ts             # Utility functions
├── types/                   # TypeScript type definitions
│   ├── auth.ts
│   ├── event.ts
│   ├── membership.ts
│   ├── payment.ts
│   └── user.ts
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.x or later
- **npm** 9.x or later

### Installation

```bash
# Clone the repository
git clone https://github.com/ritesh-goud/ANVX1.git
cd ANVX1

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for Production

```bash
npm run build
npm start
```

---

## 🎨 Design System

The platform uses a premium, Linear/Notion-inspired design system:

- **Typography**: Inter (body) + Figtree (headings)
- **Colors**: HSL-based CSS custom properties with light/dark mode
- **Glassmorphism**: Frosted glass effects for cards and overlays
- **Animations**: Smooth micro-animations via Framer Motion
- **Responsive**: Mobile-first design with responsive breakpoints

### Color Palette
| Token | Light | Dark |
|-------|-------|------|
| Primary | `hsl(217 91% 60%)` | `hsl(217 91% 60%)` |
| Background | `hsl(210 20% 98%)` | `hsl(215 30% 8%)` |
| Card | `hsl(0 0% 100%)` | `hsl(215 28% 11%)` |
| Muted | `hsl(215 20% 96%)` | `hsl(215 28% 15%)` |

---

## 🔧 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_your_key
RAZORPAY_SECRET=your_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📄 Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Landing page | Public |
| `/login` | Login page | Public |
| `/signup` | Signup page | Public |
| `/dashboard` | Member dashboard | Authenticated |
| `/events` | Event listing | Authenticated |
| `/events/[id]` | Event detail | Authenticated |
| `/profile` | User profile | Authenticated |
| `/membership` | Membership plans | Authenticated |
| `/announcements` | Announcements | Authenticated |
| `/resources` | Resource library | Authenticated |
| `/mentors` | Mentor directory | Authenticated |
| `/admin` | Admin dashboard | Admin |
| `/admin/members` | Member management | Admin |
| `/admin/events` | Event management | Admin |
| `/admin/events/create` | Create event | Admin |
| `/admin/analytics` | Analytics | Admin |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is private and proprietary.

---

Built with ❤️ by **Ritesh Goud** | A.N.X Platform
