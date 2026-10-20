import asyncio
import os
import sys
from typing import Optional
from dotenv import load_dotenv

# Ensure an active event loop exists for uagents on Python 3.12+
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())


# 1. Load Environment & SDK
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

SDK_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "app-sdk", "src"))
if SDK_PATH not in sys.path:
    sys.path.insert(0, SDK_PATH)

from uagents import Agent, Context, Model
from uagents.resolver import RulesBasedResolver
from asi_telemetry import ASI_Telemetry
from google import genai


# 2. Inter-Agent Message Protocol
class Greeting(Model):
    text: str
    trace_context: Optional[dict] = None


# 3. Agent Configuration
SENDER_ADDRESS = "agent1qtj4m78hdr2dmldtssn7kw7gt0e3ycledny3cadpmdau9dmnv9a4yzjxcx0"
local_resolver = RulesBasedResolver({
    SENDER_ADDRESS: "http://127.0.0.1:8001/submit"
})

agent = Agent(
    name="assistant",
    seed="assistant_seed",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
    resolve=local_resolver,
)

# 4. Telemetry Setup
# Single initialization with credentials & agent identity:
observe = ASI_Telemetry(
    api_key="asi_live_5e22278098f49a31aad59f6e074d6a94",
    agent_name="test_agent",
    agent_address=agent.address,
)

gemini_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
observe.instrument_gemini(gemini_client)


# 5. Tracked LLM Call
@observe.traceable(name="gemini_generate", run_type="llm", metadata={"model": "gemini-3.5-flash"})
def call_gemini(prompt: str) -> str:
    """Generates AI response using Gemini with automatic span tracking."""
    response = gemini_client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
    )

    print(response)
    return response.text.strip() if response and response.text else "No response generated."


# 6. Event Listeners
@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Assistant Agent Online | Address: {agent.address}")
    ctx.logger.info("Listening on port 8000...")


# 7. Tracked Message Handler (Receives multi-agent message and continues trace)
@agent.on_message(model=Greeting)
@observe.tool_monitoring("handle_message")
@observe.traceable(name="handle_message", run_type="tool")
async def handle_message(ctx: Context, sender: str, msg: Greeting):
    print(f"\n[Received from {sender[:16]}...]: {msg.text}")

    # Run Gemini call (automatically nested as a child span of handle_message)
    try:
        ai_reply = await asyncio.to_thread(call_gemini, msg.text)
    except Exception as e:
        ai_reply = f"Error from Gemini: {e}"
    print(f"[Generated Reply]: {ai_reply[:60]}...")

    # Reply back to sender, attaching active trace context
    await ctx.send(
        sender,
        Greeting(text=ai_reply, trace_context=observe.create_trace_context())
    )
    print("[Reply Dispatched]")


if __name__ == "__main__":
    agent.run()