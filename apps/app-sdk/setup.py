from setuptools import setup, find_packages

setup(
    name="asi-telemetry",
    version="0.1.0",
    description="Observability and Distributed Tracing SDK for AI Agents and LLMs",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=[
        "httpx>=0.24.0",
    ],
    python_requires=">=3.9",
)
