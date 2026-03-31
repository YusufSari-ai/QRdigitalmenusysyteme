QR-Based Digital Menu System
ULTRA STRICT INSTRUCTION CONTRACT (PRODUCTION-LEVEL)
0. GLOBAL RULES (NON-NEGOTIABLE)
•	This document is a STRICT CONTRACT, not a guideline
•	All rules defined here are MANDATORY
•	Any deviation is STRICTLY FORBIDDEN
•	No assumptions, simplifications, or feature additions are allowed
•	The system MUST be implemented exactly as defined
________________________________________
1. PROJECT OVERVIEW
1.1 Purpose
The system MUST implement a QR-based digital menu that:
•	Eliminates physical menus
•	Is strictly mobile-first
•	Is template-driven
•	Requires zero coding knowledge for content management
1.2 Actors
Customer (Viewer)
•	Accesses the menu via QR code
•	Has read-only access
•	MUST NOT require authentication
Admin (Content Manager)
•	Manages categories and products
•	MUST be authenticated
•	Has full CRUD capabilities
________________________________________
2. SYSTEM LOGIC & ROUTING (STRICT)
2.1 Routing Rules
•	The system MUST use the following route format:
/menu?table={tableId}
•	tableId MUST:
o	Be parsed from the URL
o	Be stored in application state or backend
o	MUST NOT be displayed in the UI under any circumstance
________________________________________
2.2 Navigation Rules (CRITICAL)
•	Category navigation MUST be handled via:
o	Client-side scrolling ONLY
•	The following are STRICTLY FORBIDDEN:
o	Route changes during category navigation
o	Page reloads
o	Any navigation method other than scroll
________________________________________
2.3 State Management Rules
•	tableId MUST be:
o	Accessible globally if needed
o	Hidden from all UI components
________________________________________
3. CORE FEATURES (ATOMIC)
The system MUST include ALL of the following:
•	QR-based table-specific entry
•	URL parameter parsing (tableId)
•	Category listing (grid layout)
•	Category-based product rendering (section-based)
•	Continuous scroll system
•	Sidebar navigation (anchor-based scroll)
•	Fully functional admin panel
•	Full CRUD operations
________________________________________
4. DATA MODEL, TYPES & INTEGRITY (STRICT)
4.1 General Constraints
•	ALL id fields MUST:
o	Be unique
o	Be string
o	Use UUID format
•	categoryId MUST:
o	Reference an existing category
o	Enforce FOREIGN KEY CONSTRAINT
•	price MUST:
o	Be a number
o	MUST NOT be negative
________________________________________
4.2 Entities
Category
id: string
name: string
image_url: string
orderIndex: number
createdAt: Date
Product
id: string
name: string
image_url: string
price: number
categoryId: string
orderIndex: number
createdAt: Date
________________________________________
5. DATA FETCHING, LOADING & ERROR HANDLING (STRICT)
5.1 Fetching Rules
•	ALL data MUST be fetched:
o	In a single request
o	Using a nested relational structure
•	The following are STRICTLY FORBIDDEN:
o	Additional API calls during scroll
o	Incremental fetching
o	Lazy fetching of categories/products
________________________________________
5.2 Loading Rules
•	A skeleton loader MUST be displayed during initial load
•	The UI MUST:
o	Prevent layout shift (CLS = 0 tolerance)
________________________________________
5.3 Error Handling
•	On API failure:
o	An error message MUST be shown
o	A retry mechanism MUST be provided
________________________________________
6. FRONTEND & UI RULES (STRICT)
6.1 Scroll & Layout
•	ALL content MUST exist inside:
o	A single scroll container
•	Each category MUST:
o	Be rendered as an independent section
•	Sidebar MUST:
o	Scroll smoothly to sections using anchors
________________________________________
6.2 Product Card Rules
Display order MUST be:
1.	Product Name
2.	Product Image
3.	Price (localized format: ₺100,00)
________________________________________
6.3 Image Rules
•	MUST use: object-fit: cover
•	MUST maintain fixed aspect ratio
•	MUST show placeholder before load
Storage Rules:
•	Images MUST be stored in cloud storage
•	Database MUST store ONLY image URLs
________________________________________
6.4 UI Constraints
•	Design MUST be strictly mobile-first
•	Category headers MUST be sticky
•	Images MUST be lazy-loaded
•	Large lists SHOULD use virtualized rendering
________________________________________
7. ADMIN PANEL, SECURITY & VALIDATION (STRICT)
7.1 Security Rules
•	ALL inputs MUST be sanitized
•	XSS protection MUST be enforced
•	Allowed image formats:
o	jpg
o	png
o	webp
•	Authentication:
o	MUST use email + password
________________________________________
7.2 Validation Rules
•	Product price MUST NOT be negative
•	Names MUST NOT be empty
•	Category selection MUST be required
•	Image upload MUST be mandatory
________________________________________
7.3 Cascade Rules
•	When a category is deleted:
o	ALL related products MUST be deleted (CASCADE)
________________________________________
8. EDGE CASES & EMPTY STATES (STRICT)
•	If no categories exist:
o	EMPTY STATE MUST be shown
•	Categories with no products:
o	MUST NOT be rendered
•	Missing images:
o	MUST use placeholder
•	Long text:
o	MUST be truncated using ellipsis
________________________________________
9. TECH STACK (MANDATORY)
•	Frontend: Next.js (App Router)
•	Backend: Supabase (BaaS)
•	Database: PostgreSQL
•	Authentication: Supabase Auth
•	Storage: Supabase Storage
•	Deployment: Vercel
________________________________________
10. ARCHITECTURE (STRICT)
•	MUST be a monolithic Next.js application
•	MUST include in a single codebase:
o	Customer UI
o	Admin Panel
•	Supabase MUST handle:
o	Database
o	Authentication
o	Storage
•	Vercel MUST handle:
o	Deployment
o	Serverless execution
________________________________________
11. PROJECT STRUCTURE (STRICT)
/app
  /menu
    page.tsx
  /admin
    /login
      page.tsx
    /dashboard
      page.tsx
    /categories
      page.tsx
    /products
      page.tsx

