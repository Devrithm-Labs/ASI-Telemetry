from setuptools import setup, find_packages

setup(
    name="asi-telemetry",
    version="0.2.0",
    description="Observability and Distributed Tracing SDK for AI Agents and LLMs",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=[],
    python_requires=">=3.9",
)
