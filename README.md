# Elyriax

A streamlined, single-page application (SPA) providing a modular web interface for digital services. Built with a focus on performance, clean code architecture, and a seamless user experience.

## Overview

Elyriax is designed as a lightweight, maintainable front-end environment. The architecture deliberately minimizes heavy framework dependencies, utilizing vanilla web technologies combined with a utility-first CSS approach. This ensures fast load times, straightforward maintainability, and consistent responsiveness across devices.

## Tech Stack

- **Core:** HTML5, Vanilla JavaScript
- **Styling:** Tailwind CSS
- **Typography:** Plus Jakarta Sans, Inter, JetBrains Mono
- **Iconography:** FontAwesome

## Local Development

Getting the project running locally requires minimal setup. No complex build pipelines or package managers are strictly necessary.

### Prerequisites

- Any standard local HTTP server (e.g., Python's `http.server`, Node's `http-server`, or VS Code Live Server).

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/elyriax.git
   ```
2. Navigate to the project root:
   ```bash
   cd elyriax
   ```
3. Serve the directory. For example, using Python 3:
   ```bash
   python -m http.server 8000
   ```
4. Access the application at `http://localhost:8000`.

## Project Structure

- `index.html` â Main entry point containing the UI layout and core SPA routing logic.
- `site.webmanifest` â Standardized web app manifestation.
- `robots.txt` & `sitemap.xml` â Search engine indexing directives.
- `/assets` â Static resources including favicons and Open Graph imagery.

## Contributing

Contributions, issues, and feature requests are welcome. When contributing, please adhere to the existing architectural philosophy: favoring standard web APIs and minimal external dependencies.

## License

Distributed under the MIT License.