/components
  /ui
  /menu
    CategorySection.tsx
    ProductCard.tsx
    SidebarNavigation.tsx
  /admin

/lib
  supabaseClient.ts
  queries.ts

/types
  category.ts
  product.ts

/styles
  globals.css
________________________________________
12. DEVELOPMENT WORKFLOW (STRICT ORDER)
The following order MUST be followed:
1.	Project setup
2.	Database setup
3.	Data layer
4.	UI (static first)
5.	Scroll logic
6.	Data integration
7.	Admin panel
8.	Image storage
9.	Validation & security
10.	Performance optimization
11.	Deployment
________________________________________
13. DEFINITION OF DONE (STRICT)
Functional Requirements
•	QR MUST open correct menu
•	tableId MUST be correctly processed
•	Categories & products MUST be correctly mapped
•	Continuous scroll MUST work
•	Sidebar navigation MUST work
•	Admin CRUD MUST be fully functional
•	Image upload MUST work
________________________________________
UI/UX Requirements
•	MUST be fully mobile responsive
•	MUST NOT have layout issues
•	Images MUST render correctly
________________________________________
Data Integrity
•	Relationships MUST be correct
•	Sorting MUST be correct
________________________________________
Performance
•	MUST load fast
•	MUST scroll smoothly
•	Lazy loading MUST be active
________________________________________
Security
•	Auth MUST be enforced
•	Validation MUST be active
•	Supabase RLS MUST be enabled
________________________________________
Deployment
•	MUST be deployed on Vercel
•	Environment variables MUST be configured
•	Production build MUST be stable
________________________________________
14. AI EXECUTION DIRECTIVE (CLAUDE CODE)
•	Treat this document as a system-level instruction
•	DO NOT:
o	Skip rules
o	Simplify logic
o	Introduce new features
•	DO:
o	Follow all constraints strictly
o	Respect architecture decisions
o	Implement exactly as defined
________________________________________
FINAL STATEMENT
This specification is COMPLETE.
No interpretation is required.
Only execution is expected.