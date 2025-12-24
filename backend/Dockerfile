FROM hub.docker.com/r/astral/uv:python3.11-trixie
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1

COPY pyproject.toml uv.lock /app/
RUN uv sync --frozen --no-dev

COPY . /app/backend
ENV PYTHONPATH=/app

CMD ["python", "-m", "backend.app"]
