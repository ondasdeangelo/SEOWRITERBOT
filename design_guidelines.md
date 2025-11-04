# SEO Blog Generator Bot - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Linear + Vercel Dashboard aesthetic)

**Justification:** This is a productivity-focused SaaS application requiring information-dense displays, workflow management, and data visualization. The interface prioritizes efficiency, clarity, and professional polish over visual storytelling.

**Key Principles:**
- Clarity over cleverness: Every element serves a functional purpose
- Scannable hierarchy: Users should instantly understand status, priority, and next actions
- Workflow-focused: Visual design supports the approval pipeline and content management flow
- Professional minimalism: Clean, focused interface that doesn't distract from content creation

---

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts) - all UI elements, body text, navigation
- Monospace: JetBrains Mono - code blocks, GitHub commit IDs, technical data

**Hierarchy:**
- Page Titles: text-3xl font-semibold tracking-tight (36px)
- Section Headings: text-2xl font-semibold (24px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base font-normal (16px)
- Supporting Text: text-sm text-muted-foreground (14px)
- Captions/Labels: text-xs font-medium uppercase tracking-wide (12px)

**Line Height:**
- Headings: leading-tight
- Body: leading-relaxed
- Dense lists/tables: leading-normal

---

## Layout System

**Spacing Primitives:**
Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm (p-2, h-8, m-4, gap-6, etc.)

**Container Strategy:**
- Dashboard shell: Full width with max-w-7xl centered
- Content areas: Generous padding (px-6 md:px-8)
- Card spacing: gap-6 between major sections, gap-4 within cards
- Form fields: space-y-4 for field groups

**Grid System:**
- Dashboard overview: 3-column grid (lg:grid-cols-3) for metrics cards
- Website list: Single column with rich cards
- Article ideas: 2-column layout (md:grid-cols-2) for comparison
- History/logs: Full-width table layout

---

## Component Library

### Navigation
**Primary Sidebar:**
- Fixed left sidebar (w-64) with logo at top
- Navigation items with icons (Heroicons) and labels
- Active state: subtle background with left border accent
- Sections: Dashboard, Websites, Article Ideas, Drafts, History, Settings
- Bottom: User profile with avatar and GitHub connection status

**Top Bar:**
- Right-aligned: Notification bell (badge for pending approvals), user menu
- Left: Breadcrumb navigation showing current context

### Dashboard Overview Cards
**Metrics Grid (3 columns):**
Each card displays:
- Large number (text-4xl font-bold)
- Label below (text-sm)
- Icon in top-right corner
- Small trend indicator (up/down arrow with percentage)

Metrics to show:
1. Active Websites
2. Pending Approvals
3. Published This Month

**Recent Activity Feed:**
- Timeline-style list with icons
- Item structure: Icon | Title | Timestamp | Action button
- Grouped by date with subtle dividers

### Website Management Cards
**Website Card:**
Rich horizontal card containing:
- Left: Website favicon/icon in rounded container
- Center: Website name (text-lg font-semibold), URL (text-sm), target keywords as badges
- Right: Status badge, "Configure" button, overflow menu (3-dot)
- Bottom bar: Last generated (timestamp), Total articles (count), Next scheduled generation

**Add Website Form:**
Multi-step modal with progress indicator:
- Step 1: URL, Name, Description
- Step 2: SEO Context (target keywords as tag input, tone selector, audience description)
- Step 3: GitHub Configuration (repo selector, branch, folder path)
- Step 4: Generation Schedule (frequency dropdown, time picker)

### Article Ideas Interface
**Approval Workflow Cards:**
Two-column layout for comparison:

Left Column - Generated Ideas (Pending):
- Card structure: Headline (text-xl font-semibold), AI confidence score badge, generated keywords list, estimated word count, SEO score visualization (progress bar)
- Actions: Approve (primary button), Reject (ghost button), Edit headline (icon)

Right Column - Approved Queue:
- Similar card with "Ready to Draft" status
- Shows priority number, scheduled draft date
- Actions: Generate Draft Now, Remove from Queue

**Bulk Actions Toolbar:**
When items selected: Approve All, Reject All, Change Priority

### Draft Management
**Draft Preview Card:**
- Horizontal layout with thumbnail preview of rendered MDX
- Title and excerpt preview
- Metadata: Word count, readability score, keyword density
- Status pipeline: Draft → Review → PR Created → Merged
- Actions: View Full Draft, Edit in Modal, Push to GitHub, Download MDX

**Draft Editor Modal:**
Full-screen overlay with:
- Left 50%: MDX editor with syntax highlighting
- Right 50%: Live preview with frontmatter displayed separately
- Bottom toolbar: Save Draft, Discard Changes, Push to GitHub

### History & Logs
**Table View:**
Columns: Timestamp, Website, Action, Article Title, Status, GitHub PR Link
- Expandable rows showing generation details and AI prompts used
- Filters: Date range picker, website filter, status filter
- Export button for CSV download

### Forms & Inputs
**Consistent Field Styling:**
- Labels: text-sm font-medium mb-2
- Inputs: Rounded borders, focus states with ring
- Multi-select tags: Removable badges with × icon
- Rich text areas: Minimum height with resize handle
- Validation: Inline error messages in red, success checkmarks

---

## Page-Specific Guidelines

### Landing/Marketing Page (Public)
**Hero Section (90vh):**
- Large headline: "Automate Your SEO Content Pipeline"
- Subheading: Explains the workflow
- Primary CTA: "Start Free Trial" (large, prominent)
- Secondary CTA: "Watch Demo"
- Hero Image: Dashboard preview screenshot with subtle shadow and border

**Features Section:**
3-column grid showing:
1. AI-Powered Research (icon: brain/lightbulb)
2. Approval Workflow (icon: checklist)
3. GitHub Integration (icon: git branch)

Each with icon, title, description paragraph

**How It Works Section:**
4-step visual timeline:
1. Add Website → 2. Generate Ideas → 3. Approve Headlines → 4. Auto-Publish

**Pricing Section:**
3-tier comparison table (Free, Pro, Enterprise)

**CTA Section:**
Final conversion section with form: Email input + "Get Started" button

### Dashboard (Authenticated)
Full-width layout with sidebar + main content area
- Metrics grid at top
- Two-column layout below: Recent Activity (left 2/3) + Quick Actions sidebar (right 1/3)

### Websites Page
- Header with "Add Website" button
- Grid of website cards (1 column on mobile, 2 on desktop)
- Empty state: Large illustration with "Add your first website" CTA

### Article Ideas Page
- Filter bar at top: Website dropdown, Status tabs (All, Pending, Approved, Rejected)
- Two-column approval interface
- Pagination at bottom

### Drafts Page
- View toggle: Grid view / List view
- Draft cards in grid (2 columns)
- Status filter tabs

---

## Images

**Hero Image (Landing Page):**
Dashboard screenshot showing the article approval interface with pending ideas on left, approved queue on right. Include realistic website names and article headlines. Frame with subtle shadow and rounded corners (rounded-xl). Place in right 50% of hero section on desktop, full-width below headline on mobile.

**Feature Illustrations:**
Use simple, modern illustrations for the "How It Works" timeline - abstract representations of each step with consistent line style and minimal detail.

**Empty States:**
Friendly illustrations for:
- No websites added yet
- No pending approvals
- No drafts in queue

Each empty state should include a supporting message and clear CTA button.

---

## Accessibility & Polish

- All interactive elements maintain 44×44px minimum touch target
- Keyboard navigation with visible focus states (ring-2)
- ARIA labels for icon-only buttons
- Loading states: Skeleton screens for cards, spinner for buttons
- Toast notifications: Bottom-right corner, auto-dismiss after 5s
- Confirmation modals for destructive actions (reject, delete)