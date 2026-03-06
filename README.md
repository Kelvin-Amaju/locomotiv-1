# Locomotiv 🚗💨

**Locomotiv** is a modern Next.js application designed to help users find detailed vehicle specifications and plan road trips with precision. By combining real-time vehicle data with smart trip analysis, it answers the critical question: *"Is this car suitable for my journey?"*

## ✨ Key Features

-   **Vehicle Research Engine**: Instantly access specifications for thousands of cars (Year, Make, Model) using NHTSA and CarQuery APIs.
-   **Smart Trip Planner**:
    -   Calculate fuel costs based on real-world efficiency and fuel prices.
    -   Analyze trip suitability (Can the car make it on one tank? How many stops are needed?).
    -   Visual "Suitability Badge" indicating if a car is safe for a specific trip.
-   **Interactive Maps**: Integrated Google Maps for selecting origin/destination and visualizing routes.
-   **Live Journey Mode**: Real-time tracking of speed, remaining distance, and ETA during a trip.
-   **Responsive Design**: Built with a "mobile-first" mindset, featuring a beautiful UI with smooth gradients and animations.

## 🛠️ Technology Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Maps**: Google Maps JavaScript API via `@react-google-maps/api`
-   **Data Sources**:
    -   [NHTSA API](https://vpic.nhtsa.dot.gov/api/) (Makes & Models)
    -   [CarQuery API](https://www.carqueryapi.com/) (Detailed Specs)

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+ installed on your machine.
-   A Google Maps API Key (optional but recommended for full map functionality).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/PineAgency/locomotiv.git
    cd locomotiv
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root directory and add your Google Maps API key:
    ```env
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
    ```
    > **Note:** Without an API key, the map components may show an error, but other features will work.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open the app:**
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 🆕 What's changed (2026-03-06)

- Backend: improved robustness for the vehicle image analysis route (`/api/analyze-vehicle`):
    - Added a 30s timeout to external AI requests to avoid hanging requests.
    - Implemented multiple parsing strategies for AI responses (raw JSON, extracting the first JSON object from text, and parsing embedded `generated_text`).
    - Added a lightweight runtime validator to ensure the returned object contains the expected fields (isVehicle, make, model, year, confidence).
    - If parsing/validation fails the route now returns a 502 with a trimmed AI snippet for easier debugging.
- Image handling: the analysis route resizes images using `sharp` to a max dimension of 1024px and compresses to JPEG quality 80 to reduce payload size and AI quota.
- Dev mode: both the Hugging Face (`HF_API_KEY`) and Gemini (`GEMINI_API_KEY`) routes return deterministic mock responses when their respective keys are not present — useful for local development.

These changes improve reliability when the external AI model returns extra tokens or unexpected formats.

## ✅ API endpoints (server-side)

- POST `/api/analyze-vehicle`
    - Request body: JSON { "image": "<data-url or base64>" }
    - Response: JSON object containing at least:
        - isVehicle: boolean
        - make: string
        - model: string
        - year: string
        - confidence: number
    - Notes: The route resizes the image and sends it to a multimodal AI (Hugging Face model by default). It has a 30s timeout and returns a clear error when the AI output can't be parsed or validated.

- GET `/api/carquery` — proxy to CarQuery API for trims/specs (used by the UI).
- GET `/api/nhtsa` — proxy to the NHTSA (VPIC) endpoints.

## Environment variables

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — (optional) Google Maps API key for map features.
- `HF_API_KEY` - (optional/very heavy to run) Hugging Face Inference API key. If missing, `/api/analyze-vehicle` returns a mock response for development.
- `GEMINI_API_KEY` - Recommended (optional/runs smoothly) Google Gemini API key used by the backup analyze implementation in `routebkup.tsx`. If missing, that route also returns a mock response.

Put these in a `.env.local` file in the project root. Example:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
HF_API_KEY=your_hf_api_key
# GEMINI_API_KEY=your_gemini_api_key (only needed if you want to use the Gemini route)
```

## Quick test (analyze-vehicle)

You can test the analyze endpoint locally by POSTing JSON with an image data URL or base64 string. Example (node/fetch):

```js
// minimal example using fetch in Node or the browser
const res = await fetch('http://localhost:3000/api/analyze-vehicle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: '<data:image/jpeg;base64,...>' })
});
const json = await res.json();
console.log(json);
```

If the AI backend is unavailable or returns unexpected output, the endpoint responds with a helpful error and a short snippet of the AI output for debugging.

## Troubleshooting & next steps

- If you see many `Invalid AI response` errors, confirm the model you target expects the posted JSON shape (some HF models require multipart inputs or different fields).
- Consider adding schema validation (e.g., via `zod`) for stricter runtime checks and better developer errors.
- To harden production, add retries with exponential backoff for transient 5xx errors and careful rate-limiting to avoid cost spikes.

## 📂 Project Structure

-   `app/page.tsx`: The main application logic, state management, and UI layout.
-   `app/components/`: Reusable UI components.
    -   `MapPanel.tsx`: Handles Google Maps rendering and interactions.
    -   `Features.tsx`: Landing page feature highlights.
    -   `JourneyModal.tsx`: The full-screen overlay for Live Journey mode.
-   `app/api/`: Server-side proxy routes for external APIs to avoid CORS issues.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
