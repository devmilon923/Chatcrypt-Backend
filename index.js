const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const messageDB = [];
app.get("/", (req, res) => {
  res.send("Hello");
});
io.on("connection", (socket) => {
  socket.on("joinRoom", (info) => {
    socket.join(info.room);
    io.to(info.room).emit("sendResponseEvent", messageDB);
  });
  socket.on("messageEvent", (payload) => {
    messageDB.unshift(payload);
    io.to(payload.room).emit("sendResponseEvent", messageDB);
  });
});

server.listen(4000, () => console.log("Server running on port 4000"));
