import asyncio
from uagents import Agent, Context, Model
<<<<<<< HEAD
from uagents.resolver import RulesBasedResolver
from observ import AgentMonitor

# Initialize telemetry monitor for the sender agent
monitor = AgentMonitor(agent_name="sender")
=======
>>>>>>> 8394fde (Updated code Login SignUp)

try:
    loop = asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
<<<<<<< HEAD

class Greeting(Model):
    text: str

RECEIVER_ADDRESS = "agent1qfzll7xq6t8d9rx5n3cnql32me650q2sakexpc979u0luhn702jh2af5mds"

# Local resolver to immediately direct messages to assistant on port 8000
local_resolver = RulesBasedResolver({
    RECEIVER_ADDRESS: "http://127.0.0.1:8000/submit"
})

=======
    
class Greeting(Model):
    text: str

>>>>>>> 8394fde (Updated code Login SignUp)
sender = Agent(
    name="sender",
    seed="sender_seed",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
<<<<<<< HEAD
    resolve=local_resolver
)

@monitor.track(agentname="sender")
async def send_greeting(ctx: Context, text: str):
    """Tracked dispatch of messages to the receiver agent."""
    print(f"\n[Sending to Assistant]: {text}")
    await ctx.send(RECEIVER_ADDRESS, Greeting(text=text))
    print("[Dispatched]: Awaiting response from Gemini...")

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
@monitor.track(agentname="sender")
async def handle_reply(ctx: Context, sender_address: str, msg: Greeting):
    """Tracked handling of replies coming back to sender."""
    print(f"\n==========================================")
    print(f"[Received Gemini Reply from Assistant]:")
    print(msg.text)
    print(f"==========================================\n")

if __name__ == "__main__":
    sender.run()
=======
)

RECEIVER_ADDRESS = "agent1qfzll7xq6t8d9rx5n3cnql32me650q2sakexpc979u0luhn702jh2af5mds"

@sender.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Sending greeting to: {RECEIVER_ADDRESS}")
    while True:
        # Runs input() in a separate thread so the main asyncio loop stays alive for replies
        user_text = await asyncio.to_thread(input, "Enter your message: ")
        if not user_text.strip():
            continue
        await ctx.send(RECEIVER_ADDRESS, Greeting(text=user_text))
    print("Message Sent")

@sender.on_message(model=Greeting)
async def handle_reply(ctx: Context, sender_address: str, msg: Greeting):
    print(f"Received reply from {sender_address}: {msg.text}")

sender.run()
>>>>>>> 8394fde (Updated code Login SignUp)
