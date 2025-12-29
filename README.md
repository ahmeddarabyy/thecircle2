# Coworking Space Management App

An internal application for managing members, companies, and services in a coworking space.

## Features

- **Members Management**: Add and manage individual members with their details (name, occupation, contact info, referral source)
- **Companies Management**: Add and manage companies with their employees and contact information
- **Services Management**: Manage service pricing and availability for members and companies
- **Contract Tracking**: Track active contracts for members (private desk) and companies (private room monthly)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
  ├── components/
  │   ├── MembersTab.tsx      # Members list and management
  │   ├── CompaniesTab.tsx    # Companies list and management
  │   ├── ServicesTab.tsx     # Services list and management
  │   ├── MemberForm.tsx      # Form for adding/editing members
  │   ├── CompanyForm.tsx     # Form for adding/editing companies
  │   └── ServiceForm.tsx     # Form for adding/editing services
  ├── App.tsx                 # Main app component with routing
  ├── main.tsx               # Entry point
  ├── types.ts               # TypeScript type definitions
  ├── App.css                # Application styles
  └── index.css              # Global styles
```

## Usage

### Members Tab
- View all active members
- Add new members with their information
- Edit existing member details
- Assign members to companies
- Track member contracts

### Companies Tab
- View all companies
- Add new companies
- Edit company information
- Assign employees to companies
- Track company contracts

### Services Tab
- View all available services
- Add new services
- Edit service pricing
- Configure service availability (members/companies)
- Set service type (one-time or contract)

## Data Model

### Member
- Full name, occupation, phone, email
- Referral source
- Optional company association
- Active contract status

### Company
- Company name, email, phone
- Point of contact
- List of employee members
- Active contract status

### Service
- Service name and price
- Availability (members/companies)
- Type (one-time or contract)

## Technologies Used

- The Circle OS
- CSS (no external UI libraries)
