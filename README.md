<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlantsMantra E-commerce Platform - README</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            color: #24292e;
        }
        h1 {
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
            font-size: 2em;
        }
        h2 {
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
            font-size: 1.5em;
            margin-top: 1.5em;
        }
        pre {
            background-color: #f6f8fa;
            border-radius: 6px;
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
        }
        code {
            background-color: #f6f8fa;
            border-radius: 3px;
            padding: 0.2em 0.4em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            display: block;
            overflow-x: auto;
        }
        th, td {
            border: 1px solid #dfe2e5;
            padding: 8px 13px;
            text-align: left;
        }
        th {
            background-color: #f0f3f6;
            font-weight: 600;
        }
        ul {
            padding-left: 20px;
        }
    </style>
</head>
<body>

    <h1>PlantsMantra E-commerce Platform</h1>

    <h2>&#x1F33F; Overview</h2>
    <p>
        This is a modern, full-stack e-commerce application developed for our client, <strong>Ajay Mehra</strong>, the owner of PlantsMantra. It delivers a seamless shopping experience with robust product management and secure payment gateways.
    </p>
    <p>
        It is built with a high-performance <strong>React/Vite (TypeScript)</strong> frontend and powered entirely by a <strong>Supabase</strong> backend for authentication, database, real-time logic, and serverless functions.
    </p>
    <hr>

    <h2>&#x1F680; Technical Stack</h2>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Technology</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Frontend</strong></td>
                <td><strong>React/Vite</strong> (TypeScript)</td>
                <td>Fast development/builds.</td>
            </tr>
            <tr>
                <td><strong>UI/UX</strong></td>
                <td><strong>Tailwind CSS</strong>, <strong>Shadcn UI</strong></td>
                <td>Utility-first styling with a component library.</td>
            </tr>
            <tr>
                <td><strong>State Mgt.</strong></td>
                <td><strong>Zustand</strong></td>
                <td>Used for global state like the persistent Cart and Wishlist.</td>
            </tr>
            <tr>
                <td><strong>Backend</strong></td>
                <td><strong>Supabase</strong></td>
                <td>PostgreSQL Database, Auth, Storage, and Edge Functions.</td>
            </tr>
            <tr>
                <td><strong>Payments</strong></td>
                <td><strong>Stripe, Razorpay</strong></td>
                <td>Secure processing via Supabase Edge Functions.</td>
            </tr>
            <tr>
                <td><strong>Data</strong></td>
                <td><strong>TanStack Query (React Query)</strong></td>
                <td>Efficient server-state management.</td>
            </tr>
        </tbody>
    </table>
    <hr>

    <h2>&#x2728; Key Developer Features</h2>

    <h3>1. Full-Stack Supabase Implementation</h3>
    <ul>
        <li>
            <strong>RBAC & Admin Portal:</strong> Uses a custom <code>user_roles</code> system to secure the <code>/admin</code> route. The <strong>Admin Panel</strong> provides dedicated modules for:
            <ul>
                <li>Products, Categories, and Coupons management.</li>
                <li>Order and Customer analytics.</li>
            </ul>
        </li>
        <li>
            <strong>Persistent Cart Logic:</strong> The <code>useCart</code> store manages local state via Zustand, and the <code>CartSync</code> component automatically reconciles or loads the cart data with the remote <code>cart_items</code> table in Supabase when the user's auth state changes.
        </li>
        <li>
            <strong>Serverless Payment & Validation:</strong> Critical business logic is hosted in Edge Functions:
            <ul>
                <li><strong>Coupon Validation:</strong> <code>validate-coupon</code> enforces complex rules (e.g., minimum purchase, max discount, date limits).</li>
                <li><strong>Payment Handlers:</strong> Dedicated functions for Stripe and Razorpay order creation and verification.</li>
            </ul>
        </li>
    </ul>

    <h3>2. E-commerce & Management</h3>
    <ul>
        <li><strong>Comprehensive Product Schema:</strong> Supports product variants, stock statuses (<code>in_stock</code>, <code>low_stock</code>), and distinct fields for SEO titles/descriptions.</li>
        <li><strong>Dynamic SEO:</strong> The <code>SEOTags.tsx</code> component dynamically sets the page's <code>&lt;title&gt;</code> and <code>&lt;meta name="description"&gt;</code> based on product data, vital for search engine visibility in a Single Page Application (SPA).</li>
        <li><strong>Customer Features:</strong> Includes user <code>Account</code> management, address forms, order history viewing, and a dedicated <code>Wishlist</code>.</li>
        <li><strong>Plant Finder Quiz:</strong> A custom flow (<code>PlantFinder.tsx</code>) to match users with recommended product categories based on their answers.</li>
    </ul>
    <hr>

    <h2>&#x1F6E0;️ Getting Started (Using NPM)</h2>

    <h3>Prerequisites</h3>
    <ul>
        <li>Node.js (v18+)</li>
        <li>npm</li>
    </ul>

    <h3>Installation</h3>
    <pre><code>git clone [REPO_URL] neeraj704-plantsmantra
cd neeraj704-plantsmantra</code></pre>
    <pre><code>npm install</code></pre>
    
    <p><strong>Set up Environment Variables:</strong> The Supabase and API keys used in this repository are placeholders. For local development or production, you must set up your own environment with corresponding keys for Stripe and Razorpay.</p>
    <p>You will need to run the migrations located in the <code>supabase/migrations</code> directory against your Supabase project to correctly set up the database schema and RLS policies.</p>


    <h3>Running the Application</h3>
    <p><strong>Development Mode:</strong></p>
    <pre><code>npm run dev</code></pre>
    <p>The application runs on <code>http://localhost:8080</code>.</p>

    <p><strong>Production Build:</strong></p>
    <pre><code>npm run build</code></pre>
    <p>This prepares the static assets for deployment.</p>

</body>
</html>
