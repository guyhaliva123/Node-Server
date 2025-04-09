// server.ts
import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

let currentSongData: any = null; // Global variable for the current song

async function startServer() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Adjust this for production
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // When a client connects, send the current song (if any)
    socket.on("getCurrentSong", () => {
      if (currentSongData) {
        socket.emit("songSelected", currentSongData);
      }
    });

    // Handle song selection
    socket.on("songSelected", (data) => {
      console.log(`Song selected: ${data.title} by ${data.artist}`);
      currentSongData = data; // Save the song globally
      io.emit("songSelected", data); // Broadcast to all clients
    });

    // Handle scroll syncing
    socket.on("syncScroll", (scrollTop: number) => {
      io.emit("scrollTo", scrollTop);
    });

    // Handle rehearsal quit
    socket.on("quitRehearsal", () => {
      console.log("Rehearsal ended");
      currentSongData = null; // Reset the current song
      io.emit("rehearsalEnded"); // Notify all connected clients
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(port, () => {
    console.log(`> Server ready on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
