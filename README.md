# Stock Portfolio Management Application

## Technologies Used

* **Framework**: Angular 19.0.2 (Standalone Components)
* **Financial Data API**: Twelve Data API for real-time market information
* **Serverless Functions**: Netlify Functions for secure API key management
* **Data Visualization**: Chart.js for interactive charts and graphs
* **UI Framework**: Bootstrap for responsive design
* **Language**: TypeScript for enhanced type safety
* **Reactive Programming**: RxJS for reactive data flows
* **Storage**: LocalStorage for local data persistence

### Project Structure

src/app/
├── components/           # Visual components (portfolio, wallet, login)
├── services/            # Business logic and API integration services
├── guards/              # Route protection (auth.guards.ts)
├── app.component.*      # Main application component
├── app.config.ts        # Application configuration
├── app.routes.ts        # Route definitions
└── ...

netlify/
└── functions/
    └── stock-data.js    # Serverless function for secure API calls


##  Key Features
### Portfolio Management

Add and manage stock positions with automatic ticker validation
Real-time price updates with manual and automatic refresh options
Portfolio operations: add, remove, clear, and export to CSV

###  Financial Analysis

Real-time profit/loss calculations for individual stocks and total portfolio
Color-coded financial dashboard showing key metrics
Historical price tracking and percentage change calculations

###  Data Visualization

Interactive 30-day price history charts for individual stocks
Portfolio comparison charts with multiple stock overlays
Responsive design with zoom and navigation controls

###  Data Management

Local storage persistence for portfolio data
CSV export functionality for external analysis
Automatic data recovery across browser sessions

## Installation and Setup

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Netlify CLI for local development
- Twelve Data API key (free at [twelvedata.com](https://twelvedata.com))

### Installation Steps

1. **Clone the repository**
   git clone [repository-url]
  
2. **Install dependencies**

   npm install
 
3. **Install Netlify CLI globally**
   npm install -g netlify-cli

4. **Configure Environment Variables**
   
   Create a `.env` file in the project root directory:
   
   Add your Twelve Data API key to the `.env` file:
   
   TWELVE_DATA_API_KEY=your_actual_api_key_here
   
   **Important**: Replace `your_actual_api_key_here` with your actual API key from Twelve Data.

