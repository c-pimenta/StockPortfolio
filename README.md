# Stock Portfolio Management Application

A modern, real-time stock portfolio management application built with Angular 19, featuring live market data integration and comprehensive financial analysis tools.

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

```
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
```

The application structure represents a well-organized Angular project where the `src/app` folder contains the main application elements. Within it, the `components` folder groups components accessed through the `<router-outlet>` in `app.component.ts` (the main project file), such as login, portfolio, and wallet, each with their respective `.ts`, `.scss`, and `.spec.ts` files for logic, styles, and tests. The `guards` folder includes files like `auth.guards.ts` for route authentication protection. The `services` folder contains services like `stock.service.ts` that handle business logic and API communication through Netlify Functions, ensuring API keys remain secure.

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
   ```bash
   git clone [repository-url]
   cd stock-portfolio-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Netlify CLI globally**
   ```bash
   npm install -g netlify-cli
   ```

4. **Configure Environment Variables**
   
   Create a `.env` file in the project root directory:
   ```bash
   touch .env
   ```
   
   Add your Twelve Data API key to the `.env` file:
   ```
   TWELVE_DATA_API_KEY=your_actual_api_key_here
   ```
   
   **Important**: Replace `your_actual_api_key_here` with your actual API key from Twelve Data.

5. **Verify .gitignore**
   
   Ensure your `.gitignore` file includes these entries to prevent committing sensitive data:
   ```
   .env
   .env.local
   .env.*.local
   ```

## 🚀 Local Development

### Running the Application Locally

**Important**: You must use Netlify CLI instead of the standard Angular CLI to run the application locally. This is required for the serverless functions to work properly.

1. **Start the development server**
   ```bash
   netlify dev
   ```

2. **Access the application**
   - Open your browser and navigate to `http://localhost:8888`
   - **Note**: Netlify dev typically uses port 8888, not Angular's default 4200

### Testing the Setup

1. **Test the function directly** by visiting:
   ```
   http://localhost:8888/.netlify/functions/stock-data?endpoint=quote&symbol=AAPL
   ```
   You should see JSON data with Apple stock information.

2. **Check browser console** for any errors when using the application

3. **Verify API calls** in the Network tab of your browser's developer tools - all requests should go to `/.netlify/functions/stock-data`

### Troubleshooting Local Development

**Common Issues:**

- **"Function not found" error**: Ensure the function file is at `/netlify/functions/stock-data.js`
- **"API key not configured" error**: Check your `.env` file is in the project root and formatted correctly
- **CORS errors**: Make sure you're accessing via `localhost:8888` (Netlify dev URL)
- **No data loading**: Verify you're using `netlify dev`, not `ng serve`

**Debug Steps:**

1. Check that Netlify CLI is running the correct port
2. Verify your `.env` file exists and contains the correct API key
3. Test the function endpoint directly in your browser
4. Check browser console and network tabs for error messages

##  Production Deployment

### Netlify Deployment

1. **Push your code to GitHub** (make sure `.env` is in `.gitignore`)

2. **Connect your repository to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository

3. **Configure Environment Variables in Netlify**
   - Go to your site settings in Netlify
   - Navigate to "Environment variables"
   - Add a new variable:
     - **Key**: `TWELVE_DATA_API_KEY`
     - **Value**: Your actual API key

4. **Deploy**
   - Netlify will automatically build and deploy your site
   - The serverless functions will be deployed automatically

### Build Configuration

The application is optimized for production with:
- Ahead-of-Time (AOT) compilation
- Tree-shaking for reduced bundle size
- Automatic serverless function deployment
- Secure environment variable handling

##  Authentication and Security

The application includes route protection through Angular Guards, ensuring secure access to portfolio management features. Authentication state is managed reactively and persisted locally for seamless user experience.

**Security Features**:
- API keys never exposed to client-side code
- Secure serverless function architecture
- Environment variable protection
- CORS-enabled secure requests

##  Responsive Design

Built with Bootstrap, the application provides optimal viewing experience across:
- Desktop computers
- Tablets
- Mobile devices
- Various screen sizes and orientations

## Testing

The project includes comprehensive testing setup:
- Unit tests for components and services
- Integration tests for API connections
- End-to-end testing capabilities

Run tests with:
```bash
npm test
```

For testing with Netlify functions:
```bash
netlify dev
# In another terminal:
npm test
```


## 📄 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `TWELVE_DATA_API_KEY` | Your Twelve Data API key for stock market data | ✅ Yes |

**Getting an API Key**:
1. Visit [twelvedata.com](https://twelvedata.com)
2. Sign up for a free account
3. Generate an API key
4. Add it to your `.env` file and Netlify environment variables


**Built with ❤️ using Angular 19, Netlify Functions, and modern web technologies**

**🔒 Security First**: This application prioritizes security by never exposing API keys to client-side code, ensuring your credentials remain protected in both development and production environments.
