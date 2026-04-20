import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

//Start Server
app.listen(process.env.PORT || 3000, async () => {
  console.log(`Server started at port ${process.env.PORT || 3000}...`);

  
});
