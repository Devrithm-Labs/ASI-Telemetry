
import os
from dotenv import load_dotenv

# Load environment variables before initializing tracing
load_dotenv()

from langsmith import traceable
from google import genai

# Initialize the Google Gemini client
client = genai.Client(
    api_key=os.getenv("GOOGLE_API_KEY")
)


@traceable(name="format_prompt")
def format_prompt(subject: str) -> str:
    """Build the prompt for the LLM."""
    return f"""
    Explain the following subject in simple terms:
    {subject}

    Give a clear explanation and one example.
    """


@traceable(name="invoke_llm", run_type="llm")
def invoke_llm(messages: str) -> str:
    """Send the prompt to Google Gemini."""
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=messages,
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")

    return response.text


@traceable(name="parse_output")
def parse_output(response: str) -> str:
    """Clean the LLM response."""
    return response.strip()


@traceable(name="run_pipeline")
def run_pipeline() -> str:
    messages = format_prompt("How does an API work?")
    response = invoke_llm(messages)
    result = parse_output(response)

    return result


if __name__ == "__main__":
    try:
        result = run_pipeline()
        print("\n--- Final Output ---")
        print(result)
    except Exception as error:
        print(f"Pipeline failed: {error}")
