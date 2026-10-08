import asyncio
from uagents import Agent, Context, Model
from uagents.resolver import RulesBasedResolver
from observ import AgentMonitor

monitor = AgentMonitor()

try:
    loop = asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
class Greeting(Model):
    text: str

local_resolver = RulesBasedResolver({
    "agent1qtj4m78hdr2dmldtssn7kw7gt0e3ycledny3cadpmdau9dmnv9a4yzjxcx0": "http://127.0.0.1:8001/submit"
})
agent = Agent(
    name="assistant",
    seed="assistant_seed",
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
    resolve=local_resolver
)

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Agent Address: {agent.address}")
    ctx.logger.info("waiting for message")

@agent.on_message(model=Greeting)
@monitor.track()
async def handle_message(ctx: Context, sender: str, msg: Greeting):
    print(f"Received: {msg.text}")

    await ctx.send(
        sender,
        Greeting(text="Hello back!")
    )

agent.run()