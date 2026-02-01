import express from "express";
import { db } from "./db/db.js";
import { matcheRoutes } from "./routes/matches.js";

const app = express();
const port = 8000;

app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/matches", matcheRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
