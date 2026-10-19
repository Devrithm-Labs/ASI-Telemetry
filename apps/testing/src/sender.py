from traceback import print_tb
import asyncio
import os
import sys

# Ensure an active event loop exists for uagents on Python 3.12+
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())


# Import SDK directly from local app-sdk folder
SDK_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "app-sdk", "src"))
if SDK_PATH not in sys.path:
    sys.path.insert(0, SDK_PATH)

from typing import Optional
from uagents import Agent, Context, Model
from uagents.resolver import RulesBasedResolver
from asi_telemetry import MetricsTracker, traceable, create_trace_context


class Greeting(Model):
    text: str
    trace_context: Optional[dict] = None

RECEIVER_ADDRESS = "agent1qfzll7xq6t8d9rx5n3cnql32me650q2sakexpc979u0luhn702jh2af5mds"

# Local resolver to immediately direct messages to assistant on port 8000
local_resolver = RulesBasedResolver({
    RECEIVER_ADDRESS: "http://127.0.0.1:8000/submit"
})

sender = Agent(
    name="sender",
    seed="sender_seed",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
    resolve=local_resolver
)

# Initialize telemetry monitor for the sender agent
monitor = MetricsTracker(agent_name="sender", agent_address=sender.address)

@monitor.track("send_greeting")
@traceable(name="send_greeting", run_type="tool")
async def send_greeting(ctx: Context, text: str):
    """Tracked dispatch of messages to the receiver agent with trace propagation."""
    print(f"\n[Sending to Assistant]: {text}")
    await ctx.send(RECEIVER_ADDRESS, Greeting(text=text, trace_context=create_trace_context()))


@sender.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Sender Agent Address: {sender.address}")
    ctx.logger.info(f"Connected to Assistant at: {RECEIVER_ADDRESS}")

    async def console_listener():
        # Allow agent server loop to completely settle
        await asyncio.sleep(0.5)
        while True:
            try:
                user_text = await asyncio.to_thread(input, "\nEnter your message: ")
                if not user_text.strip():
                    continue
                await send_greeting(ctx, user_text.strip())
            except (EOFError, KeyboardInterrupt):
                break
            except Exception as e:
                print(f"[Input error]: {e}")
                await asyncio.sleep(1)

    asyncio.create_task(console_listener())

@sender.on_message(model=Greeting)
@monitor.track("handle_reply")
@traceable(name="handle_reply", run_type="tool")
async def handle_reply(ctx: Context, sender_address: str, msg: Greeting):
    print(f"[Received Gemini Reply from Assistant]:")
    print(msg.text)
 

if __name__ == "__main__":
    sender.run()