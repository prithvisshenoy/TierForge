# TierForge Frontend UI
The UI for TierForge data ingestion, scoring, and tiering.
Built with React and Vite.

## Repository Structure

```text
Frontend/
├── README.md                         # Frontend setup and project notes
└── tierforge-ui/                     # React application built with Vite
	├── api/                          # HTTP client and backend endpoint helpers
	│   ├── apiEndpoints.js            # Backend route paths
	│   ├── apiService.js              # Upload, status, and tier API calls
	│   └── axiosinterceptors.js        # Shared Axios configuration
	├── public/                       # Static files served from the site root
	│   ├── favicon.svg                # Browser tab icon
	│   └── icons.svg                  # Shared SVG icons
	├── src/                          # Application source code
	│   ├── assets/                   # Images and imported static assets
	│   │   ├── hero.png               # Hero image
	│   │   ├── react.svg              # React starter asset
	│   │   └── vite.svg               # Vite starter asset
	│   ├── components/               # UI components used by the application
	│   │   ├── ClassificationConfig.jsx # Tier scoring and classification settings
	│   │   ├── FailedRecords.jsx     # Records that failed enrichment
	│   │   ├── JobOverview.jsx       # Upload job progress and summary
	│   │   ├── StoreResults.jsx       # Classified store results
	│   │   ├── TierBreakdown.jsx      # Store counts by tier
	│   │   └── UploadScreen.jsx      # CSV upload interface
	│   ├── App.css                   # Main application styles
	│   ├── App.jsx                   # Main UI, state, and application workflows
	│   ├── constants.js              # Shared UI and CSV constants
	│   ├── index.css                 # Global styles
	│   └── main.jsx                  # React application entry point
	├── .env                          # Local Vite settings; keep secrets private, not committed to git
	├── .gitignore                    # Files excluded from Git
	├── eslint.config.js              # ESLint configuration
	├── index.html                    # Vite HTML entry document
	├── package-lock.json             # Locked npm dependency versions
	├── package.json                 # Dependencies and development scripts
	├── README.md                     # App-specific documentation
	└── vite.config.js                # Vite build and development-server configuration
```

## Getting Started

### Prerequisites

Ensure you have **Node.js (v18.x or higher)** and **npm / pnpm / yarn** installed.

### 1. Clone the Repository
```bash
git clone https://github.com/prithvisshenoy/TierForge.git
cd Frontend/tierforge-ui
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
# or
yarn install
```

### 3. Environment Variables
Create a `.env` file in the app root and set the backend URL:

```env
VITE_API_BASE_URL=http://{your_backend_server_url}
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the app in development mode with hot-reloading. |
| `npm run build` | Builds the optimized production application. |
| `npm run lint` | Runs ESLint across the project. |
| `npm run preview` | Serves the production build locally. |

## UI & Component Guidelines

### Component Assembly
- Keep application UI components in `src/components/`.
- Place shared UI elements in `src/common/` and feature-specific components in an appropriate subfolder under `src/components/`.

### Styling
- This app uses **Material UI** and CSS. Follow the existing component patterns and styles in `src/App.css` and `src/index.css`.
- The project does not currently use Tailwind CSS or Next.js.

## Contributing

Contributions are what make the open-source community an amazing place to learn, inspire, and create.

1. **Fork** the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your Changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to your Branch (`git push origin feature/AmazingFeature`)
5. Open a **Pull Request**

