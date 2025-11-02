import { deleteByArticleId } from "../services/questions.service.js";
import { connectRabbit } from "../utils/rabbit.util.js";

export async function consumeArticleDeleted() {
  try {
    const channel = await connectRabbit();
    const exchange = "article_deleted";

    await channel.assertExchange(exchange, "fanout", { durable: true });

    const { queue } = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(queue, exchange, "");

    channel.consume(
      queue,
      async (msg) => {
        if (!msg?.content) return;
        const event = JSON.parse(msg.content.toString());
        console.log("Evento recibido de catalogo:", event);
        
        const articleId = event.articleId;
        await deleteByArticleId(articleId);
        
      },
      { noAck: true }
    );
  } catch (error) {
    console.error("Error al suscribirse a eventos del catálogo:", error.message);
  }
}