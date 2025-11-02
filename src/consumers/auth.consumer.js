import redis from "../utils/redis.util.js";
import { connectRabbit } from "../utils/rabbit.util.js";

export async function consumeTokenInvalidation() {
  try {
    const channel = await connectRabbit();
    const exchange = "auth";

    await channel.assertExchange(exchange, "fanout", { durable: false });
    const { queue } = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(queue, exchange, "");

    channel.consume(
      queue,
      async (msg) => {
        if (!msg?.content) return;
        const { message } = JSON.parse(msg.content.toString());
        const token = message.replace(/^Bearer\s+/i, "").trim();

        await redis.del(`auth:${token}`);
        console.log(`Token invalidado: ${token}`);
      },
      { noAck: true }
    );
  } catch (err) {
    console.error("Error en suscriptor de auth:", err.message);
  }
}