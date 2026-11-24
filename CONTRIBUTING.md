# Contributing to Autonomous Enterprise Intelligence System

## Development Workflow
1. Fork and create a feature branch.
2. Backend changes must pass `pytest` and include type hints + Pydantic validation.
3. Frontend changes must pass `npm run build` (`tsc -b && vite build`) and `npm test`.
4. Never commit `.env` files or API credentials.
5. Maintain consistent naming: **Autonomous Enterprise Intelligence System**.
