import amqp from "amqplib";
import { rabbitUrl } from "../config/app.config.js";

let connection = null;
let channel = null;

export async function connectRabbit() {
  try {
    if (channel) return channel;

    if (!connection) {
      connection = await amqp.connect(rabbitUrl);
      console.log("RabbitMQ conectado...");
      connection.on("close", () => {
        console.warn("Conexión Rabbit cerrada, reintentando...");
        connection = null;
        channel = null;
      });
    }

    channel = await connection.createChannel();
    return channel;
  } catch (error) {
    console.error("Error al conectar a RabbitMQ:", error.message);
    throw error;
  }
}

export async function publishEvent(exchange, message) {
  console.log("Evento a Stats:", exchange, message);

  const ch = await connectRabbit();
  await ch.assertExchange(exchange, "fanout", { durable: true });
  ch.publish(exchange, "", Buffer.from(JSON.stringify(message)));
}