# Roboto SAI SDK (Draft)

Roboto SAI SDK is a Python wrapper around the official `xai-sdk` providing:

- A simple `RobotoSAIClient` convenience client for chat interactions
- A starter `QuantumEnhancedMemorySystem` for episodic memory experiments
- Example scripts and a roadmap for quantum research (Roboto SAI Quanto)

> NOTE: This is a dedicated workspace for the SDK to keep development isolated from the frontend app.

## Quickstart

1. Create and activate a venv:

   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1
   ```

2. Install dependencies and the package in editable mode:

   ```powershell
   pip install -r requirements.txt
   pip install -e .
   ```

3. Set your `XAI_API_KEY` locally (PowerShell):

   ```powershell
   $env:XAI_API_KEY = "xai-..."
   ```

   Or create a `.env` file with `XAI_API_KEY` and use `python-dotenv` to load it in examples.

4. Run the example:

   ```powershell
   python examples\chat_with_memory.py
   ```

## Development

- Lint with `ruff` or `ruff check .`
- Tests use `pytest`

## Roadmap (high-level)

- Roboto SAI Quanto (quantum memory experiments using `qiskit` and `qutip`)
- FastAPI backend to expose `/chat` endpoints with CORS and auth
- Vector-based memory store and approximate nearest neighbor searches
- CI: tests, lint, and packaging workflow

## Security

- **Do not** commit `.env` or API keys. Use CI secrets for `XAI_API_KEY`.

## License

See `LICENSE` for details.
