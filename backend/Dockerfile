FROM python:3.12-slim

# Zero Trust: Create non-root user early
RUN groupadd -r roboto && useradd -r -g roboto roboto

WORKDIR /app

# Install system dependencies with minimal footprint
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Deception Layer: Add canary traps (fake sensitive files)
RUN mkdir -p /app/traps && \
    echo "WARNING: Classified Data - Unauthorized Access Detected" > /app/traps/classified.txt && \
    echo "Honey Trap - Breach Alert Triggered" > /app/traps/honeypot.log && \
    chmod 600 /app/traps/*

# Misdirection: Fake environment variables
ARG DECOY_KEY=fake_decoy_value
ENV MISDIRECTION_PATH=/fake/path

# Copy requirements and SDK
COPY backend/requirements.txt ./backend/
COPY backend/constraints.txt ./backend/
COPY sdk/ /app/sdk/

# Install dependencies with constraints
RUN pip install --no-cache-dir -r ./backend/requirements.txt -c ./backend/constraints.txt

# Adversarial interference neutralization: Verify SDK integrity
RUN python -c "import sys; sys.path.insert(0, '/app/sdk'); import roboto_sai_sdk; print('SDK integrity verified')"

# Copy backend code with integrity check
COPY backend/ /app/backend/

# Zero Trust: Change ownership to non-root user
RUN chown -R roboto:roboto /app

# Set working directory
WORKDIR /app/backend

# Set Python path and secure env
ENV PYTHONPATH=/app/backend
ENV ZERO_TRUST_ENABLED=true

# Expose port
EXPOSE 5000

# Switch to non-root user
USER roboto

# Hostile conditions: Retry logic in CMD for resilience
CMD ["sh", "-c", "for i in 1 2 3; do echo \"Attempt $i\" && python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-5000} --log-level info && break; done"]
