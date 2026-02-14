import dotenv from "dotenv"
dotenv.config()
import express from "express";
import cors from "cors";
import router from "./routes/routes";


const PORT = process.env.PORT || 5000;
const app = express();

app.use(express.json())
app.use(cors());
app.use("/api", router);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
