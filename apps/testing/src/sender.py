import asyncio
from uagents import Agent, Context, Model

try:
    loop = asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
class Greeting(Model):
    text: str

sender = Agent(
    name="sender",
    seed="sender_seed",
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
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