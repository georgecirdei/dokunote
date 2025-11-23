# DokuNote

Enterprise-grade multi-tenant documentation platform built with Next.js 15, React 19, and TypeScript.

## 🚀 Features

- **Multi-tenant architecture** with subdomain support
- **MDX-based documentation** with rich editing
- **Public documentation hosting** 
- **Search and analytics**
- **Enterprise security** with tenant isolation

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Frontend:** React 19, TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** PostgreSQL + Prisma
- **Auth:** NextAuth.js
- **Search:** MiniSearch (upgradeable to Meilisearch)
- **Deployment:** Hetzner Cloud + Docker

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL
- npm or yarn

### Installation

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/georgecirdei/DokuNote.git
   cd DokuNote
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables:**
   \`\`\`bash
   cp env.example .env
   # Edit .env with your database credentials
   \`\`\`

4. **Set up the database:**
   \`\`\`bash
   npx prisma migrate dev
   npx prisma db seed
   \`\`\`

5. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

## 📁 Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── (marketing)/        # Marketing pages
│   ├── (auth)/            # Authentication pages  
│   ├── (dashboard)/       # Dashboard pages
│   ├── (public-docs)/     # Public documentation
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── blocks/           # shadcn/ui Blocks
│   └── common/           # Common components
├── features/             # Feature-based modules
├── lib/                 # Utilities and configurations
├── hooks/               # Custom React hooks
└── types/               # TypeScript definitions
\`\`\`

## 🔒 Architecture Highlights

- **Security-first:** Tenant isolation, rate limiting, request tracking
- **Scalable:** Service-specific subdomains, database optimization
- **Monitoring:** Built-in logging and error tracking
- **Performance:** Optimized for speed and scalability

## 🌐 Production Deployment

- **Domain:** dokunote.com (with wildcard SSL)
- **Server:** Hetzner Cloud CX23 (Ubuntu 22.04)
- **CI/CD:** GitHub Actions
- **Monitoring:** Built-in PostgreSQL-based logging

## 📖 Documentation

See the \`Documents/\` directory for:
- Architecture decisions
- Development plan  
- Implementation details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

---

Built with ❤️ by George Cirdei
