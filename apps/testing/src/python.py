import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

# Import SDK directly from local app-sdk folder
SDK_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "app-sdk", "src"))
if SDK_PATH not in sys.path:
    sys.path.insert(0, SDK_PATH)

from uagents import Agent, Context, Model
from uagents.resolver import RulesBasedResolver
from asi_telemetry import AgentMonitor, traceable, instrument_gemini
from google import genai

# 1. Initialize Telemetry Monitors
monitor = AgentMonitor(agent_name="receiver")

# 2. Initialize and Instrument Gemini Client
gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
instrument_gemini(gemini_client)

try:
    loop = asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
class Greeting(Model):
    text: str

SENDER_ADDRESS = "agent1qtj4m78hdr2dmldtssn7kw7gt0e3ycledny3cadpmdau9dmnv9a4yzjxcx0"

local_resolver = RulesBasedResolver({
    SENDER_ADDRESS: "http://127.0.0.1:8001/submit"
})

agent = Agent(
    name="assistant",
    seed="assistant_seed",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
    resolve=local_resolver
)

# Configure agent address and handle in SDK
monitor.agent_address = agent.address
monitor.agent_handle = "@weather-agent-13"
from asi_telemetry import set_agent_info
set_agent_info(agent_name="receiver", agent_address=agent.address, agent_handle="@weather-agent-13")


# 3. Tracked LLM Call (Captures tokens, cost, and LLM latency)
@traceable(name="gemini_generate", run_type="llm")
def call_gemini(prompt: str) -> str:
    """Invokes Google Gemini model with high-availability fallback."""
    for model_name in ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"]:
        try:
            response = gemini_client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            print(f"[Model {model_name} notice: {e}. Trying fallback...]")

    return "I apologize, but the Gemini API is currently unavailable. Please try again."


@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Assistant Agent Address: {agent.address}")
    ctx.logger.info(f"Assistant agent ready on port 8000. Listening for messages...")


# 4. Agent Handler (Tracks Daemon CPU, RAM, and end-to-end response time)
@agent.on_message(model=Greeting)
@monitor.track(agentname="receiver")
@traceable(name="handle_message_uk", run_type="tool")
async def handle_message(ctx: Context, sender: str, msg: Greeting):
    print(f"\n[Received Prompt from {sender[:16]}...]: {msg.text}")

    try:
        # Run Gemini in thread to avoid blocking the asyncio event loop
        ai_reply = await asyncio.to_thread(call_gemini, msg.text)
    except Exception as e:
        ai_reply = f"Error generating response: {e}"

    print(f"[Gemini Reply Generated]: {ai_reply[:80]}...")

    # Send the AI response back to the sender agent
    print(f"[Sending Reply to {sender[:16]}...]")
    await ctx.send(
        sender,
        Greeting(text=ai_reply)
    )
    print("[Reply Sent Successfully]")


if __name__ == "__main__":
    agent.run()